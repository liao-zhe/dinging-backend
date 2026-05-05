-- 家庭私厨数据库初始化脚本
-- Home Chef Database Init Script

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 用户表
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `openid` varchar(100) NOT NULL,
  `username` varchar(50) NULL DEFAULT NULL,
  `nickname` varchar(50) NULL DEFAULT NULL,
  `avatar_url` text NULL,
  `phone` varchar(20) NULL DEFAULT NULL,
  `password_hash` text NULL,
  `role` varchar(20) NOT NULL DEFAULT 'customer',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `UQ_users_openid` (`openid`),
  UNIQUE INDEX `UQ_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- 菜品分类表
-- ----------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` varchar(36) NOT NULL,
  `name` varchar(50) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `idx_categories_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- 菜品表
-- ----------------------------
DROP TABLE IF EXISTS `dishes`;
CREATE TABLE `dishes` (
  `id` varchar(36) NOT NULL,
  `category_id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text NULL,
  `image_url` text NULL,
  `tag` varchar(50) NULL DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `idx_dishes_category_id` (`category_id`),
  INDEX `idx_dishes_sort_order` (`sort_order`),
  CONSTRAINT `fk_dishes_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- 订单表
-- ----------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `order_no` varchar(20) NOT NULL,
  `order_date` date NOT NULL,
  `meal_type` varchar(20) NOT NULL,
  `people_count` int NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uniq_orders_order_no` (`order_no`),
  INDEX `idx_orders_user_id` (`user_id`),
  INDEX `idx_orders_order_date` (`order_date`),
  INDEX `idx_orders_status` (`status`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- 订单明细表
-- ----------------------------
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` varchar(36) NOT NULL,
  `order_id` varchar(36) NOT NULL,
  `dish_id` varchar(36) NOT NULL,
  `dish_name` varchar(100) NOT NULL,
  `dish_image` text NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_order_items_order_id` (`order_id`),
  INDEX `idx_order_items_dish_id` (`dish_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_order_items_dish` FOREIGN KEY (`dish_id`) REFERENCES `dishes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- 心愿单表
-- ----------------------------
DROP TABLE IF EXISTS `wishlists`;
CREATE TABLE `wishlists` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `dish_name` varchar(100) NOT NULL,
  `image_url` text NULL,
  `remark` text NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `idx_wishlists_user_id` (`user_id`),
  CONSTRAINT `fk_wishlists_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- AI头像表
-- ----------------------------
DROP TABLE IF EXISTS `ai_avatars`;
CREATE TABLE `ai_avatars` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `avatar_url` text NOT NULL,
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uniq_ai_avatars_user_id` (`user_id`),
  CONSTRAINT `fk_ai_avatars_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- AI对话会话表
-- ----------------------------
DROP TABLE IF EXISTS `chat_sessions`;
CREATE TABLE `chat_sessions` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `title` varchar(100) NULL DEFAULT NULL,
  `message_count` int NOT NULL DEFAULT '0',
  `last_message_at` timestamp NULL DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_last_message` (`last_message_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- AI对话消息表
-- ----------------------------
DROP TABLE IF EXISTS `chat_messages`;
CREATE TABLE `chat_messages` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `session_id` varchar(36) NOT NULL,
  `role` enum('user', 'assistant', 'system') NOT NULL,
  `content` text NOT NULL,
  `tool_calls` json NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `idx_user_session` (`user_id`, `session_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- 用户偏好表
-- ----------------------------
DROP TABLE IF EXISTS `user_preferences`;
CREATE TABLE `user_preferences` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `dietary_restrictions` text NULL COMMENT '饮食限制（如：素食、不吃辣）',
  `favorite_cuisines` text NULL COMMENT '喜爱的菜系',
  `allergies` text NULL COMMENT '过敏源',
  `taste_preferences` text NULL COMMENT '口味偏好（如：清淡、重口）',
  `typical_people_count` int NOT NULL DEFAULT '0' COMMENT '通常用餐人数',
  `notes` text NULL COMMENT '其他备注',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
