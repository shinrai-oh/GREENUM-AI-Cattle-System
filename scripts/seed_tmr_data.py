#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TMR 数据库种子脚本
从 2021 年实际耗料记录 Excel 生成 SQL，注入统一 MySQL 数据库
"""

import pandas as pd
import json
import datetime
import re
import sys

EXCEL_PATH = "D:/绿姆山牛场AI系统项目/Doc-ref/日混合料耗料记录2021.xlsx"

SHEETS = [f"2021-{m}" for m in range(1, 13)]

# 食材列索引 -> 名称
INGREDIENT_COLS = {
    3: "精料",
    4: "发酵料",
    5: "啤酒糟",
    6: "糖蜜",
    7: "青贮",
    8: "甘蔗尾",
    9: "麦秆",
}

# 批次 -> 设备ID / 牛品种映射
# 1上午/1下午 = 后期牛 -> device_id=1
# 2上午/2下午 = 前期牛 -> device_id=2
# 3上午/3下午 = 母牛   -> device_id=3
BATCH_DEVICE = {"1": 1, "2": 2, "3": 3}
BATCH_BREED  = {"1": "后期牛", "2": "前期牛", "3": "母牛"}
DEVICE_FORMULA = {1: 1, 2: 2, 3: 3}  # device_id -> formula_id


def parse_date(raw):
    """将 '2021.1.1' 或 '2021-01-01' 解析为 datetime.date"""
    raw = str(raw).strip()
    raw = raw.replace("．", ".").replace(" ", "")
    m = re.match(r"(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})", raw)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        try:
            return datetime.date(y, mo, d)
        except ValueError:
            return None
    return None


def is_date_row(row):
    val = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
    return bool(re.match(r"\d{4}[./]", val))


def is_header_row(row):
    val = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ""
    return "品种" in val or "ţ" in val or "breed" in val.lower()


def is_total_row(row):
    val = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
    return "合计" in val or "ϼ" in val


def parse_batch_session(cell_val):
    """从 '1上午'/'1下午' 提取批次和时段"""
    val = str(cell_val).strip() if pd.notna(cell_val) else ""
    m = re.match(r"(\d+)(上午|下午|AM|PM)", val)
    if m:
        batch = m.group(1)
        session = "morning" if m.group(2) in ("上午", "AM") else "afternoon"
        return batch, session
    return None, None


def float_val(v):
    try:
        f = float(v)
        return f if not pd.isna(f) else 0.0
    except (TypeError, ValueError):
        return 0.0


def parse_all_sheets():
    """解析所有月份 sheet，返回 feeding_rows 列表"""
    feeding_rows = []  # {date, device_id, session, ingredients{}}

    for sheet in SHEETS:
        try:
            df = pd.read_excel(EXCEL_PATH, sheet_name=sheet, header=None)
        except Exception as e:
            print(f"[WARN] 无法读取 {sheet}: {e}", file=sys.stderr)
            continue

        current_date = None
        current_breed_by_batch = {}  # batch -> breed

        i = 0
        while i < len(df):
            row = df.iloc[i]

            if is_date_row(row):
                d = parse_date(row.iloc[0])
                if d and d.year == 2021:
                    current_date = d
                    current_breed_by_batch = {}
                else:
                    current_date = None
                i += 1
                continue

            if is_header_row(row) or is_total_row(row):
                i += 1
                continue

            if current_date is None:
                i += 1
                continue

            batch, session = parse_batch_session(row.iloc[0])
            if batch is None:
                i += 1
                continue

            # 品种：只在上午行填写，下午行继承
            breed_cell = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ""
            if breed_cell and "ţ" not in breed_cell and breed_cell not in ("NaN", "nan", ""):
                current_breed_by_batch[batch] = breed_cell

            device_id = BATCH_DEVICE.get(batch)
            if device_id is None:
                i += 1
                continue

            # 提取各食材用量
            ingr = {}
            total = 0.0
            for col_idx, name in INGREDIENT_COLS.items():
                v = float_val(row.iloc[col_idx])
                ingr[name] = v
                total += v

            if total > 0:
                feeding_rows.append({
                    "date": current_date,
                    "device_id": device_id,
                    "session": session,
                    "ingredients": ingr,
                    "total_kg": total,
                })

            i += 1

    return feeding_rows


def compute_avg_formula(feeding_rows, device_id):
    """计算某设备的平均单次配方（仅上午+下午合并为日均）"""
    from collections import defaultdict
    daily = defaultdict(lambda: {k: 0.0 for k in INGREDIENT_COLS.values()})
    daily_count = defaultdict(int)

    for r in feeding_rows:
        if r["device_id"] != device_id:
            continue
        key = r["date"]
        for name, v in r["ingredients"].items():
            daily[key][name] += v
        daily_count[key] += 1

    if not daily:
        return {}

    totals = {k: 0.0 for k in INGREDIENT_COLS.values()}
    n = len(daily)
    for day_ingr in daily.values():
        for name, v in day_ingr.items():
            totals[name] += v

    return {name: round(v / n, 1) for name, v in totals.items()}


def escape_str(s):
    return s.replace("'", "''")


def build_sql(feeding_rows):
    lines = []
    lines.append("-- ============================================================")
    lines.append("-- TMR 数据库种子 SQL（基于 2021 实际耗料记录）")
    lines.append("-- 生成时间: " + str(datetime.datetime.now()))
    lines.append("-- ============================================================")
    lines.append("")
    lines.append("SET NAMES utf8mb4;")
    lines.append("SET foreign_key_checks = 0;")
    lines.append("")

    # ---- 清空旧数据 ----
    lines.append("-- 清空旧 TMR 数据（保留表结构）")
    lines.append("DELETE FROM tmr_feeding_events;")
    lines.append("DELETE FROM tmr_daily_tasks;")
    lines.append("DELETE FROM tmr_camera_roi;")
    lines.append("DELETE FROM tmr_daily_tasks;")
    lines.append("DELETE FROM tmr_feed_formulas;")
    lines.append("DELETE FROM tmr_devices;")
    lines.append("")

    # ---- 设备 ----
    lines.append("-- TMR 设备")
    devices = [
        (1, "TMR-车1（后期牛）", "后期牛", "idle"),
        (2, "TMR-车2（前期牛）", "前期牛", "idle"),
        (3, "TMR-车3（母牛）",   "母牛",  "idle"),
    ]
    for dev_id, name, _, status in devices:
        lines.append(
            f"INSERT INTO tmr_devices (id, name, status, createdAt) VALUES "
            f"({dev_id}, '{escape_str(name)}', '{status}', NOW());"
        )
    lines.append("")

    # ---- 配方 ----
    lines.append("-- TMR 饲料配方（年均配方）")
    formula_ids = {}
    for dev_id, dev_name, breed, _ in devices:
        avg = compute_avg_formula(feeding_rows, dev_id)
        if not avg:
            avg = {k: 0.0 for k in INGREDIENT_COLS.values()}

        items = [
            {"material": name, "targetWeightKg": weight}
            for name, weight in avg.items()
            if weight > 0
        ]
        items_json = json.dumps(items, ensure_ascii=False)
        fname = f"{breed}年均配方（2021）"
        formula_ids[dev_id] = dev_id
        lines.append(
            f"INSERT INTO tmr_feed_formulas (id, name, items, createdAt, updatedAt) VALUES "
            f"({dev_id}, '{escape_str(fname)}', '{escape_str(items_json)}', NOW(), NOW());"
        )
    lines.append("")

    # ---- 日任务 ----
    lines.append("-- TMR 日任务（2021 全年，3台设备）")
    all_dates = sorted({r["date"] for r in feeding_rows})
    task_id = 1
    task_map = {}  # (date, device_id) -> task_id

    for d in all_dates:
        for dev_id in [1, 2, 3]:
            formula_id = DEVICE_FORMULA[dev_id]
            date_str = d.strftime("%Y-%m-%d")
            lines.append(
                f"INSERT INTO tmr_daily_tasks (id, deviceId, taskDate, formulaId, status, createdAt, updatedAt) VALUES "
                f"({task_id}, {dev_id}, '{date_str}', {formula_id}, 'done', NOW(), NOW());"
            )
            task_map[(d, dev_id)] = task_id
            task_id += 1

    lines.append("")

    # ---- 投喂事件 ----
    lines.append("-- TMR 投喂事件（按实际耗料记录）")
    event_id = 1
    for r in sorted(feeding_rows, key=lambda x: (x["date"], x["device_id"], x["session"])):
        d = r["date"]
        dev_id = r["device_id"]
        session = r["session"]
        hour = "08:00:00" if session == "morning" else "15:00:00"
        ts = f"{d.strftime('%Y-%m-%d')} {hour}"

        for material, weight in r["ingredients"].items():
            if weight <= 0:
                continue
            lines.append(
                f"INSERT INTO tmr_feeding_events (id, deviceId, timestamp, material, weight, createdAt) VALUES "
                f"({event_id}, {dev_id}, '{ts}', '{escape_str(material)}', {weight}, NOW());"
            )
            event_id += 1

    lines.append("")
    lines.append("SET foreign_key_checks = 1;")
    lines.append("")

    # ---- 统计 ----
    lines.append("-- 验证插入结果")
    lines.append("SELECT 'tmr_devices'       AS tbl, COUNT(*) AS cnt FROM tmr_devices")
    lines.append("UNION ALL SELECT 'tmr_feed_formulas',  COUNT(*) FROM tmr_feed_formulas")
    lines.append("UNION ALL SELECT 'tmr_daily_tasks',    COUNT(*) FROM tmr_daily_tasks")
    lines.append("UNION ALL SELECT 'tmr_feeding_events', COUNT(*) FROM tmr_feeding_events;")

    return "\n".join(lines)


if __name__ == "__main__":
    # 强制 stdout/stderr 使用 UTF-8
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

    print("正在解析 Excel 数据...", file=sys.stderr)
    rows = parse_all_sheets()
    print(f"解析完成: {len(rows)} 条投喂记录", file=sys.stderr)

    dates = sorted({r["date"] for r in rows})
    print(f"日期范围: {dates[0]} ~ {dates[-1]}", file=sys.stderr)
    for dev_id in [1, 2, 3]:
        dev_rows = [r for r in rows if r["device_id"] == dev_id]
        total_kg = sum(r["total_kg"] for r in dev_rows)
        print(f"  设备{dev_id}: {len(dev_rows)} 条记录, 总计 {total_kg:,.0f} kg", file=sys.stderr)

    print("生成 SQL...", file=sys.stderr)
    sql = build_sql(rows)
    print(sql)
