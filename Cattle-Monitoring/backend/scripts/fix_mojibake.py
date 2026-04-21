"""
批量检测并修复数据库中因错误编码（如 double-encoded UTF-8）导致的乱码问题 (mojibake)。

该脚本会遍历指定的表和列，识别出实际字节长度与字符长度不匹配的文本，
并尝试使用 `latin1 -> binary -> utf8mb4` 的方式进行修复。

适用于修复 "绿姆山牛业养殖场" 被存成 "ç»¿å§†å±±ç‰›ä¸šå…»æ®–åœº" 的情况。
"""

import os
import sys
from sqlalchemy import create_engine, text, exc
from typing import Optional
import re

# 将项目根目录添加到Python路径，以便导入config
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
sys.path.append(project_root)

# 从环境变量或默认配置中获取数据库连接信息
DATABASE_URL = os.environ.get('DATABASE_URL') or \
    'mysql+pymysql://cattle_user:cattle_pass@mysql:3306/cattle_monitoring?charset=utf8mb4'

# 定义需要检查的表和文本列
# 格式: (table_name, primary_key_column, text_column_to_fix)
TABLES_AND_COLUMNS_TO_CHECK = [
    ('farms', 'id', 'name'),
    ('farms', 'id', 'address'),
    ('farms', 'id', 'contact_person'),
    ('cameras', 'id', 'name'),
    ('cameras', 'id', 'location'),
    ('pens', 'id', 'pen_number'), 
    ('cattle', 'id', 'breed'),
]

def connect_to_db():
    """创建并返回数据库引擎"""
    try:
        engine = create_engine(DATABASE_URL, echo=False)
        with engine.connect() as connection:
            print("✅ 数据库连接成功！")
            return engine
    except exc.SQLAlchemyError as e:
        print(f"❌ 数据库连接失败: {e}")
        sys.exit(1)

def _contains_cjk(s: str) -> bool:
    """检测字符串中是否包含中日韩统一表意文字"""
    for ch in s:
        code = ord(ch)
        if 0x4E00 <= code <= 0x9FFF or 0x3400 <= code <= 0x4DBF:
            return True
    return False


_SUSPICIOUS_CHARS = set("ÃÂäåæçèéêëìíîïñòóôõöøùúûüýÿœšž™—–…‰«»¢£¥©®±¼½¾¿··")


def _looks_mojibake(s: str) -> bool:
    """判断文本是否疑似 mojibake（UTF-8 被误作 Latin-1 再编码）"""
    if not s:
        return False
    suspicious = sum(1 for ch in s if ch in _SUSPICIOUS_CHARS)
    # 存在较多可疑字符 且 原文基本不含 CJK
    return suspicious >= max(2, len(s) // 8) and not _contains_cjk(s)


def _attempt_fix_text(s: str) -> Optional[str]:
    """尝试用 latin1->utf8 的方式修复，如果结果合理（含CJK且更干净）则返回"""
    try:
        fixed = s.encode('latin1').decode('utf-8')
    except Exception:
        return None
    # 修复后应包含 CJK，且修复后不再明显像 mojibake
    if _contains_cjk(fixed) and not _looks_mojibake(fixed):
        return fixed
    return None


def fix_mojibake(engine):
    """检测并修复所有指定表中的乱码（更稳健的检测与单列事务）"""
    total_fixed_count = 0

    # 仅筛选疑似乱码的候选行，避免误伤正常中文
    regex_pattern = "[ÃÂäåæçèéêëìíîïñòóôõöøùúûüýÿœšž™—–…‰«»¢£¥©®±¼½¾¿]"

    for table, pk_col, text_col in TABLES_AND_COLUMNS_TO_CHECK:
        try:
            print(f"\n🔍 正在检查表 '{table}', 列 '{text_col}'...")

            # 先取出候选行（包含明显 mojibake 特征的字符）
            with engine.connect() as read_conn:
                find_query = text(
                    f"""
                    SELECT {pk_col}, {text_col}
                    FROM {table}
                    WHERE {text_col} IS NOT NULL
                      AND {text_col} <> ''
                      AND {text_col} REGEXP :pattern
                    """
                )
                candidates = read_conn.execute(find_query, {"pattern": regex_pattern}).fetchall()

            if not candidates:
                print(f"  -> 🟢 在 '{table}.{text_col}' 中未发现需要修复的数据。")
                continue

            print(f"  -> 🟡 在 '{table}.{text_col}' 中发现 {len(candidates)} 条候选。将进行逐条校验与修复…")

            fixed_in_column = 0
            samples_printed = 0

            # 为避免嵌套事务，使用独立的 begin() 上下文管理单列修复
            with engine.begin() as write_conn:
                for pk_value, old_text in candidates:
                    if not old_text:
                        continue
                    if not _looks_mojibake(old_text):
                        continue
                    new_text = _attempt_fix_text(old_text)
                    if not new_text or new_text == old_text:
                        continue

                    update_sql = text(
                        f"""
                        UPDATE {table}
                        SET {text_col} = :new_text
                        WHERE {pk_col} = :pk_value AND {text_col} = :old_text
                        """
                    )
                    res = write_conn.execute(update_sql, {
                        "new_text": new_text,
                        "pk_value": pk_value,
                        "old_text": old_text,
                    })
                    if res.rowcount:
                        fixed_in_column += 1
                        if samples_printed < 5:
                            print(f"    - ID {pk_value}: 修复成功 | 旧: '{old_text[:20]}...' -> 新: '{new_text}'")
                            samples_printed += 1

            if fixed_in_column > 0:
                total_fixed_count += fixed_in_column
                print(f"  -> ✅ 在 '{table}.{text_col}' 中成功修复 {fixed_in_column} 条数据。")
            else:
                print(f"  -> 🟢 '{table}.{text_col}' 无需修复或未匹配到有效修复。")

            # 若仍有可疑文本未被逐条 Python 修复，尝试一次性 DB 级修复兜底（仅限可疑行）
            with engine.begin() as fallback_conn:
                # 使用 HEX 比较避免不同校对规则(collation)导致的比较错误
                fallback_update = text(
                    f"""
                    UPDATE {table}
                    SET {text_col} = CONVERT(CAST(CONVERT({text_col} USING latin1) AS BINARY) USING utf8mb4)
                    WHERE {text_col} IS NOT NULL
                      AND {text_col} <> ''
                      AND {text_col} REGEXP :pattern
                      AND HEX(CONVERT(CAST(CONVERT({text_col} USING latin1) AS BINARY) USING utf8mb4)) <> HEX({text_col})
                    """
                )
                fb_res = fallback_conn.execute(fallback_update, {"pattern": regex_pattern})
                if fb_res.rowcount:
                    total_fixed_count += fb_res.rowcount
                    print(f"  -> ✅ 兜底修复：'{table}.{text_col}' 额外修复 {fb_res.rowcount} 条。")

        except exc.SQLAlchemyError as e:
            print(f"  -> ❌ 处理 '{table}.{text_col}' 时发生数据库错误: {e}")
        except Exception as e:
            print(f"  -> ❌ 处理 '{table}.{text_col}' 时发生未知错误: {e}")

    print(f"\n🎉 修复完成！总共修复了 {total_fixed_count} 条数据。")

if __name__ == '__main__':
    db_engine = connect_to_db()
    if db_engine:
        fix_mojibake(db_engine)
