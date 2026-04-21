-- 为已存在的数据库添加“estrus”行为类型枚举值
USE cattle_monitoring;

ALTER TABLE behavior_data
  MODIFY COLUMN behavior_type 
    ENUM('eating', 'standing', 'lying', 'walking', 'drinking', 'estrus') 
    NOT NULL COMMENT '行为类型';

-- 可选：验证
-- SHOW COLUMNS FROM behavior_data LIKE 'behavior_type';

