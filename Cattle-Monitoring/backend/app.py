from flask import Flask, jsonify
from flask_cors import CORS
from config import get_config
from models import db
import os
import logging
import time
from datetime import datetime
from sqlalchemy import text

def create_app(config_name=None):
    """应用工厂函数"""
    app = Flask(__name__)
    
    # 加载配置
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    config_class = get_config()
    app.config.from_object(config_class)
    
    # 配置JSON编码器以支持中文
    app.config['JSON_AS_ASCII'] = False

    # 初始化扩展
    db.init_app(app)
    CORS(app, origins=app.config['CORS_ORIGINS'])

    # 统一设置 JSON 响应的 charset，避免客户端误判编码
    @app.after_request
    def set_json_charset(response):
        content_type = response.headers.get('Content-Type', '')
        if content_type.startswith('application/json') and 'charset=' not in content_type:
            response.headers['Content-Type'] = 'application/json; charset=utf-8'
        return response
    
    # 配置日志
    setup_logging(app)
    
    # 注册蓝图
    register_blueprints(app)
    
    # 注册错误处理器
    register_error_handlers(app)
    
    # 创建数据库表（带重试机制）
    with app.app_context():
        init_database_with_retry(app)
    
    return app

def init_database_with_retry(app, max_retries=10, retry_delay=5):
    """带重试机制的数据库初始化"""
    for attempt in range(max_retries):
        try:
            # 测试数据库连接
            db.session.execute(text('SELECT 1'))
            # 创建数据库表
            db.create_all()
            app.logger.info('Database tables created successfully')
            return
        except Exception as e:
            if attempt < max_retries - 1:
                app.logger.warning(f'Database connection attempt {attempt + 1} failed: {str(e)}. Retrying in {retry_delay} seconds...')
                time.sleep(retry_delay)
            else:
                app.logger.error(f'Failed to connect to database after {max_retries} attempts: {str(e)}')
                raise

def setup_logging(app):
    """配置日志"""
    if not app.debug and not app.testing:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        
        file_handler = logging.FileHandler('logs/cattle_monitoring.log')
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        
        app.logger.setLevel(logging.INFO)
        app.logger.info('Cattle Monitoring System startup')

def register_blueprints(app):
    """注册蓝图"""
    from routes.api import api_bp
    from routes.cameras import cameras_bp
    from routes.statistics import statistics_bp
    from routes.farms import farms_bp
    
    # 注册API蓝图
    app.register_blueprint(api_bp, url_prefix='/api/v1')
    app.register_blueprint(cameras_bp, url_prefix='/api/v1/cameras')
    app.register_blueprint(statistics_bp, url_prefix='/api/v1/statistics')
    app.register_blueprint(farms_bp, url_prefix='/api/v1/farms')
    
    # 健康检查端点
    @app.route('/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0.0'
        })
    
    # 根路径
    @app.route('/')
    def index():
        return jsonify({
            'message': '肉牛养殖监控系统 API',
            'version': '1.0.0',
            'status': 'running',
            'timestamp': datetime.utcnow().isoformat()
        })

def register_error_handlers(app):
    """注册错误处理器"""
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'error': 'Bad Request',
            'message': '请求参数错误',
            'status_code': 400
        }), 400
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Not Found',
            'message': '请求的资源不存在',
            'status_code': 404
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({
            'error': 'Internal Server Error',
            'message': '服务器内部错误',
            'status_code': 500
        }), 500
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        app.logger.error(f'Unhandled exception: {str(e)}')
        return jsonify({
            'error': 'Internal Server Error',
            'message': '服务器发生未知错误',
            'status_code': 500
        }), 500

if __name__ == '__main__':
    app = create_app()
    
    # 获取配置
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5001))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    app.run(host=host, port=port, debug=debug)
