#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据扩容与时间范围扩展脚本

功能：
- 将每个养牛厂的每个栏位的牛只数量扩容到目标数量（默认15）
- 为所有牛只在指定的时间范围内（起止日期包含）生成行为数据
- 更新栏位当前牛只数量，并生成对应的日统计数据

运行示例：
    python resize_data.py --target 15 --start 2023-01-01 --end 2024-12-30
"""

import argparse
import random
import datetime
from typing import List, Dict

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from config import get_config
from models import db, Farm, Pen, Cattle, Camera, BehaviorData


def get_engine_and_session():
    config = get_config()
    engine = create_engine(config.SQLALCHEMY_DATABASE_URI)
    Session = sessionmaker(bind=engine)
    return engine, Session


def ensure_cattle_per_pen(session, target: int = 15) -> int:
    """确保每个栏位有至少 target 头牛（不含 sold 状态）。

    返回：新增牛只数量
    """
    pens: List[Pen] = session.query(Pen).all()

    # 预取所有耳标，防止重复
    existing_tags = {t for (t,) in session.query(Cattle.ear_tag).all()}

    breeds = ['安格斯', '西门塔尔', '夏洛莱', '利木赞', '海福特', '德克萨斯长角牛']
    genders = ['male', 'female']

    added = 0

    for pen in pens:
        # 只统计未出售的牛只
        current_count = session.query(Cattle).filter(
            Cattle.pen_id == pen.id,
            Cattle.status.in_(['healthy', 'sick', 'quarantine'])
        ).count()

        if current_count >= target:
            continue

        need = target - current_count

        # 为该栏位生成唯一耳标：F{farm_id}-P{pen_id}-{seq}
        seq = 1
        new_cattle = []
        for _ in range(need):
            while True:
                ear_tag = f"F{pen.farm_id}-P{pen.id}-{seq:03d}"
                seq += 1
                if ear_tag not in existing_tags:
                    existing_tags.add(ear_tag)
                    break

            breed = random.choice(breeds)
            birth_date = datetime.date(2021, 1, 1) + datetime.timedelta(days=random.randint(0, 730))
            weight = round(random.uniform(350.0, 600.0), 1)
            gender = random.choice(genders)

            new_cattle.append(Cattle(
                ear_tag=ear_tag,
                farm_id=pen.farm_id,
                pen_id=pen.id,
                breed=breed,
                birth_date=birth_date,
                weight=weight,
                gender=gender,
                status='healthy'
            ))

        if new_cattle:
            session.bulk_save_objects(new_cattle)
            added += len(new_cattle)

    session.flush()

    # 更新每个栏位 current_count（仅统计 healthy/sick）
    for pen in pens:
        count_active = session.query(Cattle).filter(
            Cattle.pen_id == pen.id,
            Cattle.status.in_(['healthy', 'sick'])
        ).count()
        pen.current_count = count_active

    session.commit()
    return added


def generate_behavior_range(session, start_date: datetime.date, end_date: datetime.date, batch_size: int = 1000) -> int:
    """为所有牛只在[start_date, end_date]范围内生成行为数据。

    返回：新增行为记录数
    """
    # 预取所有牛只与摄像头
    cattle_list: List[Cattle] = session.query(Cattle).filter(
        Cattle.status.in_(['healthy', 'sick', 'quarantine'])
    ).all()
    cameras: List[Camera] = session.query(Camera).all()

    if not cattle_list:
        return 0

    # 按栏位分组摄像头，优先使用同栏位摄像头
    cameras_by_pen: Dict[int, List[Camera]] = {}
    for cam in cameras:
        if cam.pen_id is None:
            continue
        cameras_by_pen.setdefault(cam.pen_id, []).append(cam)

    total_days = (end_date - start_date).days + 1
    behavior_types = ['eating', 'drinking', 'standing', 'lying', 'walking']

    to_insert = []
    inserted = 0

    def pick_camera(pen_id: int) -> int:
        cams = cameras_by_pen.get(pen_id, [])
        if cams:
            return random.choice(cams).id
        if cameras:
            return random.choice(cameras).id
        return None

    for cattle in cattle_list:
        camera_id_default = pick_camera(cattle.pen_id)
        for day_index in range(total_days):
            day = start_date + datetime.timedelta(days=day_index)

            # 每天生成 4-8 条行为记录，避免数据量过大
            num_behaviors = random.randint(4, 8)
            current_time = datetime.datetime.combine(day, datetime.time(6, 0))

            for _ in range(num_behaviors):
                behavior_type = random.choice(behavior_types)

                # 根据行为类型设置持续时间（秒）
                if behavior_type == 'eating':
                    duration = random.randint(1800, 3600)
                elif behavior_type == 'lying':
                    duration = random.randint(3600, 14400)
                elif behavior_type == 'standing':
                    duration = random.randint(1800, 7200)
                elif behavior_type == 'walking':
                    duration = random.randint(300, 1800)
                else:  # drinking
                    duration = random.randint(300, 900)

                start_time = current_time
                end_time = start_time + datetime.timedelta(seconds=duration)

                if end_time.date() > day:
                    end_time = datetime.datetime.combine(day, datetime.time(23, 59))
                    duration = int((end_time - start_time).total_seconds())

                camera_id = camera_id_default

                to_insert.append(BehaviorData(
                    cattle_id=cattle.id,
                    pen_id=cattle.pen_id,
                    camera_id=camera_id,
                    behavior_type=behavior_type,
                    start_time=start_time,
                    end_time=end_time,
                    duration=duration,
                    confidence=round(random.uniform(0.75, 0.98), 2)
                ))

                current_time = end_time + datetime.timedelta(minutes=random.randint(5, 30))
                if current_time.date() > day:
                    break

            # 批量入库，降低内存占用
            if len(to_insert) >= batch_size:
                session.bulk_save_objects(to_insert)
                session.flush()
                session.commit()
                inserted += len(to_insert)
                to_insert.clear()

    if to_insert:
        session.bulk_save_objects(to_insert)
        session.flush()
        session.commit()
        inserted += len(to_insert)
        to_insert.clear()

    return inserted


def main():
    parser = argparse.ArgumentParser(description='扩容牛只并生成指定时间范围内的行为数据')
    parser.add_argument('--target', type=int, default=15, help='每个栏位目标牛只数量')
    parser.add_argument('--start', required=True, help='行为数据开始日期，格式YYYY-MM-DD')
    parser.add_argument('--end', required=True, help='行为数据结束日期，格式YYYY-MM-DD')
    parser.add_argument('--skip-behavior', action='store_true', help='跳过行为数据生成')
    parser.add_argument('--skip-stats', action='store_true', help='跳过日统计生成')

    args = parser.parse_args()
    start_date = datetime.datetime.strptime(args.start, '%Y-%m-%d').date()
    end_date = datetime.datetime.strptime(args.end, '%Y-%m-%d').date()

    if end_date < start_date:
        raise ValueError('结束日期必须不早于开始日期')

    engine, Session = get_engine_and_session()
    session = Session()

    try:
        print('开始扩容牛只并生成数据...')
        print('目标每栏位牛只数:', args.target)
        print('行为数据时间范围:', start_date, '到', end_date)

        # 1) 扩容牛只
        added_cattle = ensure_cattle_per_pen(session, target=args.target)
        print(f'已新增牛只 {added_cattle} 头')

        # 2) 生成行为数据
        if not args.skip_behavior:
            inserted_behaviors = generate_behavior_range(session, start_date, end_date)
            print(f'已新增行为记录 {inserted_behaviors} 条')
        else:
            print('已跳过行为数据生成')

        # 3) 生成日统计
        if not args.skip_stats:
            from generate_daily_statistics import generate_daily_statistics
            generate_daily_statistics()
        else:
            print('已跳过日统计生成')

        print('数据扩容与生成完成')

    except Exception as e:
        session.rollback()
        print('执行过程中发生错误:', e)
        raise
    finally:
        session.close()


if __name__ == '__main__':
    main()

