from flask import Blueprint, jsonify, request
from models import db, DailyStatistics, BehaviorData, Cattle, Pen, Farm, Camera
from sqlalchemy import func, and_, or_
from datetime import datetime, date, timedelta
import logging

statistics_bp = Blueprint('statistics', __name__)
logger = logging.getLogger(__name__)

@statistics_bp.route('/daily', methods=['GET'])
def get_daily_statistics():
    """获取日统计数据"""
    try:
        # 获取查询参数
        farm_id = request.args.get('farm_id', type=int)
        pen_id = request.args.get('pen_id', type=int)
        cattle_id = request.args.get('cattle_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # 构建查询
        query = DailyStatistics.query
        
        # 添加过滤条件
        if farm_id:
            query = query.join(Cattle).filter(Cattle.farm_id == farm_id)
        if pen_id:
            query = query.filter(DailyStatistics.pen_id == pen_id)
        if cattle_id:
            query = query.filter(DailyStatistics.cattle_id == cattle_id)
        
        # 日期范围过滤
        if start_date:
            # 支持多种日期格式
            try:
                # 尝试解析 ISO 8601 格式 (2025-10-10T08:44:21.246Z)
                if 'T' in start_date:
                    start_date_obj = datetime.fromisoformat(start_date.replace('Z', '+00:00')).date()
                else:
                    # 解析简单日期格式 (2025-10-10)
                    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(DailyStatistics.stat_date >= start_date_obj)
            except ValueError as e:
                logger.error(f'Invalid start_date format: {start_date}, error: {e}')
                return jsonify({
                    'success': False,
                    'message': f'开始日期格式错误: {start_date}'
                }), 400
        if end_date:
            # 支持多种日期格式
            try:
                # 尝试解析 ISO 8601 格式 (2025-10-10T08:44:21.246Z)
                if 'T' in end_date:
                    end_date_obj = datetime.fromisoformat(end_date.replace('Z', '+00:00')).date()
                else:
                    # 解析简单日期格式 (2025-10-10)
                    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(DailyStatistics.stat_date <= end_date_obj)
            except ValueError as e:
                logger.error(f'Invalid end_date format: {end_date}, error: {e}')
                return jsonify({
                    'success': False,
                    'message': f'结束日期格式错误: {end_date}'
                }), 400
        
        # 排序和分页
        query = query.order_by(DailyStatistics.stat_date.desc())
        statistics = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # 先将分页结果转为字典列表
        items = list(statistics.items)
        items_dicts = [stat.to_dict() for stat in items]

        # 为当前页的每条记录计算“是否发情”标记
        # 构建需要查询的牛只ID集合与日期集合（仅当前页）
        cattle_ids = list({stat.cattle_id for stat in items})
        dates_set = {stat.stat_date for stat in items}

        estrus_set = set()
        if cattle_ids and dates_set:
            # 查询这些牛只在这些日期是否有“发情”行为记录
            estrus_query = db.session.query(
                BehaviorData.cattle_id,
                BehaviorData.pen_id,
                func.date(BehaviorData.start_time).label('stat_date')
            ).filter(BehaviorData.behavior_type == 'estrus')

            # 同步 farm 过滤（如有）
            if farm_id:
                estrus_query = estrus_query.join(Cattle, BehaviorData.cattle_id == Cattle.id).filter(Cattle.farm_id == farm_id)

            estrus_query = estrus_query.filter(BehaviorData.cattle_id.in_(cattle_ids))
            estrus_query = estrus_query.filter(func.date(BehaviorData.start_time).in_(list(dates_set)))

            # 若前端按 pen_id 过滤，则这里也限制栏位（避免跨栏位误判）
            if pen_id:
                estrus_query = estrus_query.filter(BehaviorData.pen_id == pen_id)

            results = estrus_query.all()
            # 使用 (cattle_id, pen_id, stat_date) 三元组进行匹配
            estrus_set = {(cid, pid, d) for (cid, pid, d) in results}

        # 合并“是否发情”字段到返回数据
        for stat, item in zip(items, items_dicts):
            is_estrus = (stat.cattle_id, stat.pen_id, stat.stat_date) in estrus_set
            item['is_estrus'] = bool(is_estrus)

        return jsonify({
            'success': True,
            'data': {
                'statistics': items_dicts,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': statistics.total,
                    'pages': statistics.pages,
                    'has_next': statistics.has_next,
                    'has_prev': statistics.has_prev
                }
            }
        })
        
    except Exception as e:
        logger.error(f'Error getting daily statistics: {str(e)}')
        return jsonify({
            'success': False,
            'message': '获取日统计数据失败',
            'error': str(e)
        }), 500

@statistics_bp.route('/behavior', methods=['GET'])
def get_behavior_data():
    """获取行为数据"""
    try:
        # 获取查询参数
        farm_id = request.args.get('farm_id', type=int)
        pen_id = request.args.get('pen_id', type=int)
        cattle_id = request.args.get('cattle_id', type=int)
        behavior_type = request.args.get('behavior_type')
        start_time = request.args.get('start_time')
        end_time = request.args.get('end_time')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        # 构建查询
        query = BehaviorData.query
        
        # 添加过滤条件
        if farm_id:
            query = query.join(Cattle).filter(Cattle.farm_id == farm_id)
        if pen_id:
            query = query.filter(BehaviorData.pen_id == pen_id)
        if cattle_id:
            query = query.filter(BehaviorData.cattle_id == cattle_id)
        if behavior_type:
            query = query.filter(BehaviorData.behavior_type == behavior_type)
        
        # 时间范围过滤
        if start_time:
            try:
                # 尝试解析 ISO 8601 格式
                if 'T' in start_time:
                    start_time_obj = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                else:
                    # 解析标准格式
                    start_time_obj = datetime.strptime(start_time, '%Y-%m-%d %H:%M:%S')
                query = query.filter(BehaviorData.start_time >= start_time_obj)
            except ValueError as e:
                logger.error(f'Invalid start_time format: {start_time}, error: {e}')
                return jsonify({
                    'success': False,
                    'message': f'开始时间格式错误: {start_time}'
                }), 400
        if end_time:
            try:
                # 尝试解析 ISO 8601 格式
                if 'T' in end_time:
                    end_time_obj = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                else:
                    # 解析标准格式
                    end_time_obj = datetime.strptime(end_time, '%Y-%m-%d %H:%M:%S')
                query = query.filter(BehaviorData.start_time <= end_time_obj)
            except ValueError as e:
                logger.error(f'Invalid end_time format: {end_time}, error: {e}')
                return jsonify({
                    'success': False,
                    'message': f'结束时间格式错误: {end_time}'
                }), 400
        
        # 排序和分页
        query = query.order_by(BehaviorData.start_time.desc())
        behavior_data = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'data': {
                'behavior_data': [data.to_dict() for data in behavior_data.items],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': behavior_data.total,
                    'pages': behavior_data.pages,
                    'has_next': behavior_data.has_next,
                    'has_prev': behavior_data.has_prev
                }
            }
        })
        
    except Exception as e:
        logger.error(f'Error getting behavior data: {str(e)}')
        return jsonify({
            'success': False,
            'message': '获取行为数据失败',
            'error': str(e)
        }), 500

@statistics_bp.route('/summary', methods=['GET'])
def get_statistics_summary():
    """获取统计摘要"""
    try:
        farm_id = request.args.get('farm_id', type=int)
        pen_id = request.args.get('pen_id', type=int)
        date_str = request.args.get('date', date.today().isoformat())
        
        # 支持多种日期格式
        try:
            # 尝试解析 ISO 8601 格式 (2025-10-10T08:44:21.246Z)
            if 'T' in date_str:
                target_date = datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
            else:
                # 解析简单日期格式 (2025-10-10)
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError as e:
            logger.error(f'Invalid date format: {date_str}, error: {e}')
            return jsonify({
                'success': False,
                'message': f'日期格式错误: {date_str}'
            }), 400
        
        # 构建基础查询
        query = DailyStatistics.query.filter(DailyStatistics.stat_date == target_date)
        
        if farm_id:
            query = query.join(Cattle).filter(Cattle.farm_id == farm_id)
        if pen_id:
            query = query.filter(DailyStatistics.pen_id == pen_id)
        
        # 获取统计数据
        stats = query.all()
        
        if not stats:
            return jsonify({
                'success': True,
                'data': {
                    'date': date_str,
                    'total_cattle': 0,
                    'averages': {
                        'eating_time': 0,
                        'standing_time': 0,
                        'lying_time': 0,
                        'walking_time': 0,
                        'drinking_time': 0,
                        'total_active_time': 0
                    },
                    'totals': {
                        'eating_time': 0,
                        'standing_time': 0,
                        'lying_time': 0,
                        'walking_time': 0,
                        'drinking_time': 0,
                        'total_active_time': 0
                    }
                }
            })
        
        total_cattle = len(stats)
        
        # 计算平均值和总计
        totals = {
            'eating_time': sum(s.eating_time for s in stats),
            'standing_time': sum(s.standing_time for s in stats),
            'lying_time': sum(s.lying_time for s in stats),
            'walking_time': sum(s.walking_time for s in stats),
            'drinking_time': sum(s.drinking_time for s in stats),
            'total_active_time': sum(s.total_active_time for s in stats)
        }
        
        averages = {
            key: round(value / total_cattle, 2) if total_cattle > 0 else 0
            for key, value in totals.items()
        }
        
        # 计算发情牛只数量（按天去重）
        estrus_query = BehaviorData.query.filter(
            func.date(BehaviorData.start_time) == target_date,
            BehaviorData.behavior_type == 'estrus'
        )
        if farm_id:
            estrus_query = estrus_query.join(Cattle).filter(Cattle.farm_id == farm_id)
        if pen_id:
            estrus_query = estrus_query.filter(BehaviorData.pen_id == pen_id)

        # 统计当日存在发情行为记录的牛只数量（去重）
        estrus_count = estrus_query.distinct(BehaviorData.cattle_id).count()
        estrus_ratio = round((estrus_count / total_cattle * 100), 2) if total_cattle > 0 else 0

        return jsonify({
            'success': True,
            'data': {
                'date': date_str,
                'total_cattle': total_cattle,
                'averages': averages,
                'totals': totals,
                'estrus': {
                    'count': estrus_count,
                    'ratio': estrus_ratio
                }
            }
        })
        
    except Exception as e:
        logger.error(f'Error getting statistics summary: {str(e)}')
        return jsonify({
            'success': False,
            'message': '获取统计摘要失败',
            'error': str(e)
        }), 500

@statistics_bp.route('/trends', methods=['GET'])
def get_behavior_trends():
    """获取行为趋势数据"""
    try:
        farm_id = request.args.get('farm_id', type=int)
        pen_id = request.args.get('pen_id', type=int)
        cattle_id = request.args.get('cattle_id', type=int)
        days = request.args.get('days', 7, type=int)  # 默认7天
        
        # 计算日期范围
        end_date = date.today()
        start_date = end_date - timedelta(days=days-1)
        
        # 构建查询
        query = DailyStatistics.query.filter(
            and_(
                DailyStatistics.stat_date >= start_date,
                DailyStatistics.stat_date <= end_date
            )
        )
        
        if farm_id:
            query = query.join(Cattle).filter(Cattle.farm_id == farm_id)
        if pen_id:
            query = query.filter(DailyStatistics.pen_id == pen_id)
        if cattle_id:
            query = query.filter(DailyStatistics.cattle_id == cattle_id)
        
        # 按日期分组统计
        results = query.order_by(DailyStatistics.stat_date).all()
        
        # 组织数据
        trends = {}
        for stat in results:
            date_str = stat.stat_date.isoformat()
            if date_str not in trends:
                trends[date_str] = {
                    'date': date_str,
                    'cattle_count': 0,
                    'eating_time': 0,
                    'standing_time': 0,
                    'lying_time': 0,
                    'walking_time': 0,
                    'drinking_time': 0,
                    'total_active_time': 0
                }
            
            trends[date_str]['cattle_count'] += 1
            trends[date_str]['eating_time'] += stat.eating_time
            trends[date_str]['standing_time'] += stat.standing_time
            trends[date_str]['lying_time'] += stat.lying_time
            trends[date_str]['walking_time'] += stat.walking_time
            trends[date_str]['drinking_time'] += stat.drinking_time
            trends[date_str]['total_active_time'] += stat.total_active_time
        
        # 计算平均值
        trend_data = []
        for date_str in sorted(trends.keys()):
            data = trends[date_str]
            count = data['cattle_count']
            if count > 0:
                trend_data.append({
                    'date': date_str,
                    'cattle_count': count,
                    'avg_eating_time': round(data['eating_time'] / count, 2),
                    'avg_standing_time': round(data['standing_time'] / count, 2),
                    'avg_lying_time': round(data['lying_time'] / count, 2),
                    'avg_walking_time': round(data['walking_time'] / count, 2),
                    'avg_drinking_time': round(data['drinking_time'] / count, 2),
                    'avg_total_active_time': round(data['total_active_time'] / count, 2)
                })
        
        return jsonify({
            'success': True,
            'data': {
                'trends': trend_data,
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'days': days
                }
            }
        })
        
    except Exception as e:
        logger.error(f'Error getting behavior trends: {str(e)}')
        return jsonify({
            'success': False,
            'message': '获取行为趋势失败',
            'error': str(e)
        }), 500

@statistics_bp.route('/comparison', methods=['GET'])
def get_behavior_comparison():
    """获取行为对比数据"""
    try:
        farm_id = request.args.get('farm_id', type=int)
        pen_ids = request.args.getlist('pen_ids', type=int)
        date_str = request.args.get('date', date.today().isoformat())
        
        # 支持多种日期格式
        try:
            # 尝试解析 ISO 8601 格式 (2025-10-10T08:44:21.246Z)
            if 'T' in date_str:
                target_date = datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
            else:
                # 解析简单日期格式 (2025-10-10)
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError as e:
            logger.error(f'Invalid date format: {date_str}, error: {e}')
            return jsonify({
                'success': False,
                'message': f'日期格式错误: {date_str}'
            }), 400
        
        if not pen_ids:
            return jsonify({
                'success': False,
                'message': '请提供要对比的栏位ID'
            }), 400
        
        comparison_data = []
        
        for pen_id in pen_ids:
            # 获取栏位信息
            pen = Pen.query.get(pen_id)
            if not pen:
                continue
            
            if farm_id and pen.farm_id != farm_id:
                continue
            
            # 获取该栏位的统计数据
            stats = DailyStatistics.query.filter(
                and_(
                    DailyStatistics.pen_id == pen_id,
                    DailyStatistics.stat_date == target_date
                )
            ).all()

            # 统计该栏位当天存在“发情”行为记录的牛只数量（去重）
            estrus_query = BehaviorData.query.filter(
                and_(
                    func.date(BehaviorData.start_time) == target_date,
                    BehaviorData.pen_id == pen_id,
                    BehaviorData.behavior_type == 'estrus'
                )
            )
            if farm_id:
                estrus_query = estrus_query.join(Cattle).filter(Cattle.farm_id == farm_id)
            estrus_count = estrus_query.distinct(BehaviorData.cattle_id).count()

            if stats:
                total_cattle = len(stats)
                pen_data = {
                    'pen_id': pen_id,
                    'pen_number': pen.pen_number,
                    'farm_name': pen.farm.name,
                    'cattle_count': total_cattle,
                    'avg_eating_time': round(sum(s.eating_time for s in stats) / total_cattle, 2),
                    'avg_standing_time': round(sum(s.standing_time for s in stats) / total_cattle, 2),
                    'avg_lying_time': round(sum(s.lying_time for s in stats) / total_cattle, 2),
                    'avg_walking_time': round(sum(s.walking_time for s in stats) / total_cattle, 2),
                    'avg_drinking_time': round(sum(s.drinking_time for s in stats) / total_cattle, 2),
                    'avg_total_active_time': round(sum(s.total_active_time for s in stats) / total_cattle, 2),
                    'estrus_count': estrus_count,
                    'estrus_ratio': round((estrus_count / total_cattle * 100), 2) if total_cattle > 0 else 0
                }
            else:
                pen_data = {
                    'pen_id': pen_id,
                    'pen_number': pen.pen_number,
                    'farm_name': pen.farm.name,
                    'cattle_count': 0,
                    'avg_eating_time': 0,
                    'avg_standing_time': 0,
                    'avg_lying_time': 0,
                    'avg_walking_time': 0,
                    'avg_drinking_time': 0,
                    'avg_total_active_time': 0,
                    'estrus_count': 0,
                    'estrus_ratio': 0
                }
            
            comparison_data.append(pen_data)
        
        return jsonify({
            'success': True,
            'data': {
                'comparison': comparison_data,
                'date': date_str,
                'total_pens': len(comparison_data)
            }
        })
        
    except Exception as e:
        logger.error(f'Error getting behavior comparison: {str(e)}')
        return jsonify({
            'success': False,
            'message': '获取行为对比数据失败',
            'error': str(e)
        }), 500



@statistics_bp.route('/cattle/<int:cattle_id>/history', methods=['GET'])
def get_cattle_history(cattle_id):
    """获取单头牛的历史统计数据"""
    try:
        cattle = Cattle.query.get_or_404(cattle_id)
        
        days = request.args.get('days', 30, type=int)
        end_date = date.today()
        start_date = end_date - timedelta(days=days-1)
        
        # 获取历史统计数据
        stats = DailyStatistics.query.filter(
            and_(
                DailyStatistics.cattle_id == cattle_id,
                DailyStatistics.stat_date >= start_date,
                DailyStatistics.stat_date <= end_date
            )
        ).order_by(DailyStatistics.stat_date).all()
        
        # 获取行为数据
        behavior_data = BehaviorData.query.filter(
            and_(
                BehaviorData.cattle_id == cattle_id,
                BehaviorData.start_time >= datetime.combine(start_date, datetime.min.time()),
                BehaviorData.start_time <= datetime.combine(end_date, datetime.max.time())
            )
        ).order_by(BehaviorData.start_time.desc()).limit(100).all()
        
        return jsonify({
            'success': True,
            'data': {
                'cattle': cattle.to_dict(),
                'daily_statistics': [stat.to_dict() for stat in stats],
                'recent_behaviors': [behavior.to_dict() for behavior in behavior_data],
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'days': days
                }
            }
        })
        
    except Exception as e:
        logger.error(f'Error getting cattle history {cattle_id}: {str(e)}')
        return jsonify({
            'success': False,
            'message': '获取牛只历史数据失败',
            'error': str(e)
        }), 500

@statistics_bp.route('/export', methods=['GET'])
def export_statistics():
    """导出统计数据"""
    try:
        # 获取查询参数
        farm_id = request.args.get('farm_id', type=int)
        pen_id = request.args.get('pen_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        format_type = request.args.get('format', 'json')  # json, csv
        
        # 构建查询
        query = DailyStatistics.query
        
        if farm_id:
            query = query.join(Cattle).filter(Cattle.farm_id == farm_id)
        if pen_id:
            query = query.filter(DailyStatistics.pen_id == pen_id)
        
        # 日期范围
        if start_date:
            try:
                # 尝试解析 ISO 8601 格式 (2025-10-10T08:44:21.246Z)
                if 'T' in start_date:
                    start_date_obj = datetime.fromisoformat(start_date.replace('Z', '+00:00')).date()
                else:
                    # 解析简单日期格式 (2025-10-10)
                    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(DailyStatistics.stat_date >= start_date_obj)
            except ValueError as e:
                logger.error(f'Invalid start_date format: {start_date}, error: {e}')
                return jsonify({
                    'success': False,
                    'message': f'开始日期格式错误: {start_date}'
                }), 400
        if end_date:
            try:
                # 尝试解析 ISO 8601 格式 (2025-10-10T08:44:21.246Z)
                if 'T' in end_date:
                    end_date_obj = datetime.fromisoformat(end_date.replace('Z', '+00:00')).date()
                else:
                    # 解析简单日期格式 (2025-10-10)
                    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(DailyStatistics.stat_date <= end_date_obj)
            except ValueError as e:
                logger.error(f'Invalid end_date format: {end_date}, error: {e}')
                return jsonify({
                    'success': False,
                    'message': f'结束日期格式错误: {end_date}'
                }), 400
        
        # 获取数据
        statistics = query.order_by(DailyStatistics.stat_date.desc()).all()
        
        if format_type == 'json':
            return jsonify({
                'success': True,
                'data': {
                    'statistics': [stat.to_dict() for stat in statistics],
                    'total': len(statistics),
                    'export_time': datetime.utcnow().isoformat()
                }
            })
        
        # 其他格式可以在这里扩展
        return jsonify({
            'success': False,
            'message': f'不支持的导出格式: {format_type}'
        }), 400
        
    except Exception as e:
        logger.error(f'Error exporting statistics: {str(e)}')
        return jsonify({
            'success': False,
            'message': '导出统计数据失败',
            'error': str(e)
        }), 500
