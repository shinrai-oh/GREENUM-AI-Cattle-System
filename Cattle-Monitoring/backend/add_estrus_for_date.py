#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为指定日期批量插入“发情(estrus)”行为记录脚本

用法示例：
    python add_estrus_for_date.py --date 2024-12-29 --ratio 0.10

逻辑：
- 以指定日期在 daily_statistics 中出现的牛只为基准计算总数
- 仅在母牛中随机抽样，目标数量约为 总牛只 * ratio
- 为抽中的牛只在当天插入 1-2 段“发情”行为记录
"""

import argparse
import random
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import get_config
from models import BehaviorData, Cattle, DailyStatistics, Camera


def parse_args():
    parser = argparse.ArgumentParser(description='为指定日期插入约定比例的“发情”行为记录')
    parser.add_argument('--date', required=True, help='目标日期，格式 YYYY-MM-DD')
    parser.add_argument('--ratio', type=float, default=0.10, help='目标占比（相对于总牛只数）')
    parser.add_argument('--dry-run', action='store_true', help='仅打印将要执行的操作，不写入数据库')
    return parser.parse_args()


def main():
    args = parse_args()
    target_date = datetime.datetime.strptime(args.date, '%Y-%m-%d').date()
    ratio = max(0.0, min(1.0, args.ratio))

    config = get_config()
    engine = create_engine(config.SQLALCHEMY_DATABASE_URI)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # 找到当天有统计数据的牛只ID集合（作为总数基准）
        stats_q = session.query(DailyStatistics.cattle_id).filter(DailyStatistics.stat_date == target_date)
        cattle_ids_on_date = [row[0] for row in stats_q.all()]

        if not cattle_ids_on_date:
            print(f'在 {target_date} 没有找到 daily_statistics 记录，无法计算占比。请先生成统计数据。')
            return

        total_cattle = len(cattle_ids_on_date)
        print(f'{target_date} 总牛只（有统计记录）: {total_cattle}')

        # 限定母牛集合
        females = (
            session.query(Cattle.id, Cattle.pen_id)
            .filter(Cattle.id.in_(cattle_ids_on_date))
            .filter(Cattle.gender == 'female')
            .all()
        )

        if not females:
            print('当天统计范围内没有母牛，无法生成“发情”记录。')
            return

        # 计算目标插入数量（不超过母牛数量）
        target_count = int(round(total_cattle * ratio))
        target_count = max(1, min(target_count, len(females)))
        print(f'目标插入“发情”记录的牛只数: {target_count}（约 {ratio*100:.2f}%）')

        # 去重：排除当天已存在“发情”记录的牛只
        existing_estrus_ids = set([
            row[0] for row in (
                session.query(BehaviorData.cattle_id)
                .filter(BehaviorData.behavior_type == 'estrus')
                .filter(BehaviorData.start_time >= datetime.datetime.combine(target_date, datetime.time(0, 0, 0)))
                .filter(BehaviorData.start_time < datetime.datetime.combine(target_date + datetime.timedelta(days=1), datetime.time(0, 0, 0)))
                .all()
            )
        ])

        candidates = [(cid, pen_id) for cid, pen_id in females if cid not in existing_estrus_ids]
        if not candidates:
            print('当天“发情”记录已存在，或没有可插入的母牛候选。')
            return

        # 随机抽样
        sample_size = min(target_count, len(candidates))
        sampled = random.sample(candidates, sample_size)

        # 选择摄像头映射（优先同栏位）
        cameras_by_pen = {}
        for pen_id in set(p for _, p in sampled):
            cams = session.query(Camera.id).filter(Camera.pen_id == pen_id).all()
            cameras_by_pen[pen_id] = [cid for (cid,) in cams]
        all_cameras = [cid for (cid,) in session.query(Camera.id).all()]

        # 构造行为记录
        inserts = []
        for cattle_id, pen_id in sampled:
            segments = random.randint(1, 2)
            for _ in range(segments):
                # 当天 09:00-21:00 的随机开始时间
                hour = random.choice([9, 11, 13, 15, 17, 19, 21])
                minute = random.randint(0, 59)
                start_dt = datetime.datetime.combine(target_date, datetime.time(hour, minute))
                duration = random.randint(1200, 3600)  # 20-60分钟
                end_dt = start_dt + datetime.timedelta(seconds=duration)
                if end_dt.date() > target_date:
                    end_dt = datetime.datetime.combine(target_date, datetime.time(23, 59))
                    duration = int((end_dt - start_dt).total_seconds())

                cam_list = cameras_by_pen.get(pen_id) or all_cameras
                camera_id = random.choice(cam_list) if cam_list else None

                inserts.append(BehaviorData(
                    cattle_id=cattle_id,
                    pen_id=pen_id,
                    behavior_type='estrus',
                    start_time=start_dt,
                    end_time=end_dt,
                    duration=duration,
                    camera_id=camera_id,
                    confidence=0.92
                ))

        print(f'准备插入“发情”行为记录条数: {len(inserts)}（覆盖牛只: {sample_size}）')

        if args.dry_run:
            print('Dry-run 模式，不写入数据库。')
            return

        for obj in inserts:
            session.add(obj)
        session.commit()
        print('插入完成！')

    except Exception as e:
        session.rollback()
        print(f'插入“发情”数据时发生错误: {e}')
        raise
    finally:
        session.close()


if __name__ == '__main__':
    main()

