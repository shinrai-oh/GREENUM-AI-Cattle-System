-- Seed basic data for cattle_imf
USE `cattle_imf`;

-- Users
INSERT INTO `users` (`username`, `password_hash`, `role`) VALUES
  ('admin', '$2a$10$Q7Ue1aGmWcseGZnV5QvI6u3J3nN0fWcCzUuG7Y4K1fR4zWc8HcKDa', 'admin'), -- bcrypt hash placeholder
  ('operator', '$2a$10$Q7Ue1aGmWcseGZnV5QvI6u3J3nN0fWcCzUuG7Y4K1fR4zWc8HcKDa', 'operator');

-- Groups
INSERT INTO `cattle_groups` (`id`,`group_name`,`description`) VALUES
  (1,'育肥A组','高能量饲喂'),
  (2,'后备母牛群','维持饲喂');

-- Profiles
INSERT INTO `cattle_profiles` (`id`,`ear_tag_id`,`birth_date`,`breed`,`sex`,`sire_ear_tag_id`,`dam_ear_tag_id`,`group_id`) VALUES
  (1,'E1001','2023-03-05','西门塔尔','male','S001','D001',1),
  (2,'E1002','2023-02-21','安格斯','female','S002','D002',2),
  (3,'E1003','2022-12-10','安格斯','male','S003','D003',1);

-- Measurements (using helper function for simulated_grade)
INSERT INTO `measurements` (`cattle_profile_id`,`user_id`,`measurement_date`,`backfat_thickness`,`ribeye_area`,`intramuscular_fat_imf`,`ribeye_height`,`ribeye_width`,`notes`,`simulated_grade`) VALUES
  (1, 2, '2025-09-01 10:00:00', 3.20, 85.40, 3.50, 7.40, 11.20, 'IMG-001', calculate_mock_grade(3.50)),
  (1, 2, '2025-10-01 10:00:00', 3.80, 88.00, 4.60, 7.60, 11.30, 'IMG-002', calculate_mock_grade(4.60)),
  (2, 2, '2025-09-05 10:00:00', 2.10, 76.20, 2.30, 6.80, 10.10, 'IMG-003', calculate_mock_grade(2.30)),
  (3, 2, '2025-08-20 10:00:00', 4.90, 92.10, 6.10, 8.10, 12.20, 'IMG-004', calculate_mock_grade(6.10));

