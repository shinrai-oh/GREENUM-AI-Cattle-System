from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import func

db = SQLAlchemy()

class Farm(db.Model):
    """养牛厂模型"""
    __tablename__ = 'farms'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, comment='养牛厂名称')
    address = db.Column(db.String(300), comment='地址')
    contact_person = db.Column(db.String(50), comment='联系人')
    contact_phone = db.Column(db.String(20), comment='联系电话')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    pens = db.relationship('Pen', backref='farm', lazy=True, cascade='all, delete-orphan')
    cameras = db.relationship('Camera', backref='farm', lazy=True, cascade='all, delete-orphan')
    cattle = db.relationship('Cattle', backref='farm', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'contact_person': self.contact_person,
            'contact_phone': self.contact_phone,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Pen(db.Model):
    """栏位模型"""
    __tablename__ = 'pens'
    
    id = db.Column(db.Integer, primary_key=True)
    farm_id = db.Column(db.Integer, db.ForeignKey('farms.id'), nullable=False)
    pen_number = db.Column(db.String(50), nullable=False, comment='栏位编号')
    capacity = db.Column(db.Integer, default=0, comment='容量')
    current_count = db.Column(db.Integer, default=0, comment='当前牛只数量')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    cameras = db.relationship('Camera', backref='pen', lazy=True)
    cattle = db.relationship('Cattle', backref='pen', lazy=True)
    behavior_data = db.relationship('BehaviorData', backref='pen', lazy=True, cascade='all, delete-orphan')
    daily_statistics = db.relationship('DailyStatistics', backref='pen', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'farm_id': self.farm_id,
            'pen_number': self.pen_number,
            'capacity': self.capacity,
            'current_count': self.current_count,
            'farm_name': self.farm.name if self.farm else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Camera(db.Model):
    """摄像头模型"""
    __tablename__ = 'cameras'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, comment='摄像头名称')
    rtsp_url = db.Column(db.String(500), nullable=False, comment='RTSP地址')
    location = db.Column(db.String(200), comment='安装位置')
    farm_id = db.Column(db.Integer, db.ForeignKey('farms.id'), nullable=False)
    pen_id = db.Column(db.Integer, db.ForeignKey('pens.id'), nullable=True)
    status = db.Column(db.Enum('active', 'inactive', 'maintenance', name='camera_status'), 
                      default='active', comment='状态')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    behavior_data = db.relationship('BehaviorData', backref='camera', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'rtsp_url': self.rtsp_url,
            'location': self.location,
            'farm_id': self.farm_id,
            'pen_id': self.pen_id,
            'status': self.status,
            'farm_name': self.farm.name if self.farm else None,
            'pen_number': self.pen.pen_number if self.pen else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Cattle(db.Model):
    """牛只模型"""
    __tablename__ = 'cattle'
    
    id = db.Column(db.Integer, primary_key=True)
    ear_tag = db.Column(db.String(50), unique=True, nullable=False, comment='耳标号')
    farm_id = db.Column(db.Integer, db.ForeignKey('farms.id'), nullable=False)
    pen_id = db.Column(db.Integer, db.ForeignKey('pens.id'), nullable=True)
    breed = db.Column(db.String(50), comment='品种')
    birth_date = db.Column(db.Date, comment='出生日期')
    weight = db.Column(db.Numeric(6, 2), comment='体重(kg)')
    gender = db.Column(db.Enum('male', 'female', name='cattle_gender'), comment='性别')
    status = db.Column(db.Enum('healthy', 'sick', 'quarantine', 'sold', name='cattle_status'), 
                      default='healthy', comment='状态')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    behavior_data = db.relationship('BehaviorData', backref='cattle', lazy=True, cascade='all, delete-orphan')
    daily_statistics = db.relationship('DailyStatistics', backref='cattle', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'ear_tag': self.ear_tag,
            'farm_id': self.farm_id,
            'pen_id': self.pen_id,
            'breed': self.breed,
            'birth_date': self.birth_date.isoformat() if self.birth_date else None,
            'weight': float(self.weight) if self.weight else None,
            'gender': self.gender,
            'status': self.status,
            'farm_name': self.farm.name if self.farm else None,
            'pen_number': self.pen.pen_number if self.pen else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class BehaviorData(db.Model):
    """行为数据模型"""
    __tablename__ = 'behavior_data'
    
    id = db.Column(db.Integer, primary_key=True)
    cattle_id = db.Column(db.Integer, db.ForeignKey('cattle.id'), nullable=False)
    pen_id = db.Column(db.Integer, db.ForeignKey('pens.id'), nullable=False)
    behavior_type = db.Column(db.Enum('eating', 'standing', 'lying', 'walking', 'drinking', 'estrus',
                                     name='behavior_type'), nullable=False, comment='行为类型')
    start_time = db.Column(db.DateTime, nullable=False, comment='开始时间')
    end_time = db.Column(db.DateTime, comment='结束时间')
    duration = db.Column(db.Integer, comment='持续时间(秒)')
    camera_id = db.Column(db.Integer, db.ForeignKey('cameras.id'), nullable=True, comment='检测摄像头')
    confidence = db.Column(db.Numeric(3, 2), comment='置信度')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'cattle_id': self.cattle_id,
            'pen_id': self.pen_id,
            'behavior_type': self.behavior_type,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration': self.duration,
            'camera_id': self.camera_id,
            'confidence': float(self.confidence) if self.confidence else None,
            'cattle_ear_tag': self.cattle.ear_tag if self.cattle else None,
            'pen_number': self.pen.pen_number if self.pen else None,
            'camera_name': self.camera.name if self.camera else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class DailyStatistics(db.Model):
    """日统计数据模型"""
    __tablename__ = 'daily_statistics'
    
    id = db.Column(db.Integer, primary_key=True)
    cattle_id = db.Column(db.Integer, db.ForeignKey('cattle.id'), nullable=False)
    pen_id = db.Column(db.Integer, db.ForeignKey('pens.id'), nullable=False)
    stat_date = db.Column(db.Date, nullable=False)
    eating_time = db.Column(db.Integer, default=0, comment='采食时间(分钟)')
    standing_time = db.Column(db.Integer, default=0, comment='站立时间(分钟)')
    lying_time = db.Column(db.Integer, default=0, comment='卧躺时间(分钟)')
    walking_time = db.Column(db.Integer, default=0, comment='行走时间(分钟)')
    drinking_time = db.Column(db.Integer, default=0, comment='饮水时间(分钟)')
    total_active_time = db.Column(db.Integer, default=0, comment='总活动时间(分钟)')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 唯一约束
    __table_args__ = (db.UniqueConstraint('cattle_id', 'stat_date', name='unique_cattle_date'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'cattle_id': self.cattle_id,
            'pen_id': self.pen_id,
            'stat_date': self.stat_date.isoformat() if self.stat_date else None,
            'eating_time': self.eating_time,
            'standing_time': self.standing_time,
            'lying_time': self.lying_time,
            'walking_time': self.walking_time,
            'drinking_time': self.drinking_time,
            'total_active_time': self.total_active_time,
            'cattle_ear_tag': self.cattle.ear_tag if self.cattle else None,
            'pen_number': self.pen.pen_number if self.pen else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
