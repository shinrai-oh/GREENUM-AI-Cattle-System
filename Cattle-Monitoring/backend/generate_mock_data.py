#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
模拟数据生成脚本
用于为肉牛养殖监控系统生成测试数据
"""

import random
import datetime
from datetime import timedelta
from sqlalchemy import create_engine, text
from config import Config

# 数据库连接
engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)

def generate_cattle_data():
    """生成更多牛只数据"""
    print("正在生成牛只数据...")
    
    # 先检查现有的牛只数据，避免重复
    with engine.connect() as conn:
        result = conn.execute(text("SELECT ear_tag FROM cattle"))
        existing_tags = {row[0] for row in result.fetchall()}
    
    breeds = ['安格斯', '西门塔尔', '夏洛莱', '利木赞', '海福特', '德克萨斯长角牛']
    genders = ['male', 'female']
    statuses = ['healthy', 'sick', 'quarantine']
    
    cattle_data = []
    
    # 为阳光牧场生成更多牛只
    for i in range(5, 101):  # 从YG005开始，生成到YG100
        ear_tag = f'YG{i:03d}'
        if ear_tag in existing_tags:
            continue  # 跳过已存在的耳标
            
        farm_id = 1
        pen_id = random.choice([1, 2, 3, 4])  # 随机分配到4个栏位
        breed = random.choice(breeds)
        birth_date = datetime.date(2021, 1, 1) + timedelta(days=random.randint(0, 730))
        weight = round(random.uniform(350.0, 600.0), 1)
        gender = random.choice(genders)
        status = random.choices(statuses, weights=[85, 10, 5])[0]  # 85%健康，10%生病，5%隔离
        
        cattle_data.append((ear_tag, farm_id, pen_id, breed, birth_date, weight, gender, status))
    
    # 为绿野牧场生成更多牛只
    for i in range(5, 81):  # 从LY005开始，生成到LY080
        ear_tag = f'LY{i:03d}'
        if ear_tag in existing_tags:
            continue  # 跳过已存在的耳标
            
        farm_id = 2
        pen_id = random.choice([5, 6])  # 随机分配到2个栏位
        breed = random.choice(breeds)
        birth_date = datetime.date(2021, 1, 1) + timedelta(days=random.randint(0, 730))
        weight = round(random.uniform(350.0, 600.0), 1)
        gender = random.choice(genders)
        status = random.choices(statuses, weights=[85, 10, 5])[0]
        
        cattle_data.append((ear_tag, farm_id, pen_id, breed, birth_date, weight, gender, status))
    
    # 插入数据库
    with engine.connect() as conn:
        if cattle_data:
            conn.execute(text("""
                INSERT INTO cattle (ear_tag, farm_id, pen_id, breed, birth_date, weight, gender, status)
                VALUES (:ear_tag, :farm_id, :pen_id, :breed, :birth_date, :weight, :gender, :status)
            """), [
                {
                    'ear_tag': data[0],
                    'farm_id': data[1],
                    'pen_id': data[2],
                    'breed': data[3],
                    'birth_date': data[4],
                    'weight': data[5],
                    'gender': data[6],
                    'status': data[7]
                } for data in cattle_data
            ])
            conn.commit()
        else:
            print("没有新的牛只数据需要插入。")
    
    print(f"已生成 {len(cattle_data)} 条牛只数据")

def generate_behavior_data():
    """生成行为数据，包含约10%牛只（仅母牛）的发情记录"""
    print("正在生成行为数据...")

    # 获取所有牛只（包含性别）
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, pen_id, gender FROM cattle"))
        cattle_list = result.fetchall()

    behavior_types = ['eating', 'standing', 'lying', 'walking', 'drinking']
    behavior_data = []

    # 预先提取母牛ID集合
    female_cattle = [(cid, pen, gender) for cid, pen, gender in cattle_list if (gender or '').lower() == 'female']

    # 生成最近30天的行为数据（按天循环，便于按天选择发情牛只）
    for days_ago in range(30):
        date = datetime.date.today() - timedelta(days=days_ago)

        # 目标发情比例约为总牛只的10%，但仅在母牛中抽样
        total_cattle_today = len(cattle_list)
        female_ids = [cid for cid, _, _ in female_cattle]
        target_estrus_count = max(0, int(round(total_cattle_today * 0.10)))
        actual_estrus_count = min(target_estrus_count, len(female_ids))
        estrus_ids_today = set(random.sample(female_ids, actual_estrus_count)) if actual_estrus_count > 0 else set()

        for cattle_id, pen_id, gender in cattle_list:
            # 每天生成多个常规行为记录
            daily_behaviors = random.randint(8, 15)
            current_time = datetime.datetime.combine(date, datetime.time(6, 0))  # 从早上6点开始

            for _ in range(daily_behaviors):
                behavior_type = random.choice(behavior_types)

                # 根据行为类型设置持续时间
                if behavior_type == 'eating':
                    duration = random.randint(1800, 3600)  # 30-60分钟
                elif behavior_type == 'lying':
                    duration = random.randint(3600, 14400)  # 1-4小时
                elif behavior_type == 'standing':
                    duration = random.randint(1800, 7200)  # 30分钟-2小时
                elif behavior_type == 'walking':
                    duration = random.randint(300, 1800)  # 5-30分钟
                else:  # drinking
                    duration = random.randint(300, 900)  # 5-15分钟

                start_time = current_time
                end_time = start_time + timedelta(seconds=duration)

                # 确保不超过当天23:59
                if end_time.date() > date:
                    end_time = datetime.datetime.combine(date, datetime.time(23, 59))
                    duration = int((end_time - start_time).total_seconds())

                camera_id = random.randint(1, 32)  # 随机选择摄像头
                confidence = round(random.uniform(0.75, 0.98), 2)

                behavior_data.append({
                    'cattle_id': cattle_id,
                    'pen_id': pen_id,
                    'behavior_type': behavior_type,
                    'start_time': start_time,
                    'end_time': end_time,
                    'duration': duration,
                    'camera_id': camera_id,
                    'confidence': confidence
                })

                # 更新当前时间
                current_time = end_time + timedelta(minutes=random.randint(5, 30))

                # 如果超过当天，跳出循环
                if current_time.date() > date:
                    break

            # 追加发情记录（仅母牛，且当天在抽样集合中）
            if (gender or '').lower() == 'female' and cattle_id in estrus_ids_today:
                # 生成1-2段发情行为，典型持续时间 20-60 分钟
                estrus_segments = random.randint(1, 2)
                for _ in range(estrus_segments):
                    # 在当天 08:00-22:00 随机时间段
                    hour = random.choice([8, 10, 12, 14, 16, 18, 20, 22])
                    minute = random.randint(0, 59)
                    estrus_start = datetime.datetime.combine(date, datetime.time(hour, minute))
                    estrus_duration = random.randint(1200, 3600)  # 20-60分钟
                    estrus_end = estrus_start + timedelta(seconds=estrus_duration)
                    if estrus_end.date() > date:
                        estrus_end = datetime.datetime.combine(date, datetime.time(23, 59))
                        estrus_duration = int((estrus_end - estrus_start).total_seconds())

                    behavior_data.append({
                        'cattle_id': cattle_id,
                        'pen_id': pen_id,
                        'behavior_type': 'estrus',
                        'start_time': estrus_start,
                        'end_time': estrus_end,
                        'duration': estrus_duration,
                        'camera_id': random.randint(1, 32),
                        'confidence': round(random.uniform(0.85, 0.99), 2)
                    })
    
    # 分批插入数据库
    batch_size = 1000
    with engine.connect() as conn:
        for i in range(0, len(behavior_data), batch_size):
            batch = behavior_data[i:i + batch_size]
            conn.execute(text("""
                INSERT INTO behavior_data (cattle_id, pen_id, behavior_type, start_time, end_time, duration, camera_id, confidence)
                VALUES (:cattle_id, :pen_id, :behavior_type, :start_time, :end_time, :duration, :camera_id, :confidence)
            """), batch)
            conn.commit()
            print(f"已插入 {len(batch)} 条行为数据")
    
    print(f"总共生成 {len(behavior_data)} 条行为数据")

def generate_daily_statistics():
    """生成每日统计数据"""
    print("正在生成每日统计数据...")
    
    # 获取所有牛只
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, pen_id FROM cattle"))
        cattle_list = result.fetchall()
    
    statistics_data = []
    
    # 为每头牛生成最近30天的统计数据
    for cattle_id, pen_id in cattle_list:
        for days_ago in range(30):
            stat_date = datetime.date.today() - timedelta(days=days_ago)
            
            # 生成合理的统计数据
            eating_time = random.randint(120, 240)  # 2-4小时
            standing_time = random.randint(180, 300)  # 3-5小时
            lying_time = random.randint(480, 720)  # 8-12小时
            walking_time = random.randint(30, 120)  # 0.5-2小时
            drinking_time = random.randint(10, 30)  # 10-30分钟
            
            total_active_time = eating_time + standing_time + walking_time + drinking_time
            
            statistics_data.append({
                'cattle_id': cattle_id,
                'pen_id': pen_id,
                'stat_date': stat_date,
                'eating_time': eating_time,
                'standing_time': standing_time,
                'lying_time': lying_time,
                'walking_time': walking_time,
                'drinking_time': drinking_time,
                'total_active_time': total_active_time
            })
    
    # 分批插入数据库
    batch_size = 1000
    with engine.connect() as conn:
        for i in range(0, len(statistics_data), batch_size):
            batch = statistics_data[i:i + batch_size]
            conn.execute(text("""
                INSERT INTO daily_statistics (cattle_id, pen_id, stat_date, eating_time, standing_time, lying_time, walking_time, drinking_time, total_active_time)
                VALUES (:cattle_id, :pen_id, :stat_date, :eating_time, :standing_time, :lying_time, :walking_time, :drinking_time, :total_active_time)
                ON DUPLICATE KEY UPDATE
                eating_time = VALUES(eating_time),
                standing_time = VALUES(standing_time),
                lying_time = VALUES(lying_time),
                walking_time = VALUES(walking_time),
                drinking_time = VALUES(drinking_time),
                total_active_time = VALUES(total_active_time)
            """), batch)
            conn.commit()
            print(f"已插入 {len(batch)} 条统计数据")
    
    print(f"总共生成 {len(statistics_data)} 条统计数据")

def update_pen_counts():
    """更新栏位中的牛只数量"""
    print("正在更新栏位牛只数量...")
    
    with engine.connect() as conn:
        # 更新每个栏位的当前牛只数量
        conn.execute(text("""
            UPDATE pens p SET current_count = (
                SELECT COUNT(*) FROM cattle c 
                WHERE c.pen_id = p.id AND c.status IN ('healthy', 'sick')
            )
        """))
        conn.commit()
    
    print("栏位牛只数量更新完成")

def add_more_cameras():
    """添加更多摄像头以满足每个养牛厂16个的要求"""
    print("正在检查摄像头数量...")
    
    with engine.connect() as conn:
        # 检查当前摄像头数量
        result = conn.execute(text("SELECT farm_id, COUNT(*) as count FROM cameras GROUP BY farm_id"))
        camera_counts = dict(result.fetchall())
        
        additional_cameras = []
        
        # 为广西农垦牧场1添加更多摄像头（如果不足16个）
        farm1_count = camera_counts.get(1, 0)
        if farm1_count < 16:
            needed = 16 - farm1_count
            for i in range(needed):
                camera_num = farm1_count + i + 1
                additional_cameras.append({
                    'name': f'广西农垦牧场1-额外-{camera_num}',
                    'rtsp_url': f'rtsp://admin:password@192.168.1.{200 + i}:554/stream1',
                    'location': f'额外监控点{camera_num}',
                    'farm_id': 1,
                    'pen_id': random.choice([1, 2, 3, 4]),
                    'status': 'active'
                })
        
        # 为广西农垦牧场2添加更多摄像头（如果不足16个）
        farm2_count = camera_counts.get(2, 0)
        if farm2_count < 16:
            needed = 16 - farm2_count
            for i in range(needed):
                camera_num = farm2_count + i + 1
                additional_cameras.append({
                    'name': f'广西农垦牧场2-额外-{camera_num}',
                    'rtsp_url': f'rtsp://admin:password@192.168.2.{200 + i}:554/stream1',
                    'location': f'额外监控点{camera_num}',
                    'farm_id': 2,
                    'pen_id': random.choice([5, 6]),
                    'status': 'active'
                })
        
        if additional_cameras:
            conn.execute(text("""
                INSERT INTO cameras (name, rtsp_url, location, farm_id, pen_id, status)
                VALUES (:name, :rtsp_url, :location, :farm_id, :pen_id, :status)
            """), additional_cameras)
            conn.commit()
            print(f"已添加 {len(additional_cameras)} 个摄像头")
        else:
            print("摄像头数量已满足要求")

def main():
    """主函数"""
    print("开始生成模拟数据...")
    print("=" * 50)
    
    try:
        # 1. 添加更多摄像头
        add_more_cameras()
        
        # 2. 生成牛只数据
        generate_cattle_data()
        
        # 3. 更新栏位牛只数量
        update_pen_counts()
        
        # 4. 生成行为数据
        generate_behavior_data()
        
        # 5. 生成统计数据
        generate_daily_statistics()
        
        print("=" * 50)
        print("模拟数据生成完成！")
        print("\n数据概览：")
        
        # 显示数据统计
        with engine.connect() as conn:
            # 牛只统计
            result = conn.execute(text("SELECT COUNT(*) FROM cattle"))
            cattle_count = result.scalar()
            
            # 摄像头统计
            result = conn.execute(text("SELECT COUNT(*) FROM cameras"))
            camera_count = result.scalar()
            
            # 行为数据统计
            result = conn.execute(text("SELECT COUNT(*) FROM behavior_data"))
            behavior_count = result.scalar()
            
            # 统计数据统计
            result = conn.execute(text("SELECT COUNT(*) FROM daily_statistics"))
            stats_count = result.scalar()
            
            print(f"- 牛只总数: {cattle_count}")
            print(f"- 摄像头总数: {camera_count}")
            print(f"- 行为记录总数: {behavior_count}")
            print(f"- 统计记录总数: {stats_count}")
            
            # 按养牛厂统计
            result = conn.execute(text("""
                SELECT f.name, COUNT(c.id) as cattle_count
                FROM farms f
                LEFT JOIN cattle c ON f.id = c.farm_id
                GROUP BY f.id, f.name
            """))
            
            print("\n按养牛厂统计：")
            for farm_name, count in result.fetchall():
                print(f"- {farm_name}: {count} 头牛")
    
    except Exception as e:
        print(f"生成数据时出错: {e}")
        raise

if __name__ == "__main__":
    main()
