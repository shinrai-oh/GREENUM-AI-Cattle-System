-- 肉牛养殖监控系统数据库初始化脚本

-- 设置字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE cattle_monitoring;

-- 创建摄像头配置表
CREATE TABLE IF NOT EXISTS cameras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '摄像头名称',
    rtsp_url VARCHAR(500) NOT NULL COMMENT 'RTSP地址',
    location VARCHAR(200) COMMENT '安装位置',
    farm_id INT NOT NULL COMMENT '养牛厂ID',
    pen_id INT COMMENT '栏位ID',
    status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建养牛厂表
CREATE TABLE IF NOT EXISTS farms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '养牛厂名称',
    address VARCHAR(300) COMMENT '地址',
    contact_person VARCHAR(50) COMMENT '联系人',
    contact_phone VARCHAR(20) COMMENT '联系电话',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建栏位表
CREATE TABLE IF NOT EXISTS pens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT NOT NULL,
    pen_number VARCHAR(50) NOT NULL COMMENT '栏位编号',
    capacity INT DEFAULT 0 COMMENT '容量',
    current_count INT DEFAULT 0 COMMENT '当前牛只数量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建牛只信息表
CREATE TABLE IF NOT EXISTS cattle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ear_tag VARCHAR(50) UNIQUE NOT NULL COMMENT '耳标号',
    farm_id INT NOT NULL,
    pen_id INT,
    breed VARCHAR(50) COMMENT '品种',
    birth_date DATE COMMENT '出生日期',
    weight DECIMAL(6,2) COMMENT '体重(kg)',
    gender ENUM('male', 'female') COMMENT '性别',
    status ENUM('healthy', 'sick', 'quarantine', 'sold') DEFAULT 'healthy' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    FOREIGN KEY (pen_id) REFERENCES pens(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建行为数据表
CREATE TABLE IF NOT EXISTS behavior_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cattle_id INT NOT NULL,
    pen_id INT NOT NULL,
    behavior_type ENUM('eating', 'standing', 'lying', 'walking', 'drinking', 'estrus') NOT NULL COMMENT '行为类型',
    start_time TIMESTAMP NOT NULL COMMENT '开始时间',
    end_time TIMESTAMP COMMENT '结束时间',
    duration INT COMMENT '持续时间(秒)',
    camera_id INT COMMENT '检测摄像头',
    confidence DECIMAL(3,2) COMMENT '置信度',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cattle_id) REFERENCES cattle(id) ON DELETE CASCADE,
    FOREIGN KEY (pen_id) REFERENCES pens(id) ON DELETE CASCADE,
    FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建统计数据表
CREATE TABLE IF NOT EXISTS daily_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cattle_id INT NOT NULL,
    pen_id INT NOT NULL,
    stat_date DATE NOT NULL,
    eating_time INT DEFAULT 0 COMMENT '采食时间(分钟)',
    standing_time INT DEFAULT 0 COMMENT '站立时间(分钟)',
    lying_time INT DEFAULT 0 COMMENT '卧躺时间(分钟)',
    walking_time INT DEFAULT 0 COMMENT '行走时间(分钟)',
    drinking_time INT DEFAULT 0 COMMENT '饮水时间(分钟)',
    total_active_time INT DEFAULT 0 COMMENT '总活动时间(分钟)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_cattle_date (cattle_id, stat_date),
    FOREIGN KEY (cattle_id) REFERENCES cattle(id) ON DELETE CASCADE,
    FOREIGN KEY (pen_id) REFERENCES pens(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入示例数据

-- 安装初始化仅执行架构创建与索引；实际数据请通过 seed_data.sql 导入。

-- 创建索引以提高查询性能
CREATE INDEX idx_cameras_farm_id ON cameras(farm_id);
CREATE INDEX idx_cameras_status ON cameras(status);
CREATE INDEX idx_pens_farm_id ON pens(farm_id);
CREATE INDEX idx_cattle_farm_id ON cattle(farm_id);
CREATE INDEX idx_cattle_pen_id ON cattle(pen_id);
CREATE INDEX idx_cattle_ear_tag ON cattle(ear_tag);
CREATE INDEX idx_behavior_cattle_id ON behavior_data(cattle_id);
CREATE INDEX idx_behavior_start_time ON behavior_data(start_time);
CREATE INDEX idx_behavior_type ON behavior_data(behavior_type);
CREATE INDEX idx_statistics_cattle_id ON daily_statistics(cattle_id);
CREATE INDEX idx_statistics_date ON daily_statistics(stat_date);

COMMIT;

-- Grant permissions for the test database
CREATE DATABASE IF NOT EXISTS cattle_monitoring_test;
GRANT ALL PRIVILEGES ON cattle_monitoring_test.* TO 'cattle_user'@'%';
FLUSH PRIVILEGES;
