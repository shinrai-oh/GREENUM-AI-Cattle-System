#!/usr/bin/env python3
"""
生成行为数据脚本
为现有的牛只生成行为记录，用于测试前端页面功能
"""

import random
import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models import BehaviorData, Cattle, Camera
from config import get_config

# 获取配置并创建数据库连接
config = get_config()
engine = create_engine(config.SQLALCHEMY_DATABASE_URI)
Session = sessionmaker(bind=engine)

def generate_behavior_data():
    """生成行为数据"""
    session = Session()
    
    try:
        # 获取所有牛只
        cattle_list = session.query(Cattle).all()
        print(f"找到 {len(cattle_list)} 头牛")
        
        # 获取所有摄像头
        cameras = session.query(Camera).all()
        print(f"找到 {len(cameras)} 个摄像头")
        
        if not cattle_list or not cameras:
            print("没有找到牛只或摄像头数据")
            return
        
        # 行为类型
        behavior_types = ['eating', 'drinking', 'standing', 'lying', 'walking']
        
        # 为每头牛生成最近7天的行为数据
        for cattle in cattle_list[:10]:  # 只为前10头牛生成数据
            print(f"为牛只 {cattle.ear_tag} 生成行为数据...")
            
            # 选择一个摄像头（通常是同一个栏位的）
            camera = random.choice([c for c in cameras if c.pen_id == cattle.pen_id])
            if not camera:
                camera = random.choice(cameras)
            
            # 生成最近7天的行为数据
            for day_offset in range(7):
                date = datetime.datetime.now() - datetime.timedelta(days=day_offset)
                
                # 每天生成5-10条行为记录
                num_behaviors = random.randint(5, 10)
                
                for i in range(num_behaviors):
                    behavior_type = random.choice(behavior_types)
                    
                    # 生成开始时间（当天的随机时间）
                    start_hour = random.randint(6, 22)
                    start_minute = random.randint(0, 59)
                    start_time = date.replace(hour=start_hour, minute=start_minute, second=0, microsecond=0)
                    
                    # 生成持续时间（5分钟到2小时）
                    duration_minutes = random.randint(5, 120)
                    end_time = start_time + datetime.timedelta(minutes=duration_minutes)
                    
                    # 确保不超过当天
                    if end_time.date() > start_time.date():
                        end_time = start_time.replace(hour=23, minute=59, second=59)
                    
                    # 创建行为记录
                    behavior = BehaviorData(
                        cattle_id=cattle.id,
                        pen_id=cattle.pen_id,
                        camera_id=camera.id,
                        behavior_type=behavior_type,
                        start_time=start_time,
                        end_time=end_time,
                        duration=int((end_time - start_time).total_seconds()),
                        confidence=random.uniform(0.8, 0.99)
                    )
                    
                    session.add(behavior)
        
        # 提交所有数据
        session.commit()
        print("行为数据生成完成！")
        
        # 统计生成的数据
        total_behaviors = session.query(BehaviorData).count()
        print(f"总共生成了 {total_behaviors} 条行为记录")
        
    except Exception as e:
        session.rollback()
        print(f"生成行为数据时出错: {e}")
        raise
    finally:
        session.close()

if __name__ == '__main__':
    generate_behavior_data()