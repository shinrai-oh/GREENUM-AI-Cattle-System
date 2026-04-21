#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量重命名摄像头名称前缀为指定农场名称。

将 farm_id 为 1 的摄像头名称前缀改为“广西农垦牧场1”，
将 farm_id 为 2 的摄像头名称前缀改为“广西农垦牧场2”。

重命名规则：
- 如果名称已以目标前缀开头，则跳过；
- 如果名称包含 '-'，保留第一个 '-' 之后的后缀，将前缀替换为目标前缀；
- 否则，直接在原名称前加上“目标前缀-”。

执行方式（在后端容器中）：
    python scripts/rename_camera_prefixes.py
"""

from datetime import datetime

import os
import sys

# 将项目根目录加入模块搜索路径
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
# 在容器中，项目根目录通常为 /app
DEFAULT_CONTAINER_ROOT = "/app"

for candidate in [PROJECT_ROOT, DEFAULT_CONTAINER_ROOT]:
    if candidate and candidate not in sys.path and os.path.isdir(candidate):
        sys.path.insert(0, candidate)

from sqlalchemy import create_engine, text

# 数据库连接字符串（优先使用容器环境变量）
DATABASE_URL = os.environ.get('DATABASE_URL') or \
    'mysql+pymysql://cattle_user:cattle_pass@mysql:3306/cattle_monitoring?charset=utf8mb4'


PREFIX_MAPPING = {
    1: "广西农垦牧场1",
    2: "广西农垦牧场2",
}


def build_new_name(old_name: str, target_prefix: str) -> str:
    if not old_name:
        return target_prefix
    # 已是目标前缀，直接返回
    if old_name.startswith(target_prefix):
        return old_name
    # 存在分隔符，替换前缀，保留后缀
    if '-' in old_name:
        suffix = old_name.split('-', 1)[1]
        return f"{target_prefix}-{suffix}"
    # 无分隔符，添加前缀
    return f"{target_prefix}-{old_name}"


def rename_all():
    """使用原生SQL在数据库中批量更新摄像头名称前缀"""
    engine = create_engine(DATABASE_URL)
    total_updated = 0

    with engine.connect() as conn:
        for farm_id, prefix in PREFIX_MAPPING.items():
            # 将前缀规范化到“prefix-后缀”，后缀为原名称第一个'-'之后的部分或原名称
            sql = text(
                """
                UPDATE cameras
                SET name = CONCAT(:prefix, '-',
                    CASE WHEN LOCATE('-', name) > 0 THEN SUBSTRING(name, LOCATE('-', name) + 1)
                         ELSE name END
                ),
                    updated_at = NOW()
                WHERE farm_id = :farm_id
                  AND name NOT LIKE CONCAT(:prefix, '-%');
                """
            )
            result = conn.execute(sql, { 'prefix': prefix, 'farm_id': farm_id })
            conn.commit()
            affected = result.rowcount if hasattr(result, 'rowcount') else 0
            print(f"Farm {farm_id} -> '{prefix}' 更新行数: {affected}")
            total_updated += affected

    print(f"\n总计更新摄像头数量：{total_updated}")


if __name__ == "__main__":
    rename_all()
