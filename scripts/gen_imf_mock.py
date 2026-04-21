#!/usr/bin/env python3
"""
生成 IMF 测量 Mock 数据
为所有没有 IMF 测量记录的牛只，按品种规律推算 4-6 个月度测量时间点，
输出 MySQL INSERT 语句写入 imf_measurements 表。
"""
import sys
import math

# ──────────────────────────────────────────────────────────────────────────────
# 每种品种×性别的基础参数:
#   base_imf  : 起始 IMF%
#   slope     : 每个时间步的 IMF 增量
#   bf_base   : 起始背膘(mm)
#   bf_slope  : 背膘每步增量
#   area_base : 起始眼肌面积(cm²)
#   area_slope: 眼肌面积每步增量
#   h_base    : 眼肌高度(cm)
#   w_base    : 眼肌宽度(cm)
# ──────────────────────────────────────────────────────────────────────────────
BREED_PARAMS = {
    # breed_key (breed, gender) → (base_imf, slope, bf_base, bf_slope, area_base, area_slope, h_base, w_base)
    ('安格斯',         'M'): (3.8, 0.44, 3.5, 0.22, 84.0, 2.4, 7.7, 11.4),
    ('夏洛来',         'M'): (3.6, 0.40, 3.4, 0.20, 82.0, 2.2, 7.5, 11.2),
    ('利木赞',         'M'): (3.0, 0.36, 3.0, 0.18, 80.0, 2.0, 7.4, 11.0),
    ('西门塔尔',       'M'): (2.0, 0.30, 2.2, 0.16, 75.0, 1.8, 7.0, 10.5),
    ('西门塔尔杂交',   'M'): (1.8, 0.28, 2.0, 0.15, 72.0, 1.7, 6.8, 10.2),
    ('本地黄牛',       'M'): (1.6, 0.22, 1.8, 0.12, 68.0, 1.4, 6.5,  9.8),
    ('三景外购育肥牛', 'M'): (2.4, 0.32, 2.4, 0.17, 76.0, 1.9, 7.1, 10.6),
    ('安格斯',         'F'): (1.8, 0.22, 1.7, 0.10, 70.0, 1.2, 6.5,  9.7),
    ('西门塔尔',       'F'): (1.4, 0.18, 1.5, 0.09, 67.0, 1.1, 6.2,  9.4),
    ('西门塔尔杂交',   'F'): (1.5, 0.20, 1.6, 0.10, 68.0, 1.1, 6.3,  9.5),
    ('含安格斯杂交',   'F'): (1.9, 0.22, 1.9, 0.11, 71.0, 1.2, 6.5,  9.8),
    ('本地黄牛',       'F'): (1.3, 0.16, 1.4, 0.08, 64.0, 1.0, 6.0,  9.2),
}
DEFAULT_M = (1.8, 0.26, 2.0, 0.14, 72.0, 1.6, 6.8, 10.2)
DEFAULT_F = (1.5, 0.18, 1.6, 0.09, 67.0, 1.1, 6.2,  9.4)

# 测量时间点：从 2025-03-01 起，每 2 个月一次，共 5 个点
DATES = [
    '2025-03-01', '2025-05-01', '2025-07-01',
    '2025-09-01', '2025-10-15',
]

def grade(imf):
    if imf >= 6.0: return 'Prime+ (A5)'
    if imf >= 4.5: return 'Prime (A4)'
    if imf >= 3.0: return 'Choice+ (A3)'
    if imf >= 2.0: return 'Choice (A2)'
    return 'Standard'

def var(seed, scale=1.0):
    """基于整数 seed 产生 [-scale, +scale] 之间的伪随机微扰，避免引入 random 模块"""
    v = math.sin(seed * 127.1 + 311.7) * scale
    return round(v, 2)

def generate(cattle_id, breed, gender, user_id=1):
    key = (breed, gender)
    p = BREED_PARAMS.get(key, DEFAULT_M if gender == 'M' else DEFAULT_F)
    base_imf, slope, bf_base, bf_slope, area_base, area_slope, h_base, w_base = p

    rows = []
    for i, date in enumerate(DATES):
        v = var(cattle_id * 7 + i * 31)          # 微扰种子
        imf  = round(max(0.5, base_imf + slope * i + v * 0.3), 2)
        bf   = round(max(0.5, bf_base  + bf_slope * i + v * 0.15), 2)
        area = round(max(30,  area_base + area_slope * i + v * 1.5), 1)
        h    = round(max(4.0, h_base + 0.05 * i + v * 0.05), 1)
        w    = round(max(6.0, w_base + 0.06 * i + v * 0.06), 1)
        g    = grade(imf)
        rows.append(
            f"({cattle_id},{user_id},'{date}',{bf},{area},{imf},{h},{w},'{g}','auto-mock',NOW())"
        )
    return rows

# ── 读取标准输入（cattle list：id\tbreed\tgender）──────────────────────────────
lines = [l.strip() for l in sys.stdin if l.strip()]
all_rows = []
for line in lines:
    parts = line.split('\t')
    if len(parts) < 3:
        continue
    cid, breed, gender = int(parts[0]), parts[1].strip(), parts[2].strip()
    all_rows.extend(generate(cid, breed, gender))

# 分批输出 INSERT（每批 200 行，防止单条 SQL 过大）
BATCH = 200
cols = "(cattleId,userId,measurementDate,backfatThickness,ribeyeArea,intramuscularFatImf,ribeyeHeight,ribeyeWidth,simulatedGrade,notes,createdAt)"
for i in range(0, len(all_rows), BATCH):
    chunk = all_rows[i:i+BATCH]
    print(f"INSERT INTO imf_measurements {cols} VALUES")
    print(',\n'.join(chunk) + ';')

print(f"-- {len(all_rows)} rows generated for {len(lines)} cattle")
