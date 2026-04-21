#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化的模拟数据生成脚本
只生成基本的牛只数据
"""

import random
import datetime
from datetime import timedelta
from sqlalchemy import create_engine, text
from config import Config

# 数据库连接
engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)

def generate_basic_cattle_data():
    """生成基本牛只数据"""
    print("正在生成基本牛只数据...")
    
    breeds = ['安格斯', '西门塔尔', '夏洛莱', '利木赞', '海福特']
    genders = ['male', 'female']
    statuses = ['healthy', 'sick', 'quarantine']
    
    cattle_data = []
    
    # 先检查现有的牛只数据，避免重复
    with engine.connect() as conn:
        result = conn.execute(text("SELECT ear_tag FROM cattle"))
        existing_tags = {row[0] for row in result.fetchall()}
    
    # 为阳光牧场生成牛只
    for i in range(1, 21):  # 生成20头牛
        ear_tag = f'YG{i:03d}'
        if ear_tag in existing_tags:
            continue  # 跳过已存在的耳标
            
        farm_id = 1
        pen_id = random.choice([1, 2, 3, 4])  # 对应pens表中的实际id
        breed = random.choice(breeds)
        birth_date = datetime.date(2021, 1, 1) + timedelta(days=random.randint(0, 730))
        weight = round(random.uniform(350.0, 600.0), 1)
        gender = random.choice(genders)
        status = random.choices(statuses, weights=[85, 10, 5])[0]
        
        cattle_data.append((ear_tag, farm_id, pen_id, breed, birth_date, weight, gender, status))
    
    # 为绿野牧场生成牛只
    for i in range(1, 16):  # 生成15头牛
        ear_tag = f'LY{i:03d}'
        if ear_tag in existing_tags:
            continue  # 跳过已存在的耳标
            
        farm_id = 2
        pen_id = random.choice([5, 6])  # 对应pens表中的实际id
        breed = random.choice(breeds)
        birth_date = datetime.date(2021, 1, 1) + timedelta(days=random.randint(0, 730))
        weight = round(random.uniform(350.0, 600.0), 1)
        gender = random.choice(genders)
        status = random.choices(statuses, weights=[85, 10, 5])[0]
        
        cattle_data.append((ear_tag, farm_id, pen_id, breed, birth_date, weight, gender, status))
    
    # 插入数据库
    with engine.connect() as conn:
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
    
    print(f"已生成 {len(cattle_data)} 条牛只数据")

def update_pen_counts():
    """更新栏位牛只数量"""
    print("正在更新栏位牛只数量...")
    
    with engine.connect() as conn:
        # 更新每个栏位的牛只数量
        conn.execute(text("""
            UPDATE pens p SET current_count = (
                SELECT COUNT(*) FROM cattle c WHERE c.pen_id = p.id
            )
        """))
        conn.commit()
    
    print("栏位牛只数量更新完成")

def main():
    """主函数"""
    print("开始生成基本模拟数据...")
    print("=" * 50)
    
    try:
        # 1. 生成牛只数据
        generate_basic_cattle_data()
        
        # 2. 更新栏位牛只数量
        update_pen_counts()
        
        print("=" * 50)
        print("基本模拟数据生成完成！")
        print("\n数据概览：")
        
        # 显示数据统计
        with engine.connect() as conn:
            # 牛只统计
            result = conn.execute(text("SELECT COUNT(*) FROM cattle"))
            cattle_count = result.scalar()
            
            # 摄像头统计
            result = conn.execute(text("SELECT COUNT(*) FROM cameras"))
            camera_count = result.scalar()
            
            print(f"- 牛只总数: {cattle_count}")
            print(f"- 摄像头总数: {camera_count}")
            
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