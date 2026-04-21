-- MySQL DDL for PRD V1.0

CREATE DATABASE IF NOT EXISTS `cattle_imf` DEFAULT CHARACTER SET utf8mb4;
USE `cattle_imf`;

-- Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(255) UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','manager','operator') NOT NULL
) ENGINE=InnoDB;

-- Groups
CREATE TABLE IF NOT EXISTS `cattle_groups` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `group_name` VARCHAR(255) NOT NULL,
  `description` TEXT
) ENGINE=InnoDB;

-- Profiles
CREATE TABLE IF NOT EXISTS `cattle_profiles` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `ear_tag_id` VARCHAR(255) UNIQUE NOT NULL,
  `birth_date` DATE,
  `breed` VARCHAR(255),
  `sex` ENUM('male','female'),
  `sire_ear_tag_id` VARCHAR(255),
  `dam_ear_tag_id` VARCHAR(255),
  `group_id` INT,
  CONSTRAINT `fk_profiles_group` FOREIGN KEY (`group_id`) REFERENCES `cattle_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Measurements
CREATE TABLE IF NOT EXISTS `measurements` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `cattle_profile_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `measurement_date` DATETIME NOT NULL,
  `backfat_thickness` DECIMAL(5,2),
  `ribeye_area` DECIMAL(5,2),
  `intramuscular_fat_imf` DECIMAL(5,2),
  `ribeye_height` DECIMAL(5,2),
  `ribeye_width` DECIMAL(5,2),
  `notes` TEXT,
  `simulated_grade` VARCHAR(32),
  CONSTRAINT `fk_measurements_cattle` FOREIGN KEY (`cattle_profile_id`) REFERENCES `cattle_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_measurements_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Mock grade function (optional helper)
DELIMITER $$
DROP FUNCTION IF EXISTS `calculate_mock_grade`$$
CREATE FUNCTION `calculate_mock_grade`(imf DECIMAL(5,2)) RETURNS VARCHAR(32)
BEGIN
  IF imf IS NULL THEN RETURN 'N/A';
  ELSEIF imf >= 6.0 THEN RETURN 'Prime+ (A5)';
  ELSEIF imf >= 4.5 THEN RETURN 'Prime (A4)';
  ELSEIF imf >= 3.0 THEN RETURN 'Choice+ (A3)';
  ELSEIF imf >= 2.0 THEN RETURN 'Choice (A2)';
  ELSE RETURN 'Standard';
  END IF;
END$$
DELIMITER ;

