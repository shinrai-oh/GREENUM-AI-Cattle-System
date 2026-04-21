from flask import Blueprint, jsonify, request
from models import db, Farm, Pen, Cattle, Camera
from datetime import datetime
import logging

farms_bp = Blueprint('farms', __name__)
logger = logging.getLogger(__name__)

@farms_bp.route('', methods=['GET'])
def get_farms():
    """获取养牛厂列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        name = request.args.get('name', '', type=str)
        
        # 调试信息
        logger.info(f"搜索参数 - name: {repr(name)}, page: {page}, per_page: {per_page}")
        
        # 构建查询
        query = Farm.query
        
        # 如果有名称搜索参数，添加过滤条件
        if name:
            logger.info(f"应用搜索过滤器: Farm.name.ilike('%{name}%')")
            query = query.filter(Farm.name.ilike(f'%{name}%'))
        
        farms = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # 为每个养牛厂添加统计信息
        farms_data = []
        for farm in farms.items:
            farm_dict = farm.to_dict()
            farm_dict['statistics'] = {
                'pens_count': Pen.query.filter_by(farm_id=farm.id).count(),
                'cattle_count': Cattle.query.filter_by(farm_id=farm.id).count(),
                'cameras_count': Camera.query.filter_by(farm_id=farm.id).count(),
                'active_cameras': Camera.query.filter_by(farm_id=farm.id, status='active').count()
            }
            farms_data.append(farm_dict)
        
        return jsonify({
            'success': True,
            'data': {
                'farms': farms_data,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': farms.total,
                    'pages': farms.pages,
                    'has_next': farms.has_next,
                    'has_prev': farms.has_prev
                }
            }
        })
        
    except Exception as e:
        logger.error(f'Error getting farms: {str(e)}')
        return jsonify({
            'success': False,
            'message': '获取养牛厂列表失败',
            'error': str(e)
        }), 500

@farms_bp.route('/<int:farm_id>', methods=['GET'])
def get_farm(farm_id):
    """获取单个养牛厂详细信息"""
    try:
        farm = Farm.query.get_or_404(farm_id)
        
        # 获取栏位信息
        pens = Pen.query.filter_by(farm_id=farm_id).all()
        
        # 获取摄像头信息
        cameras = Camera.query.filter_by(farm_id=farm_id).all()
        
        # 获取牛只信息
        cattle = Cattle.query.filter_by(farm_id=farm_id).all()
        
        farm_data = farm.to_dict()
        farm_data['pens'] = [pen.to_dict() for pen in pens]
        farm_data['cameras'] = [camera.to_dict() for camera in cameras]
        farm_data['cattle'] = [cow.to_dict() for cow in cattle]
        farm_data['statistics'] = {
            'pens_count': len(pens),
            'cattle_count': len(cattle),
            'cameras_count': len(cameras),
            'active_cameras': len([c for c in cameras if c.status == 'active']),
            'total_capacity': sum(pen.capacity for pen in pens),
            'current_occupancy': sum(pen.current_count for pen in pens)
        }
        
        return jsonify({
            'success': True,
            'data': farm_data
        })
        
    except Exception as e:
        logger.error(f'Error getting farm {farm_id}: {str(e)}')
        return jsonify({
            'success': False,
            'message': '获取养牛厂信息失败',
            'error': str(e)
        }), 500

@farms_bp.route('', methods=['POST'])
def create_farm():
    """创建新养牛厂"""
    try:
        data = request.get_json()
        
        # 验证必需字段
        if 'name' not in data:
            return jsonify({
                'success': False,
                'message': '养牛厂名称不能为空'
            }), 400
        
        # 检查名称是否已存在
        existing_farm = Farm.query.filter_by(name=data['name']).first()
        if existing_farm:
            return jsonify({
                'success': False,
                'message': '养牛厂名称已存在'
            }), 400
        
        # 创建养牛厂
        farm = Farm(
            name=data['name'],
            address=data.get('address'),
            contact_person=data.get('contact_person'),
            contact_phone=data.get('contact_phone')
        )
        
        db.session.add(farm)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '养牛厂创建成功',
            'data': farm.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error creating farm: {str(e)}')
        return jsonify({
            'success': False,
            'message': '创建养牛厂失败',
            'error': str(e)
        }), 500

@farms_bp.route('/<int:farm_id>', methods=['PUT'])
def update_farm(farm_id):
    """更新养牛厂信息"""
    try:
        farm = Farm.query.get_or_404(farm_id)
        data = request.get_json()
        
        # 检查名称是否与其他养牛厂冲突
        if 'name' in data and data['name'] != farm.name:
            existing_farm = Farm.query.filter_by(name=data['name']).first()
            if existing_farm:
                return jsonify({
                    'success': False,
                    'message': '养牛厂名称已存在'
                }), 400
        
        # 更新字段
        if 'name' in data:
            farm.name = data['name']
        if 'address' in data:
            farm.address = data['address']
        if 'contact_person' in data:
            farm.contact_person = data['contact_person']
        if 'contact_phone' in data:
            farm.contact_phone = data['contact_phone']
        
        farm.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '养牛厂更新成功',
            'data': farm.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error updating farm {farm_id}: {str(e)}')
        return jsonify({
            'success': False,
            'message': '更新养牛厂失败',
            'error': str(e)
        }), 500

@farms_bp.route('/<int:farm_id>', methods=['DELETE'])
def delete_farm(farm_id):
    """删除养牛厂"""
    try:
        farm = Farm.query.get_or_404(farm_id)
        
        # 检查是否有关联数据
        pens_count = Pen.query.filter_by(farm_id=farm_id).count()
        cattle_count = Cattle.query.filter_by(farm_id=farm_id).count()
        cameras_count = Camera.query.filter_by(farm_id=farm_id).count()
        
        if pens_count > 0 or cattle_count > 0 or cameras_count > 0:
            return jsonify({
                'success': False,
                'message': f'无法删除养牛厂，存在关联数据：{pens_count}个栏位，{cattle_count}头牛，{cameras_count}个摄像头'
            }), 400
        
        db.session.delete(farm)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '养牛厂删除成功'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error deleting farm {farm_id}: {str(e)}')
        return jsonify({
            'success': False,
            'message': '删除养牛厂失败',
            'error': str(e)
        }), 500

@farms_bp.route('/<int:farm_id>/pens', methods=['GET'])
def get_farm_pens(farm_id):
    """获取养牛厂的栏位列表"""
    try:
        farm = Farm.query.get_or_404(farm_id)
        pens = Pen.query.filter_by(farm_id=farm_id).all()
        
        return jsonify({
            'success': True,
            'data': {
                'farm': farm.to_dict(),
                'pens': [pen.to_dict() for pen in pens],
                'total': len(pens)
            }
        })
        
    except Exception as e:
        logger.error(f'Error getting farm pens {farm_id}: {str(e)}')
        return jsonify({
            'success': False,
            'message': '获取栏位列表失败',
            'error': str(e)
        }), 500

@farms_bp.route('/<int:farm_id>/pens', methods=['POST'])
def create_farm_pen(farm_id):
    """为养牛厂创建新栏位"""
    try:
        farm = Farm.query.get_or_404(farm_id)
        data = request.get_json()
        
        # 验证必需字段
        if 'pen_number' not in data:
            return jsonify({
                'success': False,
                'message': '栏位编号不能为空'
            }), 400
        
        # 检查栏位编号是否在该养牛厂内已存在
        existing_pen = Pen.query.filter_by(
            farm_id=farm_id, 
            pen_number=data['pen_number']
        ).first()
        if existing_pen:
            return jsonify({
                'success': False,
                'message': '栏位编号在该养牛厂内已存在'
            }), 400
        
        # 创建栏位
        pen = Pen(
            farm_id=farm_id,
            pen_number=data['pen_number'],
            capacity=data.get('capacity', 0),
            current_count=data.get('current_count', 0)
        )
        
        db.session.add(pen)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '栏位创建成功',
            'data': pen.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error creating pen for farm {farm_id}: {str(e)}')
        return jsonify({
            'success': False,
            'message': '创建栏位失败',
            'error': str(e)
        }), 500

@farms_bp.route('/<int:farm_id>/cattle', methods=['GET'])
def get_farm_cattle(farm_id):
    """获取养牛厂的牛只列表"""
    try:
        farm = Farm.query.get_or_404(farm_id)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        pen_id = request.args.get('pen_id', type=int)
        
        query = Cattle.query.filter_by(farm_id=farm_id)
        
        # 过滤条件
        if status:
            query = query.filter_by(status=status)
        if pen_id:
            query = query.filter_by(pen_id=pen_id)
        
        # 分页
        cattle = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'data': {
                'farm': farm.to_dict(),
                'cattle': [cow.to_dict() for cow in cattle.items],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': cattle.total,
                    'pages': cattle.pages,
                    'has_next': cattle.has_next,
                    'has_prev': cattle.has_prev
                }
            }
        })
        
    except Exception as e:
        logger.error(f'Error getting farm cattle {farm_id}: {str(e)}')
        return jsonify({
            'success': False,
            'message': '获取牛只列表失败',
            'error': str(e)
        }), 500

@farms_bp.route('/<int:farm_id>/cattle', methods=['POST'])
def create_farm_cattle(farm_id):
    """为养牛厂添加新牛只"""
    try:
        farm = Farm.query.get_or_404(farm_id)
        data = request.get_json()
        
        # 验证必需字段
        if 'ear_tag' not in data:
            return jsonify({
                'success': False,
                'message': '耳标号不能为空'
            }), 400
        
        # 检查耳标号是否已存在
        existing_cattle = Cattle.query.filter_by(ear_tag=data['ear_tag']).first()
        if existing_cattle:
            return jsonify({
                'success': False,
                'message': '耳标号已存在'
            }), 400
        
        # 验证栏位是否属于该养牛厂
        if 'pen_id' in data and data['pen_id']:
            pen = Pen.query.get(data['pen_id'])
            if not pen or pen.farm_id != farm_id:
                return jsonify({
                    'success': False,
                    'message': '指定的栏位不属于该养牛厂'
                }), 400
        
        # 处理出生日期
        birth_date = None
        if data.get('birth_date'):
            try:
                # 尝试解析 ISO 8601 格式 (2025-10-10T08:44:21.246Z)
                if 'T' in data['birth_date']:
                    birth_date = datetime.fromisoformat(data['birth_date'].replace('Z', '+00:00')).date()
                else:
                    # 解析简单日期格式 (2025-10-10)
                    birth_date = datetime.strptime(data['birth_date'], '%Y-%m-%d').date()
            except ValueError as e:
                logger.error(f'Invalid birth_date format: {data["birth_date"]}, error: {e}')
                return jsonify({
                    'success': False,
                    'message': f'出生日期格式错误: {data["birth_date"]}'
                }), 400

        # 创建牛只
        cattle = Cattle(
            ear_tag=data['ear_tag'],
            farm_id=farm_id,
            pen_id=data.get('pen_id'),
            breed=data.get('breed'),
            birth_date=birth_date,
            weight=data.get('weight'),
            gender=data.get('gender'),
            status=data.get('status', 'healthy')
        )
        
        db.session.add(cattle)
        
        # 更新栏位牛只数量
        if cattle.pen_id:
            pen = Pen.query.get(cattle.pen_id)
            if pen:
                pen.current_count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '牛只添加成功',
            'data': cattle.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error creating cattle for farm {farm_id}: {str(e)}')
        return jsonify({
            'success': False,
            'message': '添加牛只失败',
            'error': str(e)
        }), 500