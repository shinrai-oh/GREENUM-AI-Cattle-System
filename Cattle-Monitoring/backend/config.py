import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class Config:
    """基础配置类"""
    
    # 基本配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'cattle-monitoring-secret-key-2024'
    
    # 数据库配置
    DATABASE_URL = os.environ.get('DATABASE_URL') or \
        'mysql+pymysql://cattle_user:cattle_pass@localhost:3306/cattle_monitoring?charset=utf8mb4'
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_timeout': 30,
        'pool_size': 10,
        'max_overflow': 20,
        'echo': False,
        'connect_args': {
            'charset': 'utf8mb4',
            'use_unicode': True,
            'init_command': "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        }
    }
    
    # Flask配置
    JSON_AS_ASCII = False  # 支持中文JSON
    JSONIFY_PRETTYPRINT_REGULAR = True
    
    # CORS配置
    CORS_ORIGINS = ['http://localhost', 'http://localhost:80', 'http://localhost:8080']
    
    # 分页配置
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
    
    # 视频流配置
    RTSP_TIMEOUT = 30  # RTSP连接超时时间(秒)
    VIDEO_FRAME_RATE = 25  # 视频帧率
    VIDEO_QUALITY = 'medium'  # 视频质量: low, medium, high
    
    # 文件上传配置
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    UPLOAD_FOLDER = 'uploads'
    
    # 日志配置
    LOG_LEVEL = os.environ.get('LOG_LEVEL') or 'INFO'
    LOG_FILE = 'cattle_monitoring.log'
    
    # API配置
    API_VERSION = 'v1'
    API_PREFIX = f'/api/{API_VERSION}'
    
    @staticmethod
    def init_app(app):
        """初始化应用配置"""
        pass

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    TESTING = False
    
    # 开发环境特定配置
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or \
        'mysql+pymysql://cattle_user:cattle_pass@localhost:3306/cattle_monitoring?charset=utf8mb4'

class TestingConfig(Config):
    """测试环境配置"""
    TESTING = True
    DEBUG = True
    
    # 测试数据库
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL') or \
        'mysql+pymysql://cattle_user:cattle_pass@mysql:3306/cattle_monitoring_test?charset=utf8mb4'
    
    # 禁用CSRF保护
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    TESTING = False
    
    # 生产环境安全配置
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # 生产环境日志配置
        import logging
        from logging.handlers import RotatingFileHandler
        
        if not app.debug and not app.testing:
            if not os.path.exists('logs'):
                os.mkdir('logs')
            
            file_handler = RotatingFileHandler(
                'logs/cattle_monitoring.log',
                maxBytes=10240000,
                backupCount=10
            )
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
            ))
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)
            
            app.logger.setLevel(logging.INFO)
            app.logger.info('Cattle Monitoring System startup')

class DockerConfig(Config):
    """Docker环境配置"""
    DEBUG = False
    TESTING = False
    
    # Docker环境数据库连接
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'mysql+pymysql://cattle_user:cattle_pass@mysql:3306/cattle_monitoring'

# 配置字典
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'docker': DockerConfig,
    'default': DevelopmentConfig
}

# 获取当前配置
def get_config():
    """获取当前环境配置"""
    env = os.environ.get('FLASK_ENV') or 'development'
    return config.get(env, config['default'])