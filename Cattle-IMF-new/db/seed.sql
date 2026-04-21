-- Seed data for cattle_imf (comprehensive time-series measurements for trend charts)
USE `cattle_imf`;

-- Users
INSERT IGNORE INTO `users` (`username`, `password_hash`, `role`) VALUES
  ('admin',    '$2a$10$Q7Ue1aGmWcseGZnV5QvI6u3J3nN0fWcCzUuG7Y4K1fR4zWc8HcKDa', 'admin'),
  ('operator', '$2a$10$Q7Ue1aGmWcseGZnV5QvI6u3J3nN0fWcCzUuG7Y4K1fR4zWc8HcKDa', 'operator');

-- Groups
INSERT IGNORE INTO `cattle_groups` (`id`,`group_name`,`description`) VALUES
  (1,'育肥A组',   '高能量饲喂'),
  (2,'后备母牛群','维持饲喂'),
  (3,'试验C组',   '不同配方对比'),
  (4,'草饲D组',   '草饲为主');

-- Profiles
INSERT IGNORE INTO `cattle_profiles` (`id`,`ear_tag_id`,`birth_date`,`breed`,`sex`,`sire_ear_tag_id`,`dam_ear_tag_id`,`group_id`) VALUES
  ( 1,'E1001','2023-03-05','西门塔尔',   'male',  'S001','D001',1),
  ( 2,'E1002','2023-02-21','安格斯',     'female','S002','D002',2),
  ( 3,'E1003','2022-12-10','安格斯',     'male',  'S003','D003',1),
  ( 4,'E1004','2023-01-12','含安格斯杂交','female','S004','D004',3),
  ( 5,'E1005','2022-11-03','夏洛来',     'male',  'S005','D005',4),
  ( 6,'E1006','2023-04-18','西门塔尔',   'female','S006','D006',1),
  ( 7,'E1007','2023-05-02','安格斯',     'female','S007','D007',2),
  ( 8,'E1008','2022-10-26','利木赞',     'male',  'S008','D008',3),
  ( 9,'E1009','2023-06-30','海福特',     'male',  'S009','D009',4),
  (10,'E1010','2023-07-14','安格斯',     'female','S010','D010',1);

-- Measurements (multiple time points per animal for trend charts)
INSERT IGNORE INTO `measurements`
  (`cattle_profile_id`,`user_id`,`measurement_date`,`backfat_thickness`,`ribeye_area`,`intramuscular_fat_imf`,`ribeye_height`,`ribeye_width`,`notes`,`simulated_grade`)
VALUES
  -- E1001 西门塔尔 male 育肥A组
  (1,2,'2025-03-01 10:00:00',2.2,75.0,2.0,6.8,10.2,'IMG-001-M1',calculate_mock_grade(2.0)),
  (1,2,'2025-04-01 10:00:00',2.5,77.5,2.5,6.9,10.5,'IMG-001-M2',calculate_mock_grade(2.5)),
  (1,2,'2025-05-01 10:00:00',2.8,80.0,3.0,7.0,10.7,'IMG-001-M3',calculate_mock_grade(3.0)),
  (1,2,'2025-06-01 10:00:00',3.0,82.5,3.5,7.2,10.9,'IMG-001-M4',calculate_mock_grade(3.5)),
  (1,2,'2025-07-01 10:00:00',3.3,85.0,4.0,7.4,11.0,'IMG-001-M5',calculate_mock_grade(4.0)),
  (1,2,'2025-08-01 10:00:00',3.6,87.0,4.4,7.5,11.1,'IMG-001-M6',calculate_mock_grade(4.4)),
  (1,2,'2025-09-01 10:00:00',3.8,88.5,4.8,7.7,11.2,'IMG-001-M7',calculate_mock_grade(4.8)),
  (1,2,'2025-10-01 10:00:00',4.0,90.0,5.3,7.8,11.4,'IMG-001-M8',calculate_mock_grade(5.3)),
  -- E1002 安格斯 female 后备母牛群
  (2,2,'2025-03-05 10:00:00',1.5,70.0,1.6,6.4, 9.8,'IMG-002-M1',calculate_mock_grade(1.6)),
  (2,2,'2025-04-05 10:00:00',1.7,71.5,1.9,6.5, 9.9,'IMG-002-M2',calculate_mock_grade(1.9)),
  (2,2,'2025-05-05 10:00:00',1.8,73.0,2.2,6.6,10.0,'IMG-002-M3',calculate_mock_grade(2.2)),
  (2,2,'2025-06-05 10:00:00',2.0,74.5,2.5,6.7,10.1,'IMG-002-M4',calculate_mock_grade(2.5)),
  (2,2,'2025-07-05 10:00:00',2.1,75.5,2.8,6.8,10.2,'IMG-002-M5',calculate_mock_grade(2.8)),
  (2,2,'2025-08-05 10:00:00',2.2,76.5,3.0,6.9,10.3,'IMG-002-M6',calculate_mock_grade(3.0)),
  (2,2,'2025-09-05 10:00:00',2.3,77.0,3.2,7.0,10.4,'IMG-002-M7',calculate_mock_grade(3.2)),
  (2,2,'2025-10-05 10:00:00',2.4,78.0,3.5,7.1,10.5,'IMG-002-M8',calculate_mock_grade(3.5)),
  -- E1003 安格斯 male 育肥A组
  (3,2,'2025-03-01 10:00:00',3.5,82.0,3.8,7.5,11.0,'IMG-003-M1',calculate_mock_grade(3.8)),
  (3,2,'2025-04-01 10:00:00',3.9,85.0,4.3,7.7,11.3,'IMG-003-M2',calculate_mock_grade(4.3)),
  (3,2,'2025-05-01 10:00:00',4.2,87.5,4.8,7.9,11.6,'IMG-003-M3',calculate_mock_grade(4.8)),
  (3,2,'2025-06-01 10:00:00',4.5,90.0,5.3,8.0,11.9,'IMG-003-M4',calculate_mock_grade(5.3)),
  (3,2,'2025-07-01 10:00:00',4.7,91.5,5.8,8.1,12.0,'IMG-003-M5',calculate_mock_grade(5.8)),
  (3,2,'2025-08-20 10:00:00',5.0,93.0,6.2,8.2,12.2,'IMG-003-M6',calculate_mock_grade(6.2)),
  (3,2,'2025-09-20 10:00:00',5.2,94.5,6.6,8.3,12.4,'IMG-003-M7',calculate_mock_grade(6.6)),
  (3,2,'2025-10-20 10:00:00',5.5,96.0,7.0,8.4,12.6,'IMG-003-M8',calculate_mock_grade(7.0)),
  -- E1004 含安格斯杂交 female 试验C组
  (4,2,'2025-03-01 10:00:00',2.0,72.0,2.2,6.5,10.0,'IMG-004-M1',calculate_mock_grade(2.2)),
  (4,2,'2025-05-01 10:00:00',2.3,74.5,2.7,6.7,10.3,'IMG-004-M2',calculate_mock_grade(2.7)),
  (4,2,'2025-07-15 10:00:00',2.7,78.0,3.2,7.0,10.7,'IMG-004-M3',calculate_mock_grade(3.2)),
  (4,2,'2025-09-16 10:00:00',3.0,81.0,3.6,7.2,11.0,'IMG-004-M4',calculate_mock_grade(3.6)),
  (4,2,'2025-10-16 10:00:00',3.2,83.0,4.0,7.3,11.2,'IMG-004-M5',calculate_mock_grade(4.0)),
  -- E1005 夏洛来 male 草饲D组
  (5,2,'2025-03-01 10:00:00',3.8,86.0,4.2,7.8,11.5,'IMG-005-M1',calculate_mock_grade(4.2)),
  (5,2,'2025-05-01 10:00:00',4.2,89.0,4.8,8.0,11.8,'IMG-005-M2',calculate_mock_grade(4.8)),
  (5,2,'2025-07-01 10:00:00',4.6,92.0,5.4,8.2,12.1,'IMG-005-M3',calculate_mock_grade(5.4)),
  (5,2,'2025-08-01 10:00:00',4.8,93.5,5.8,8.3,12.3,'IMG-005-M4',calculate_mock_grade(5.8)),
  (5,2,'2025-09-01 10:00:00',5.0,95.0,6.2,8.4,12.5,'IMG-005-M5',calculate_mock_grade(6.2)),
  -- E1006 西门塔尔 female 育肥A组
  (6,2,'2025-04-01 10:00:00',1.6,70.0,1.5,6.3, 9.8,'IMG-006-M1',calculate_mock_grade(1.5)),
  (6,2,'2025-06-01 10:00:00',1.8,72.0,2.0,6.5,10.0,'IMG-006-M2',calculate_mock_grade(2.0)),
  (6,2,'2025-08-01 10:00:00',2.0,74.5,2.5,6.7,10.2,'IMG-006-M3',calculate_mock_grade(2.5)),
  (6,2,'2025-09-22 10:00:00',2.2,76.0,2.8,6.8,10.4,'IMG-006-M4',calculate_mock_grade(2.8)),
  (6,2,'2025-10-22 10:00:00',2.5,78.0,3.2,7.0,10.6,'IMG-006-M5',calculate_mock_grade(3.2)),
  -- E1007 安格斯 female 后备母牛群
  (7,2,'2025-04-01 10:00:00',2.5,76.0,2.8,7.0,10.5,'IMG-007-M1',calculate_mock_grade(2.8)),
  (7,2,'2025-06-01 10:00:00',2.9,79.0,3.4,7.2,10.8,'IMG-007-M2',calculate_mock_grade(3.4)),
  (7,2,'2025-08-01 10:00:00',3.2,82.0,3.9,7.4,11.0,'IMG-007-M3',calculate_mock_grade(3.9)),
  (7,2,'2025-09-28 10:00:00',3.5,85.0,4.3,7.5,11.2,'IMG-007-M4',calculate_mock_grade(4.3)),
  (7,2,'2025-10-28 10:00:00',3.8,87.0,4.7,7.7,11.5,'IMG-007-M5',calculate_mock_grade(4.7)),
  -- E1008 利木赞 male 试验C组
  (8,2,'2025-04-01 10:00:00',3.0,82.0,3.5,7.5,11.0,'IMG-008-M1',calculate_mock_grade(3.5)),
  (8,2,'2025-06-01 10:00:00',3.4,85.0,4.2,7.7,11.3,'IMG-008-M2',calculate_mock_grade(4.2)),
  (8,2,'2025-07-03 10:00:00',3.7,88.0,4.7,7.9,11.7,'IMG-008-M3',calculate_mock_grade(4.7)),
  (8,2,'2025-09-03 10:00:00',4.0,91.0,5.2,8.0,12.0,'IMG-008-M4',calculate_mock_grade(5.2)),
  (8,2,'2025-10-03 10:00:00',4.3,93.0,5.7,8.2,12.2,'IMG-008-M5',calculate_mock_grade(5.7)),
  -- E1009 海福特 male 草饲D组
  (9,2,'2025-05-01 10:00:00',1.8,72.0,2.1,6.6,10.1,'IMG-009-M1',calculate_mock_grade(2.1)),
  (9,2,'2025-07-01 10:00:00',2.1,75.0,2.6,6.8,10.4,'IMG-009-M2',calculate_mock_grade(2.6)),
  (9,2,'2025-09-01 10:00:00',2.3,77.5,3.1,7.0,10.7,'IMG-009-M3',calculate_mock_grade(3.1)),
  (9,2,'2025-10-02 10:00:00',2.5,79.0,3.4,7.1,10.9,'IMG-009-M4',calculate_mock_grade(3.4)),
  -- E1010 安格斯 female 育肥A组
  (10,2,'2025-04-01 10:00:00',2.2,74.0,2.6,6.8,10.3,'IMG-010-M1',calculate_mock_grade(2.6)),
  (10,2,'2025-06-01 10:00:00',2.6,77.5,3.2,7.1,10.6,'IMG-010-M2',calculate_mock_grade(3.2)),
  (10,2,'2025-08-01 10:00:00',3.0,81.0,3.8,7.3,10.9,'IMG-010-M3',calculate_mock_grade(3.8)),
  (10,2,'2025-10-03 10:00:00',3.3,84.0,4.2,7.5,11.1,'IMG-010-M4',calculate_mock_grade(4.2));
