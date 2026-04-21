#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库连接测试脚本
用于诊断肉牛养殖监控系统的数据库连接问题
"""

import sys
import time
import pymysql
from sqlalchemy import create_engine, text
from config import get_config

def test_basic_connection():
    """测试基本的 MySQL 连接"""
    print("=" * 50)
    print("1. 测试基本 MySQL 连接")
    print("=" * 50)
    
    try:
        # 使用 PyMySQL 直接连接
        connection = pymysql.connect(
            host='localhost',
            port=3306,
            user='cattle_user',
            password='cattle_pass',
            database='cattle_monitoring',
            charset='utf8mb4'
        )
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"✅ MySQL 连接成功！")
            print(f"   MySQL 版本: {version[0]}")
            
            cursor.execute("SELECT DATABASE()")
            database = cursor.fetchone()
            print(f"   当前数据库: {database[0]}")
            
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            print(f"   数据表数量: {len(tables)}")
            if tables:
                print(f"   数据表列表: {[table[0] for table in tables]}")
        
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ MySQL 连接失败: {e}")
        return False

def test_sqlalchemy_connection():
    """测试 SQLAlchemy 连接"""
    print("\n" + "=" * 50)
    print("2. 测试 SQLAlchemy 连接")
    print("=" * 50)
    
    try:
        config = get_config()
        database_uri = config.SQLALCHEMY_DATABASE_URI
        print(f"数据库 URI: {database_uri}")
        
        engine = create_engine(database_uri)
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT VERSION()"))
            version = result.scalar()
            print(f"✅ SQLAlchemy 连接成功！")
            print(f"   MySQL 版本: {version}")
            
            result = conn.execute(text("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'cattle_monitoring'"))
            table_count = result.scalar()
            print(f"   数据表数量: {table_count}")
            
            # 测试具体表是否存在
            tables_to_check = ['farms', 'pens', 'cameras', 'cattle', 'behavior_data', 'daily_statistics']
            for table in tables_to_check:
                try:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    print(f"   表 {table}: {count} 条记录")
                except Exception as e:
                    print(f"   表 {table}: ❌ 不存在或无法访问 ({e})")
        
        return True
        
    except Exception as e:
        print(f"❌ SQLAlchemy 连接失败: {e}")
        return False

def test_docker_mysql():
    """测试 Docker MySQL 容器状态"""
    print("\n" + "=" * 50)
    print("3. 测试 Docker MySQL 容器状态")
    print("=" * 50)
    
    import subprocess
    
    try:
        # 检查 Docker 是否运行
        result = subprocess.run(['docker', 'ps'], capture_output=True, text=True)
        if result.returncode != 0:
            print("❌ Docker 未运行或无法访问")
            return False
        
        # 检查 MySQL 容器
        result = subprocess.run(['docker', 'ps', '--filter', 'name=cattle_mysql'], capture_output=True, text=True)
        if 'cattle_mysql' in result.stdout:
            print("✅ MySQL 容器正在运行")
            
            # 获取容器详细信息
            result = subprocess.run(['docker', 'inspect', 'cattle_mysql'], capture_output=True, text=True)
            if result.returncode == 0:
                print("   容器状态: 正常")
            
            # 检查容器日志
            result = subprocess.run(['docker', 'logs', '--tail', '10', 'cattle_mysql'], capture_output=True, text=True)
            if result.returncode == 0:
                print("   最近日志:")
                for line in result.stdout.split('\n')[-5:]:
                    if line.strip():
                        print(f"     {line}")
        else:
            print("❌ MySQL 容器未运行")
            print("   请运行: docker-compose up mysql -d")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Docker 检查失败: {e}")
        return False

def test_network_connectivity():
    """测试网络连接"""
    print("\n" + "=" * 50)
    print("4. 测试网络连接")
    print("=" * 50)
    
    import socket
    
    try:
        # 测试端口连接
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(('localhost', 3306))
        sock.close()
        
        if result == 0:
            print("✅ MySQL 端口 3306 可访问")
            return True
        else:
            print("❌ MySQL 端口 3306 无法访问")
            print("   请检查 MySQL 服务是否启动")
            return False
            
    except Exception as e:
        print(f"❌ 网络连接测试失败: {e}")
        return False

def test_flask_app_connection():
    """测试 Flask 应用的数据库连接"""
    print("\n" + "=" * 50)
    print("5. 测试 Flask 应用数据库连接")
    print("=" * 50)
    
    try:
        from app import create_app
        from models import db
        
        app = create_app()
        
        with app.app_context():
            # 测试数据库连接
            with db.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("✅ Flask 应用数据库连接成功")
            
            # 检查表是否存在
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"   检测到 {len(tables)} 个数据表")
            
            if not tables:
                print("   ⚠️  数据表为空，可能需要初始化数据库")
                print("   建议运行: python generate_mock_data.py")
            else:
                print("   数据库表结构完整，数据已就绪")
            
            return True
            
    except Exception as e:
        print(f"❌ Flask 应用数据库连接失败: {e}")
        print("   这可能是配置问题或数据库未正确初始化")
        return False

def provide_solutions():
    """提供解决方案"""
    print("\n" + "=" * 50)
    print("解决方案建议")
    print("=" * 50)
    
    print("如果测试失败，请按以下步骤排查：")
    print()
    print("1. 启动 Docker 和 MySQL:")
    print("   docker-compose up mysql -d")
    print("   sleep 30  # 等待 MySQL 完全启动")
    print()
    print("2. 检查 MySQL 容器状态:")
    print("   docker ps | grep mysql")
    print("   docker-compose logs mysql")
    print()
    print("3. 手动连接测试:")
    print("   docker exec -it cattle_mysql mysql -u cattle_user -p")
    print("   # 密码: cattle_pass")
    print()
    print("4. 重新初始化数据库:")
    print("   docker-compose down -v")
    print("   docker-compose up mysql -d")
    print("   sleep 60")
    print("   python generate_mock_data.py")
    print()
    print("5. 检查配置文件:")
    print("   确认 backend/config.py 中的数据库连接配置")
    print()
    print("6. 使用本地 MySQL (替代方案):")
    print("   brew install mysql")
    print("   brew services start mysql")
    print("   # 然后创建数据库和用户")

def main():
    """主函数"""
    print("肉牛养殖监控系统 - 数据库连接诊断工具")
    print("=" * 60)
    
    tests = [
        test_network_connectivity,
        test_docker_mysql,
        test_basic_connection,
        test_sqlalchemy_connection,
        test_flask_app_connection
    ]
    
    results = []
    
    for test in tests:
        try:
            result = test()
            results.append(result)
            time.sleep(1)  # 短暂延迟
        except KeyboardInterrupt:
            print("\n用户中断测试")
            break
        except Exception as e:
            print(f"测试过程中出现错误: {e}")
            results.append(False)
    
    # 总结
    print("\n" + "=" * 50)
    print("测试结果总结")
    print("=" * 50)
    
    test_names = [
        "网络连接",
        "Docker MySQL 容器",
        "基本 MySQL 连接",
        "SQLAlchemy 连接",
        "Flask 应用连接"
    ]
    
    for i, (name, result) in enumerate(zip(test_names, results)):
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{i+1}. {name}: {status}")
    
    success_count = sum(results)
    total_count = len(results)
    
    print(f"\n总体结果: {success_count}/{total_count} 项测试通过")
    
    if success_count == total_count:
        print("🎉 所有测试通过！数据库连接正常。")
    elif success_count >= 3:
        print("⚠️  部分测试通过，系统可能可以正常运行。")
    else:
        print("❌ 多项测试失败，需要排查数据库连接问题。")
        provide_solutions()

if __name__ == "__main__":
    main()