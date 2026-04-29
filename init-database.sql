-- ============================================
-- Family Chef - full database bootstrap script
-- Target database: homechef
--
-- Goals:
-- 1. Fresh database bootstrap
-- 2. Safe re-run on existing MySQL 8.x databases
-- 3. Patch common schema drift for current backend entities
-- 4. Seed baseline data without overwriting user-modified chef password
-- ============================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS homechef
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE homechef;

SET FOREIGN_KEY_CHECKS = 0;

SET @default_chef_openid = 'chef-account:admin';
SET @default_chef_username = 'admin';
SET @default_chef_nickname = 'Chef';
SET @default_chef_password_hash = '15b95ce526d70ddab58d1e8cc29480f3:10e2725d79f72d632f37dda04036ecf0dcd88a7896c699c147290eeacdbe48f4bf33a84825ea57383c41f365ec19131b1e3ddcd2ac95f18f5f3f40cb69170653';

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL COMMENT 'User ID (UUID)',
  openid VARCHAR(100) NOT NULL COMMENT 'WeChat openid',
  username VARCHAR(50) NULL COMMENT 'Login username for password-based accounts',
  nickname VARCHAR(50) NULL COMMENT 'Nickname',
  avatar_url TEXT NULL COMMENT 'Avatar URL',
  phone VARCHAR(20) NULL COMMENT 'Phone number',
  password_hash TEXT NULL COMMENT 'Password hash for password-based accounts',
  role VARCHAR(20) NOT NULL DEFAULT 'customer' COMMENT 'User role',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time',
  PRIMARY KEY (id),
  UNIQUE KEY uniq_users_openid (openid),
  UNIQUE KEY uniq_users_username (username),
  KEY idx_users_openid (openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Users';

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(36) NOT NULL COMMENT 'Category ID',
  name VARCHAR(50) NOT NULL COMMENT 'Category name',
  sort_order INT NULL DEFAULT 0 COMMENT 'Sort order',
  is_active TINYINT(1) NULL DEFAULT 1 COMMENT 'Whether active',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  PRIMARY KEY (id),
  KEY idx_categories_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dish categories';

CREATE TABLE IF NOT EXISTS dishes (
  id VARCHAR(36) NOT NULL COMMENT 'Dish ID',
  category_id VARCHAR(36) NOT NULL COMMENT 'Category ID',
  name VARCHAR(100) NOT NULL COMMENT 'Dish name',
  description TEXT NULL COMMENT 'Description',
  image_url TEXT NULL COMMENT 'Image URL',
  tag VARCHAR(50) NULL COMMENT 'Tag',
  is_active TINYINT(1) NULL DEFAULT 1 COMMENT 'Whether active',
  sort_order INT NULL DEFAULT 0 COMMENT 'Sort order',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time',
  PRIMARY KEY (id),
  KEY idx_dishes_category_id (category_id),
  KEY idx_dishes_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dishes';

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) NOT NULL COMMENT 'Order ID',
  user_id VARCHAR(36) NOT NULL COMMENT 'User ID',
  order_no VARCHAR(20) NOT NULL COMMENT 'Order number',
  order_date DATE NOT NULL COMMENT 'Order date',
  meal_type VARCHAR(20) NOT NULL COMMENT 'Meal type',
  people_count INT NOT NULL COMMENT 'People count',
  status VARCHAR(20) NULL DEFAULT 'pending' COMMENT 'Order status',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time',
  PRIMARY KEY (id),
  UNIQUE KEY uniq_orders_order_no (order_no),
  KEY idx_orders_user_id (user_id),
  KEY idx_orders_status (status),
  KEY idx_orders_order_date (order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Orders';

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(36) NOT NULL COMMENT 'Order item ID',
  order_id VARCHAR(36) NOT NULL COMMENT 'Order ID',
  dish_id VARCHAR(36) NOT NULL COMMENT 'Dish ID',
  dish_name VARCHAR(100) NOT NULL COMMENT 'Dish name snapshot',
  dish_image TEXT NULL COMMENT 'Dish image snapshot',
  quantity INT NOT NULL COMMENT 'Quantity',
  PRIMARY KEY (id),
  KEY idx_order_items_order_id (order_id),
  KEY idx_order_items_dish_id (dish_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Order items';

CREATE TABLE IF NOT EXISTS wishlists (
  id VARCHAR(36) NOT NULL COMMENT 'Wishlist ID',
  user_id VARCHAR(36) NOT NULL COMMENT 'User ID',
  dish_name VARCHAR(100) NOT NULL COMMENT 'Dish name',
  image_url TEXT NULL COMMENT 'Image URL',
  remark TEXT NULL COMMENT 'Remark',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  PRIMARY KEY (id),
  KEY idx_wishlists_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Wishlists';

CREATE TABLE IF NOT EXISTS ai_avatars (
  id VARCHAR(36) NOT NULL COMMENT 'Record ID',
  user_id VARCHAR(36) NOT NULL COMMENT 'User ID',
  avatar_url TEXT NOT NULL COMMENT 'Avatar URL',
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time',
  PRIMARY KEY (id),
  UNIQUE KEY uniq_ai_avatars_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI avatars';

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'openid'
  ),
  'SELECT "users.openid already exists" AS message',
  'ALTER TABLE users ADD COLUMN openid VARCHAR(100) NOT NULL COMMENT ''WeChat openid'' AFTER id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'username'
  ),
  'SELECT "users.username already exists" AS message',
  'ALTER TABLE users ADD COLUMN username VARCHAR(50) NULL COMMENT ''Login username for password-based accounts'' AFTER openid'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'nickname'
  ),
  'SELECT "users.nickname already exists" AS message',
  'ALTER TABLE users ADD COLUMN nickname VARCHAR(50) NULL COMMENT ''Nickname'' AFTER username'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'
  ),
  'SELECT "users.avatar_url already exists" AS message',
  'ALTER TABLE users ADD COLUMN avatar_url TEXT NULL COMMENT ''Avatar URL'' AFTER nickname'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone'
  ),
  'SELECT "users.phone already exists" AS message',
  'ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL COMMENT ''Phone number'' AFTER avatar_url'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash'
  ),
  'SELECT "users.password_hash already exists" AS message',
  'ALTER TABLE users ADD COLUMN password_hash TEXT NULL COMMENT ''Password hash for password-based accounts'' AFTER phone'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
  ),
  'SELECT "users.role already exists" AS message',
  'ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT ''customer'' COMMENT ''User role'' AFTER password_hash'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'created_at'
  ),
  'SELECT "users.created_at already exists" AS message',
  'ALTER TABLE users ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''Created time'' AFTER role'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'updated_at'
  ),
  'SELECT "users.updated_at already exists" AS message',
  'ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''Updated time'' AFTER created_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE users
  MODIFY COLUMN id VARCHAR(36) NOT NULL COMMENT 'User ID (UUID)',
  MODIFY COLUMN openid VARCHAR(100) NOT NULL COMMENT 'WeChat openid',
  MODIFY COLUMN username VARCHAR(50) NULL COMMENT 'Login username for password-based accounts',
  MODIFY COLUMN nickname VARCHAR(50) NULL COMMENT 'Nickname',
  MODIFY COLUMN avatar_url TEXT NULL COMMENT 'Avatar URL',
  MODIFY COLUMN phone VARCHAR(20) NULL COMMENT 'Phone number',
  MODIFY COLUMN password_hash TEXT NULL COMMENT 'Password hash for password-based accounts',
  MODIFY COLUMN role VARCHAR(20) NOT NULL DEFAULT 'customer' COMMENT 'User role',
  MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  MODIFY COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time';

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'uniq_users_openid'
  ),
  'SELECT "uniq_users_openid already exists" AS message',
  'CREATE UNIQUE INDEX uniq_users_openid ON users (openid)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'uniq_users_username'
  ),
  'SELECT "uniq_users_username already exists" AS message',
  'CREATE UNIQUE INDEX uniq_users_username ON users (username)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_openid'
  ),
  'SELECT "idx_users_openid already exists" AS message',
  'CREATE INDEX idx_users_openid ON users (openid)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'name'
  ),
  'SELECT "categories.name already exists" AS message',
  'ALTER TABLE categories ADD COLUMN name VARCHAR(50) NOT NULL COMMENT ''Category name'' AFTER id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'sort_order'
  ),
  'SELECT "categories.sort_order already exists" AS message',
  'ALTER TABLE categories ADD COLUMN sort_order INT NULL DEFAULT 0 COMMENT ''Sort order'' AFTER name'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'is_active'
  ),
  'SELECT "categories.is_active already exists" AS message',
  'ALTER TABLE categories ADD COLUMN is_active TINYINT(1) NULL DEFAULT 1 COMMENT ''Whether active'' AFTER sort_order'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'created_at'
  ),
  'SELECT "categories.created_at already exists" AS message',
  'ALTER TABLE categories ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''Created time'' AFTER is_active'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE categories
  MODIFY COLUMN id VARCHAR(36) NOT NULL COMMENT 'Category ID',
  MODIFY COLUMN name VARCHAR(50) NOT NULL COMMENT 'Category name',
  MODIFY COLUMN sort_order INT NULL DEFAULT 0 COMMENT 'Sort order',
  MODIFY COLUMN is_active TINYINT(1) NULL DEFAULT 1 COMMENT 'Whether active',
  MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time';

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND INDEX_NAME = 'idx_categories_sort_order'
  ),
  'SELECT "idx_categories_sort_order already exists" AS message',
  'CREATE INDEX idx_categories_sort_order ON categories (sort_order)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'category_id'
  ),
  'SELECT "dishes.category_id already exists" AS message',
  'ALTER TABLE dishes ADD COLUMN category_id VARCHAR(36) NOT NULL COMMENT ''Category ID'' AFTER id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'name'
  ),
  'SELECT "dishes.name already exists" AS message',
  'ALTER TABLE dishes ADD COLUMN name VARCHAR(100) NOT NULL COMMENT ''Dish name'' AFTER category_id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'description'
  ),
  'SELECT "dishes.description already exists" AS message',
  'ALTER TABLE dishes ADD COLUMN description TEXT NULL COMMENT ''Description'' AFTER name'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'image_url'
  ),
  'SELECT "dishes.image_url already exists" AS message',
  'ALTER TABLE dishes ADD COLUMN image_url TEXT NULL COMMENT ''Image URL'' AFTER description'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'tag'
  ),
  'SELECT "dishes.tag already exists" AS message',
  'ALTER TABLE dishes ADD COLUMN tag VARCHAR(50) NULL COMMENT ''Tag'' AFTER image_url'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'is_active'
  ),
  'SELECT "dishes.is_active already exists" AS message',
  'ALTER TABLE dishes ADD COLUMN is_active TINYINT(1) NULL DEFAULT 1 COMMENT ''Whether active'' AFTER tag'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'sort_order'
  ),
  'SELECT "dishes.sort_order already exists" AS message',
  'ALTER TABLE dishes ADD COLUMN sort_order INT NULL DEFAULT 0 COMMENT ''Sort order'' AFTER is_active'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'created_at'
  ),
  'SELECT "dishes.created_at already exists" AS message',
  'ALTER TABLE dishes ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''Created time'' AFTER sort_order'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'updated_at'
  ),
  'SELECT "dishes.updated_at already exists" AS message',
  'ALTER TABLE dishes ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''Updated time'' AFTER created_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE dishes
  MODIFY COLUMN id VARCHAR(36) NOT NULL COMMENT 'Dish ID',
  MODIFY COLUMN category_id VARCHAR(36) NOT NULL COMMENT 'Category ID',
  MODIFY COLUMN name VARCHAR(100) NOT NULL COMMENT 'Dish name',
  MODIFY COLUMN description TEXT NULL COMMENT 'Description',
  MODIFY COLUMN image_url TEXT NULL COMMENT 'Image URL',
  MODIFY COLUMN tag VARCHAR(50) NULL COMMENT 'Tag',
  MODIFY COLUMN is_active TINYINT(1) NULL DEFAULT 1 COMMENT 'Whether active',
  MODIFY COLUMN sort_order INT NULL DEFAULT 0 COMMENT 'Sort order',
  MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  MODIFY COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time';

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'price'
  ),
  'ALTER TABLE dishes MODIFY COLUMN price DECIMAL(10,2) NULL COMMENT ''Legacy price column kept for compatibility''',
  'SELECT "dishes.price does not exist, skip" AS message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND INDEX_NAME = 'idx_dishes_category_id'
  ),
  'SELECT "idx_dishes_category_id already exists" AS message',
  'CREATE INDEX idx_dishes_category_id ON dishes (category_id)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND INDEX_NAME = 'idx_dishes_sort_order'
  ),
  'SELECT "idx_dishes_sort_order already exists" AS message',
  'CREATE INDEX idx_dishes_sort_order ON dishes (sort_order)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'user_id'
  ),
  'SELECT "orders.user_id already exists" AS message',
  'ALTER TABLE orders ADD COLUMN user_id VARCHAR(36) NOT NULL COMMENT ''User ID'' AFTER id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'order_no'
  ),
  'SELECT "orders.order_no already exists" AS message',
  'ALTER TABLE orders ADD COLUMN order_no VARCHAR(20) NOT NULL COMMENT ''Order number'' AFTER user_id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'order_date'
  ),
  'SELECT "orders.order_date already exists" AS message',
  'ALTER TABLE orders ADD COLUMN order_date DATE NOT NULL COMMENT ''Order date'' AFTER order_no'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'meal_type'
  ),
  'SELECT "orders.meal_type already exists" AS message',
  'ALTER TABLE orders ADD COLUMN meal_type VARCHAR(20) NOT NULL COMMENT ''Meal type'' AFTER order_date'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'people_count'
  ),
  'SELECT "orders.people_count already exists" AS message',
  'ALTER TABLE orders ADD COLUMN people_count INT NOT NULL COMMENT ''People count'' AFTER meal_type'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'status'
  ),
  'SELECT "orders.status already exists" AS message',
  'ALTER TABLE orders ADD COLUMN status VARCHAR(20) NULL DEFAULT ''pending'' COMMENT ''Order status'' AFTER people_count'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'created_at'
  ),
  'SELECT "orders.created_at already exists" AS message',
  'ALTER TABLE orders ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''Created time'' AFTER status'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'updated_at'
  ),
  'SELECT "orders.updated_at already exists" AS message',
  'ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''Updated time'' AFTER created_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE orders
  MODIFY COLUMN id VARCHAR(36) NOT NULL COMMENT 'Order ID',
  MODIFY COLUMN user_id VARCHAR(36) NOT NULL COMMENT 'User ID',
  MODIFY COLUMN order_no VARCHAR(20) NOT NULL COMMENT 'Order number',
  MODIFY COLUMN order_date DATE NOT NULL COMMENT 'Order date',
  MODIFY COLUMN meal_type VARCHAR(20) NOT NULL COMMENT 'Meal type',
  MODIFY COLUMN people_count INT NOT NULL COMMENT 'People count',
  MODIFY COLUMN status VARCHAR(20) NULL DEFAULT 'pending' COMMENT 'Order status',
  MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  MODIFY COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time';

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'uniq_orders_order_no'
  ),
  'SELECT "uniq_orders_order_no already exists" AS message',
  'CREATE UNIQUE INDEX uniq_orders_order_no ON orders (order_no)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_orders_user_id'
  ),
  'SELECT "idx_orders_user_id already exists" AS message',
  'CREATE INDEX idx_orders_user_id ON orders (user_id)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_orders_status'
  ),
  'SELECT "idx_orders_status already exists" AS message',
  'CREATE INDEX idx_orders_status ON orders (status)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_orders_order_date'
  ),
  'SELECT "idx_orders_order_date already exists" AS message',
  'CREATE INDEX idx_orders_order_date ON orders (order_date)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'order_id'
  ),
  'SELECT "order_items.order_id already exists" AS message',
  'ALTER TABLE order_items ADD COLUMN order_id VARCHAR(36) NOT NULL COMMENT ''Order ID'' AFTER id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'dish_id'
  ),
  'SELECT "order_items.dish_id already exists" AS message',
  'ALTER TABLE order_items ADD COLUMN dish_id VARCHAR(36) NOT NULL COMMENT ''Dish ID'' AFTER order_id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'dish_name'
  ),
  'SELECT "order_items.dish_name already exists" AS message',
  'ALTER TABLE order_items ADD COLUMN dish_name VARCHAR(100) NOT NULL COMMENT ''Dish name snapshot'' AFTER dish_id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'dish_image'
  ),
  'SELECT "order_items.dish_image already exists" AS message',
  'ALTER TABLE order_items ADD COLUMN dish_image TEXT NULL COMMENT ''Dish image snapshot'' AFTER dish_name'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'quantity'
  ),
  'SELECT "order_items.quantity already exists" AS message',
  'ALTER TABLE order_items ADD COLUMN quantity INT NOT NULL COMMENT ''Quantity'' AFTER dish_image'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE order_items
  MODIFY COLUMN id VARCHAR(36) NOT NULL COMMENT 'Order item ID',
  MODIFY COLUMN order_id VARCHAR(36) NOT NULL COMMENT 'Order ID',
  MODIFY COLUMN dish_id VARCHAR(36) NOT NULL COMMENT 'Dish ID',
  MODIFY COLUMN dish_name VARCHAR(100) NOT NULL COMMENT 'Dish name snapshot',
  MODIFY COLUMN dish_image TEXT NULL COMMENT 'Dish image snapshot',
  MODIFY COLUMN quantity INT NOT NULL COMMENT 'Quantity';

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND INDEX_NAME = 'idx_order_items_order_id'
  ),
  'SELECT "idx_order_items_order_id already exists" AS message',
  'CREATE INDEX idx_order_items_order_id ON order_items (order_id)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND INDEX_NAME = 'idx_order_items_dish_id'
  ),
  'SELECT "idx_order_items_dish_id already exists" AS message',
  'CREATE INDEX idx_order_items_dish_id ON order_items (dish_id)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wishlists' AND COLUMN_NAME = 'user_id'
  ),
  'SELECT "wishlists.user_id already exists" AS message',
  'ALTER TABLE wishlists ADD COLUMN user_id VARCHAR(36) NOT NULL COMMENT ''User ID'' AFTER id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wishlists' AND COLUMN_NAME = 'dish_name'
  ),
  'SELECT "wishlists.dish_name already exists" AS message',
  'ALTER TABLE wishlists ADD COLUMN dish_name VARCHAR(100) NOT NULL COMMENT ''Dish name'' AFTER user_id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wishlists' AND COLUMN_NAME = 'image_url'
  ),
  'SELECT "wishlists.image_url already exists" AS message',
  'ALTER TABLE wishlists ADD COLUMN image_url TEXT NULL COMMENT ''Image URL'' AFTER dish_name'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wishlists' AND COLUMN_NAME = 'remark'
  ),
  'SELECT "wishlists.remark already exists" AS message',
  'ALTER TABLE wishlists ADD COLUMN remark TEXT NULL COMMENT ''Remark'' AFTER image_url'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wishlists' AND COLUMN_NAME = 'created_at'
  ),
  'SELECT "wishlists.created_at already exists" AS message',
  'ALTER TABLE wishlists ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''Created time'' AFTER remark'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE wishlists
  MODIFY COLUMN id VARCHAR(36) NOT NULL COMMENT 'Wishlist ID',
  MODIFY COLUMN user_id VARCHAR(36) NOT NULL COMMENT 'User ID',
  MODIFY COLUMN dish_name VARCHAR(100) NOT NULL COMMENT 'Dish name',
  MODIFY COLUMN image_url TEXT NULL COMMENT 'Image URL',
  MODIFY COLUMN remark TEXT NULL COMMENT 'Remark',
  MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time';

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wishlists' AND INDEX_NAME = 'idx_wishlists_user_id'
  ),
  'SELECT "idx_wishlists_user_id already exists" AS message',
  'CREATE INDEX idx_wishlists_user_id ON wishlists (user_id)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_avatars' AND COLUMN_NAME = 'user_id'
  ),
  'SELECT "ai_avatars.user_id already exists" AS message',
  'ALTER TABLE ai_avatars ADD COLUMN user_id VARCHAR(36) NOT NULL COMMENT ''User ID'' AFTER id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_avatars' AND COLUMN_NAME = 'avatar_url'
  ),
  'SELECT "ai_avatars.avatar_url already exists" AS message',
  'ALTER TABLE ai_avatars ADD COLUMN avatar_url TEXT NOT NULL COMMENT ''Avatar URL'' AFTER user_id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_avatars' AND COLUMN_NAME = 'updated_at'
  ),
  'SELECT "ai_avatars.updated_at already exists" AS message',
  'ALTER TABLE ai_avatars ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''Updated time'' AFTER avatar_url'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE ai_avatars
  MODIFY COLUMN id VARCHAR(36) NOT NULL COMMENT 'Record ID',
  MODIFY COLUMN user_id VARCHAR(36) NOT NULL COMMENT 'User ID',
  MODIFY COLUMN avatar_url TEXT NOT NULL COMMENT 'Avatar URL',
  MODIFY COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time';

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_avatars' AND INDEX_NAME = 'uniq_ai_avatars_user_id'
  ),
  'SELECT "uniq_ai_avatars_user_id already exists" AS message',
  'CREATE UNIQUE INDEX uniq_ai_avatars_user_id ON ai_avatars (user_id)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'dishes'
      AND CONSTRAINT_NAME = 'fk_dishes_category'
  ),
  'SELECT "fk_dishes_category already exists" AS message',
  'ALTER TABLE dishes ADD CONSTRAINT fk_dishes_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND CONSTRAINT_NAME = 'fk_orders_user'
  ),
  'SELECT "fk_orders_user already exists" AS message',
  'ALTER TABLE orders ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'order_items'
      AND CONSTRAINT_NAME = 'fk_order_items_order'
  ),
  'SELECT "fk_order_items_order already exists" AS message',
  'ALTER TABLE order_items ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'order_items'
      AND CONSTRAINT_NAME = 'fk_order_items_dish'
  ),
  'SELECT "fk_order_items_dish already exists" AS message',
  'ALTER TABLE order_items ADD CONSTRAINT fk_order_items_dish FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE RESTRICT'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'wishlists'
      AND CONSTRAINT_NAME = 'fk_wishlists_user'
  ),
  'SELECT "fk_wishlists_user already exists" AS message',
  'ALTER TABLE wishlists ADD CONSTRAINT fk_wishlists_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ai_avatars'
      AND CONSTRAINT_NAME = 'fk_ai_avatars_user'
  ),
  'SELECT "fk_ai_avatars_user already exists" AS message',
  'ALTER TABLE ai_avatars ADD CONSTRAINT fk_ai_avatars_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO users (
  id,
  openid,
  username,
  nickname,
  password_hash,
  role
) VALUES (
  'cc44f398-36db-4de7-94ad-c67578fb540a',
  @default_chef_openid,
  @default_chef_username,
  @default_chef_nickname,
  @default_chef_password_hash,
  'chef'
)
ON DUPLICATE KEY UPDATE
  username = COALESCE(NULLIF(username, ''), VALUES(username)),
  nickname = COALESCE(NULLIF(nickname, ''), VALUES(nickname)),
  password_hash = COALESCE(NULLIF(password_hash, ''), VALUES(password_hash)),
  role = 'chef';

UPDATE users
SET
  username = COALESCE(NULLIF(username, ''), @default_chef_username),
  nickname = COALESCE(NULLIF(nickname, ''), @default_chef_nickname),
  password_hash = COALESCE(NULLIF(password_hash, ''), @default_chef_password_hash),
  role = 'chef'
WHERE openid = @default_chef_openid;

INSERT INTO categories (id, name, sort_order, is_active) VALUES
  ('cat-signature', '招牌菜', 1, 1),
  ('cat-hot', '热菜', 2, 1),
  ('cat-cold', '凉菜', 3, 1),
  ('cat-dessert', '点心', 4, 1),
  ('cat-staple', '主食', 5, 1),
  ('cat-seafood', '海鲜', 6, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);

INSERT INTO dishes (id, category_id, name, description, image_url, tag, is_active, sort_order) VALUES
  ('dish-1', 'cat-signature', '北京烤鸭', '传统挂炉烤制，皮酥肉嫩，配荷叶饼与甜面酱。', 'https://images.unsplash.com/photo-1518492104633-130d0cc84637?auto=format&fit=crop&w=600&q=80', '热销', 1, 1),
  ('dish-2', 'cat-hot', '宫保鸡丁', '川菜经典，鸡肉滑嫩，花生香脆，酸甜微辣。', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80', '热销', 1, 2),
  ('dish-3', 'cat-hot', '麻婆豆腐', '豆腐细嫩入味，麻辣浓郁，适合配米饭。', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80', '热销', 1, 3),
  ('dish-4', 'cat-hot', '糖醋里脊', '酸甜开胃，外酥里嫩，适合全家共享。', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80', '推荐', 1, 4),
  ('dish-5', 'cat-cold', '凉拌黄瓜', '清爽开胃，蒜香浓郁，夏日必备凉菜。', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80', '清爽', 1, 5),
  ('dish-6', 'cat-cold', '皮蛋豆腐', '经典凉菜，口感细腻，配特制酱汁。', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', '经典', 1, 6),
  ('dish-7', 'cat-dessert', '蛋挞', '酥脆外皮，香滑蛋奶馅，下午茶首选。', 'https://images.unsplash.com/photo-1558303006-1f76f15dca82?auto=format&fit=crop&w=600&q=80', '甜品', 1, 7),
  ('dish-8', 'cat-dessert', '芒果布丁', '新鲜芒果制作，口感顺滑，甜而不腻。', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80', '人气', 1, 8),
  ('dish-9', 'cat-staple', '扬州炒饭', '颗粒分明，配料丰富，经典主食。', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80', '主食', 1, 9),
  ('dish-10', 'cat-staple', '葱油拌面', '葱香四溢，面条劲道，简单但好吃。', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80', '主食', 1, 10),
  ('dish-11', 'cat-seafood', '清蒸鲈鱼', '新鲜鲈鱼清蒸，保留原味，鲜嫩可口。', 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?auto=format&fit=crop&w=600&q=80', '海鲜', 1, 11),
  ('dish-12', 'cat-seafood', '蒜蓉粉丝蒸扇贝', '扇贝鲜美，蒜香浓郁，粉丝充分吸味。', 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80', '海鲜', 1, 12)
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id),
  name = VALUES(name),
  description = VALUES(description),
  image_url = VALUES(image_url),
  tag = VALUES(tag),
  is_active = VALUES(is_active),
  sort_order = VALUES(sort_order);

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'database initialization completed' AS message;
SELECT COUNT(*) AS user_count FROM users;
SELECT COUNT(*) AS category_count FROM categories;
SELECT COUNT(*) AS dish_count FROM dishes;
