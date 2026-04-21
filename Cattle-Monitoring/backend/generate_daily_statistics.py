#!/usr/bin/env python3
"""
从行为数据生成日统计数据的脚本
"""

import datetime
from sqlalchemy import create_engine, text, func
from sqlalchemy.orm import sessionmaker
from models import DailyStatistics, BehaviorData, Cattle
from config import get_config

# 获取配置并创建数据库连接
config = get_config()
engine = create_engine(config.SQLALCHEMY_DATABASE_URI)
Session = sessionmaker(bind=engine)

def generate_daily_statistics():
    """从行为数据生成日统计数据"""
    session = Session()
    
    try:
        print("开始生成日统计数据...")
        
        # 获取所有有行为数据的日期范围
        date_range = session.query(
            func.date(BehaviorData.start_time).label('date')
        ).distinct().all()
        
        print(f"找到 {len(date_range)} 个不同的日期")
        
        # 获取所有牛只
        cattle_list = session.query(Cattle).all()
        print(f"找到 {len(cattle_list)} 头牛")
        
        total_records = 0
        
        for date_row in date_range:
            stat_date = date_row.date
            print(f"处理日期: {stat_date}")
            
            for cattle in cattle_list:
                # 检查是否已存在该牛只该日期的统计数据
                existing = session.query(DailyStatistics).filter(
                    DailyStatistics.cattle_id == cattle.id,
                    DailyStatistics.stat_date == stat_date
                ).first()
                
                if existing:
                    continue
                
                # 获取该牛只该日期的所有行为数据
                behaviors = session.query(BehaviorData).filter(
                    BehaviorData.cattle_id == cattle.id,
                    func.date(BehaviorData.start_time) == stat_date
                ).all()
                
                if not behaviors:
                    continue
                
                # 计算各种行为的总时间（秒）
                eating_time = sum(b.duration for b in behaviors if b.behavior_type == 'eating')
                drinking_time = sum(b.duration for b in behaviors if b.behavior_type == 'drinking')
                standing_time = sum(b.duration for b in behaviors if b.behavior_type == 'standing')
                lying_time = sum(b.duration for b in behaviors if b.behavior_type == 'lying')
                walking_time = sum(b.duration for b in behaviors if b.behavior_type == 'walking')
                
                # 转换为分钟
                eating_minutes = eating_time // 60
                drinking_minutes = drinking_time // 60
                standing_minutes = standing_time // 60
                lying_minutes = lying_time // 60
                walking_minutes = walking_time // 60
                
                # 计算总活跃时间
                total_active_minutes = standing_minutes + walking_minutes
                
                # 创建日统计记录
                daily_stat = DailyStatistics(
                    cattle_id=cattle.id,
                    pen_id=cattle.pen_id,
                    stat_date=stat_date,
                    eating_time=eating_minutes,
                    drinking_time=drinking_minutes,
                    standing_time=standing_minutes,
                    lying_time=lying_minutes,
                    walking_time=walking_minutes,
                    total_active_time=total_active_minutes
                )
                
                session.add(daily_stat)
                total_records += 1
                
                if total_records % 50 == 0:
                    print(f"已处理 {total_records} 条记录...")
        
        # 提交所有更改
        session.commit()
        print(f"日统计数据生成完成！总共生成了 {total_records} 条记录")
        
        # 显示统计信息
        total_stats = session.query(DailyStatistics).count()
        print(f"数据库中现在有 {total_stats} 条日统计记录")
        
        # 显示一些示例数据
        sample_stats = session.query(DailyStatistics).limit(5).all()
        print("\n示例数据:")
        for stat in sample_stats:
            print(f"牛只ID: {stat.cattle_id}, 日期: {stat.stat_date}, "
                  f"进食: {stat.eating_time}分钟, 站立: {stat.standing_time}分钟, "
                  f"卧躺: {stat.lying_time}分钟")
        
    except Exception as e:
        session.rollback()
        print(f"生成日统计数据时出错: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    generate_daily_statistics()