-- =============================================================
-- 数据迁移脚本: 从三个旧系统迁移到统一数据库 cattle_unified
-- 执行顺序: 先确保 cattle_unified 数据库已由 Prisma 初始化
-- 执行环境: MySQL 客户端，连接到同一个 MySQL 实例
-- =============================================================

-- ========================
-- 第一步: 从 Cattle-Monitoring 迁移公共数据 (养殖场、栏位、摄像头、牛只)
-- 源数据库: cattle_monitoring
-- ========================

USE cattle_unified;

-- 1.1 迁移养殖场
INSERT IGNORE INTO shared_farms (id, name, address, contact_person, contact_phone, created_at, updated_at)
SELECT id, name, address, contact_person, contact_phone, created_at, updated_at
FROM cattle_monitoring.farms;

-- 1.2 迁移栏位
INSERT IGNORE INTO shared_pens (id, farm_id, pen_number, capacity, current_count)
SELECT id, farm_id, pen_number, capacity, current_count
FROM cattle_monitoring.pens;

-- 1.3 迁移摄像头
INSERT IGNORE INTO shared_cameras (id, name, rtsp_url, location, farm_id, pen_id, status, created_at, updated_at)
SELECT id, name, rtsp_url, location, farm_id, pen_id, status, created_at, updated_at
FROM cattle_monitoring.cameras;

-- 1.4 迁移牛只 (注意字段映射: ear_tag -> ear_tag)
INSERT IGNORE INTO shared_cattle (id, ear_tag, farm_id, pen_id, breed, birth_date, gender, weight, status, created_at, updated_at)
SELECT id, ear_tag, farm_id, pen_id, breed, birth_date, gender, weight, status, created_at, updated_at
FROM cattle_monitoring.cattle;

-- 1.5 迁移行为数据
INSERT IGNORE INTO monitor_behavior_data (id, cattle_id, pen_id, behavior_type, start_time, end_time, duration, camera_id, confidence, created_at)
SELECT id, cattle_id, pen_id, behavior_type, start_time, end_time, duration, camera_id, confidence, created_at
FROM cattle_monitoring.behavior_data;

-- 1.6 迁移日统计
INSERT IGNORE INTO monitor_daily_statistics (id, cattle_id, stat_date, eating_time, standing_time, lying_time, walking_time, drinking_time, total_active_time)
SELECT id, cattle_id, stat_date, eating_time, standing_time, lying_time, walking_time, drinking_time, total_active_time
FROM cattle_monitoring.daily_statistics;

-- ========================
-- 第二步: 从 Cattle-IMF-new 迁移 IMF 特有数据
-- 源数据库: 如果原系统使用 MySQL，源库名需根据实际调整
-- 注意: IMF 原系统可能使用 SQLite，需先导出为 SQL
-- ========================

-- 2.1 迁移用户 (注意: 需先迁移用户，因为 imf_measurements 依赖 shared_users)
-- 假设 IMF 用户表名为 users，密码字段为 password_hash
-- INSERT IGNORE INTO shared_users (username, password_hash, role, created_at, updated_at)
-- SELECT username, password_hash, role, created_at, updated_at
-- FROM cattle_imf.users;

-- 2.2 迁移 IMF 牛只分组
-- INSERT IGNORE INTO imf_cattle_groups (id, group_name, description, created_at)
-- SELECT id, group_name, description, created_at
-- FROM cattle_imf.cattle_groups;

-- 2.3 迁移 IMF 牛只 (Cattle-IMF 使用 ear_tag_id 字段)
-- INSERT IGNORE INTO shared_cattle (ear_tag, breed, birth_date, gender, imf_group_id, created_at, updated_at)
-- SELECT ear_tag_id, breed, birth_date, sex, group_id, created_at, updated_at
-- FROM cattle_imf.cattle_profiles
-- ON DUPLICATE KEY UPDATE imf_group_id = VALUES(imf_group_id);

-- 2.4 迁移 IMF 测量数据
-- INSERT IGNORE INTO imf_measurements (cattle_id, user_id, measurement_date, backfat_thickness, ribeye_area, intramuscular_fat_imf, ribeye_height, ribeye_width, simulated_grade, notes, created_at)
-- SELECT sc.id, m.user_id, m.measurement_date, m.backfat_thickness, m.ribeye_area, m.intramuscular_fat_imf, m.ribeye_height, m.ribeye_width, m.simulated_grade, m.notes, m.created_at
-- FROM cattle_imf.measurements m
-- JOIN shared_cattle sc ON sc.ear_tag = m.cattle_ear_tag_id;

-- ========================
-- 第三步: 从 TMR Monitoring 迁移 TMR 特有数据
-- 源数据库: SQLite (tmr.db)，需先通过工具转换为 MySQL
-- 工具推荐: sqlite3 tmr.db .dump | sed 's/INTEGER PRIMARY KEY/INT AUTO_INCREMENT PRIMARY KEY/g' > tmr_dump.sql
-- ========================

-- 3.1 迁移 TMR 设备
-- INSERT IGNORE INTO tmr_devices (id, name, camera_ip, status, created_at)
-- SELECT id, name, camera_ip, status, CURRENT_TIMESTAMP
-- FROM tmr_source.TMR_Device;

-- 3.2 迁移 ROI 配置
-- INSERT IGNORE INTO tmr_camera_roi (device_id, roi1, roi2, updated_at)
-- SELECT device_id, roi1, roi2, updated_at
-- FROM tmr_source.Camera_ROI;

-- 3.3 迁移饲料配方
-- INSERT IGNORE INTO tmr_feed_formulas (id, name, items, created_at, updated_at)
-- SELECT id, name, items, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
-- FROM tmr_source.Feed_Formula;

-- 3.4 迁移日任务
-- INSERT IGNORE INTO tmr_daily_tasks (device_id, task_date, formula_id, status, created_at, updated_at)
-- SELECT device_id, date, formula_id, status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
-- FROM tmr_source.Daily_Task;

-- 3.5 迁移投喂事件
-- INSERT IGNORE INTO tmr_feeding_events (device_id, timestamp, material, weight, snapshot_path, created_at)
-- SELECT device_id, ts, material, weight, snapshot_path, CURRENT_TIMESTAMP
-- FROM tmr_source.Feeding_Event;

-- ========================
-- 验证迁移结果
-- ========================
SELECT '=== 迁移结果验证 ===' AS info;
SELECT 'shared_users' AS table_name, COUNT(*) AS row_count FROM shared_users
UNION ALL SELECT 'shared_farms', COUNT(*) FROM shared_farms
UNION ALL SELECT 'shared_pens', COUNT(*) FROM shared_pens
UNION ALL SELECT 'shared_cattle', COUNT(*) FROM shared_cattle
UNION ALL SELECT 'shared_cameras', COUNT(*) FROM shared_cameras
UNION ALL SELECT 'imf_cattle_groups', COUNT(*) FROM imf_cattle_groups
UNION ALL SELECT 'imf_measurements', COUNT(*) FROM imf_measurements
UNION ALL SELECT 'monitor_behavior_data', COUNT(*) FROM monitor_behavior_data
UNION ALL SELECT 'monitor_daily_statistics', COUNT(*) FROM monitor_daily_statistics
UNION ALL SELECT 'tmr_devices', COUNT(*) FROM tmr_devices
UNION ALL SELECT 'tmr_feed_formulas', COUNT(*) FROM tmr_feed_formulas
UNION ALL SELECT 'tmr_daily_tasks', COUNT(*) FROM tmr_daily_tasks
UNION ALL SELECT 'tmr_feeding_events', COUNT(*) FROM tmr_feeding_events;
