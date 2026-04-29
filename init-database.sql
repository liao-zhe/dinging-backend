-- ============================================
-- Family Chef - database initialization script
-- Database: homechef
--
-- Usage:
-- 1. Supports fresh database initialization
-- 2. Can also be run against an existing database to patch schema drift
-- 3. Safe to execute repeatedly on MySQL 8.x
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY COMMENT 'User ID (UUID)',
  openid VARCHAR(100) UNIQUE NOT NULL COMMENT 'WeChat openid',
  username VARCHAR(50) UNIQUE COMMENT 'Login username for password-based accounts',
  nickname VARCHAR(50) COMMENT 'Nickname',
  avatar_url TEXT COMMENT 'Avatar URL',
  phone VARCHAR(20) COMMENT 'Phone number',
  password_hash TEXT COMMENT 'Password hash for password-based accounts',
  role VARCHAR(20) NOT NULL DEFAULT 'customer' COMMENT 'User role',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time',
  INDEX idx_openid (openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Users';

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(36) PRIMARY KEY COMMENT 'Category ID',
  name VARCHAR(50) NOT NULL COMMENT 'Category name',
  sort_order INT DEFAULT 0 COMMENT 'Sort order',
  is_active TINYINT(1) DEFAULT 1 COMMENT 'Whether active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dish categories';

CREATE TABLE IF NOT EXISTS dishes (
  id VARCHAR(36) PRIMARY KEY COMMENT 'Dish ID',
  category_id VARCHAR(36) NOT NULL COMMENT 'Category ID',
  name VARCHAR(100) NOT NULL COMMENT 'Dish name',
  description TEXT COMMENT 'Description',
  image_url TEXT COMMENT 'Image URL',
  tag VARCHAR(50) COMMENT 'Tag',
  is_active TINYINT(1) DEFAULT 1 COMMENT 'Whether active',
  sort_order INT DEFAULT 0 COMMENT 'Sort order',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time',
  INDEX idx_category (category_id),
  INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dishes';

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY COMMENT 'Order ID',
  user_id VARCHAR(36) NOT NULL COMMENT 'User ID',
  order_no VARCHAR(20) UNIQUE NOT NULL COMMENT 'Order number',
  order_date DATE NOT NULL COMMENT 'Order date',
  meal_type VARCHAR(20) NOT NULL COMMENT 'Meal type',
  people_count INT NOT NULL COMMENT 'People count',
  total_amount DECIMAL(10,2) NULL COMMENT 'Order total amount' AFTER people_count,
  status VARCHAR(20) DEFAULT 'pending' COMMENT 'Order status',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time',
  INDEX idx_user (user_id),
  INDEX idx_order_no (order_no),
  INDEX idx_status (status),
  INDEX idx_date (order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Orders';

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(36) PRIMARY KEY COMMENT 'Order item ID',
  order_id VARCHAR(36) NOT NULL COMMENT 'Order ID',
  dish_id VARCHAR(36) NOT NULL COMMENT 'Dish ID',
  dish_name VARCHAR(100) NOT NULL COMMENT 'Dish name snapshot',
  dish_image TEXT COMMENT 'Dish image snapshot',
  quantity INT NOT NULL COMMENT 'Quantity',
  INDEX idx_order (order_id),
  INDEX idx_dish (dish_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Order items';

CREATE TABLE IF NOT EXISTS wishlists (
  id VARCHAR(36) PRIMARY KEY COMMENT 'Wishlist ID',
  user_id VARCHAR(36) NOT NULL COMMENT 'User ID',
  dish_name VARCHAR(100) NOT NULL COMMENT 'Dish name',
  image_url TEXT COMMENT 'Image URL',
  remark TEXT COMMENT 'Remark',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Wishlists';

CREATE TABLE IF NOT EXISTS ai_avatars (
  id VARCHAR(36) PRIMARY KEY COMMENT 'Record ID',
  user_id VARCHAR(36) UNIQUE NOT NULL COMMENT 'User ID',
  avatar_url TEXT NOT NULL COMMENT 'Avatar URL',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI avatars';

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
  ),
  'SELECT "users.role already exists" AS message',
  'ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT ''customer'' COMMENT ''User role'' AFTER phone'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'username'
  ),
  'SELECT "users.username already exists" AS message',
  'ALTER TABLE users ADD COLUMN username VARCHAR(50) NULL COMMENT ''Login username for password-based accounts'' AFTER openid'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash'
  ),
  'SELECT "users.password_hash already exists" AS message',
  'ALTER TABLE users ADD COLUMN password_hash TEXT NULL COMMENT ''Password hash for password-based accounts'' AFTER phone'
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
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_openid'
  ),
  'SELECT "idx_openid already exists" AS message',
  'CREATE INDEX idx_openid ON users (openid)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE users
SET
  username = 'admin',
  password_hash = '15b95ce526d70ddab58d1e8cc29480f3:10e2725d79f72d632f37dda04036ecf0dcd88a7896c699c147290eeacdbe48f4bf33a84825ea57383c41f365ec19131b1e3ddcd2ac95f18f5f3f40cb69170653',
  nickname = COALESCE(NULLIF(nickname, ''), 'Chef'),
  role = 'chef'
WHERE openid = 'chef-account:admin';

INSERT INTO users (
  id,
  openid,
  username,
  nickname,
  password_hash,
  role
) VALUES (
  'cc44f398-36db-4de7-94ad-c67578fb540a',
  'chef-account:admin',
  'admin',
  'Chef',
  '15b95ce526d70ddab58d1e8cc29480f3:10e2725d79f72d632f37dda04036ecf0dcd88a7896c699c147290eeacdbe48f4bf33a84825ea57383c41f365ec19131b1e3ddcd2ac95f18f5f3f40cb69170653',
  'chef'
)
ON DUPLICATE KEY UPDATE
  username = VALUES(username),
  nickname = VALUES(nickname),
  password_hash = VALUES(password_hash),
  role = VALUES(role);

ALTER TABLE categories
  MODIFY COLUMN id VARCHAR(36) NOT NULL COMMENT 'Category ID',
  MODIFY COLUMN name VARCHAR(50) NOT NULL COMMENT 'Category name',
  MODIFY COLUMN sort_order INT NULL DEFAULT 0 COMMENT 'Sort order',
  MODIFY COLUMN is_active TINYINT(1) NULL DEFAULT 1 COMMENT 'Whether active',
  MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time';

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND INDEX_NAME = 'idx_sort'
  ),
  'SELECT "categories.idx_sort already exists" AS message',
  'CREATE INDEX idx_sort ON categories (sort_order)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'description'
  ),
  'SELECT "dishes.description already exists" AS message',
  'ALTER TABLE dishes ADD COLUMN description TEXT NULL COMMENT ''Description'' AFTER name'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'image_url'
  ),
  'SELECT "dishes.image_url already exists" AS message',
  'ALTER TABLE dishes ADD COLUMN image_url TEXT NULL COMMENT ''Image URL'' AFTER description'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'tag'
  ),
  'SELECT "dishes.tag already exists" AS message',
  'ALTER TABLE dishes ADD COLUMN tag VARCHAR(50) NULL COMMENT ''Tag'' AFTER image_url'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'is_active'
  ),
  'SELECT "dishes.is_active already exists" AS message',
  'ALTER TABLE dishes ADD COLUMN is_active TINYINT(1) NULL DEFAULT 1 COMMENT ''Whether active'' AFTER tag'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'sort_order'
  ),
  'SELECT "dishes.sort_order already exists" AS message',
  'ALTER TABLE dishes ADD COLUMN sort_order INT NULL DEFAULT 0 COMMENT ''Sort order'' AFTER is_active'
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
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'price'
  ),
  'ALTER TABLE dishes MODIFY COLUMN price DECIMAL(10,2) NULL COMMENT ''Legacy price column kept for compatibility''',
  'SELECT "dishes.price does not exist, skip" AS message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND INDEX_NAME = 'idx_category'
  ),
  'SELECT "dishes.idx_category already exists" AS message',
  'CREATE INDEX idx_category ON dishes (category_id)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dishes' AND INDEX_NAME = 'idx_sort'
  ),
  'SELECT "dishes.idx_sort already exists" AS message',
  'CREATE INDEX idx_sort ON dishes (sort_order)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE orders
  MODIFY COLUMN id VARCHAR(36) NOT NULL COMMENT 'Order ID',
  MODIFY COLUMN user_id VARCHAR(36) NOT NULL COMMENT 'User ID',
  MODIFY COLUMN order_no VARCHAR(20) NOT NULL COMMENT 'Order number',
  MODIFY COLUMN order_date DATE NOT NULL COMMENT 'Order date',
  MODIFY COLUMN meal_type VARCHAR(20) NOT NULL COMMENT 'Meal type',
  MODIFY COLUMN people_count INT NOT NULL COMMENT 'People count',
  total_amount DECIMAL(10,2) NULL COMMENT 'Order total amount' AFTER people_count,
  MODIFY COLUMN status VARCHAR(20) NULL DEFAULT 'pending' COMMENT 'Order status',
  MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  MODIFY COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time';

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_user'
  ),
  'SELECT "orders.idx_user already exists" AS message',
  'CREATE INDEX idx_user ON orders (user_id)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_order_no'
  ),
  'SELECT "orders.idx_order_no already exists" AS message',
  'CREATE INDEX idx_order_no ON orders (order_no)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_status'
  ),
  'SELECT "orders.idx_status already exists" AS message',
  'CREATE INDEX idx_status ON orders (status)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_date'
  ),
  'SELECT "orders.idx_date already exists" AS message',
  'CREATE INDEX idx_date ON orders (order_date)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'total_amount'
  ),
  'SELECT "orders.total_amount already exists" AS message',
  'ALTER TABLE orders ADD COLUMN total_amount DECIMAL(10,2) NULL COMMENT ''Order total amount'' AFTER people_count'
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
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND INDEX_NAME = 'idx_order'
  ),
  'SELECT "order_items.idx_order already exists" AS message',
  'CREATE INDEX idx_order ON order_items (order_id)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND INDEX_NAME = 'idx_dish'
  ),
  'SELECT "order_items.idx_dish already exists" AS message',
  'CREATE INDEX idx_dish ON order_items (dish_id)'
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
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wishlists' AND INDEX_NAME = 'idx_user'
  ),
  'SELECT "wishlists.idx_user already exists" AS message',
  'CREATE INDEX idx_user ON wishlists (user_id)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE ai_avatars
  MODIFY COLUMN id VARCHAR(36) NOT NULL COMMENT 'Record ID',
  MODIFY COLUMN user_id VARCHAR(36) NOT NULL COMMENT 'User ID',
  MODIFY COLUMN avatar_url TEXT NOT NULL COMMENT 'Avatar URL',
  MODIFY COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time';

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'dishes'
      AND COLUMN_NAME = 'category_id'
      AND REFERENCED_TABLE_NAME = 'categories'
      AND REFERENCED_COLUMN_NAME = 'id'
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
      AND COLUMN_NAME = 'user_id'
      AND REFERENCED_TABLE_NAME = 'users'
      AND REFERENCED_COLUMN_NAME = 'id'
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
      AND COLUMN_NAME = 'order_id'
      AND REFERENCED_TABLE_NAME = 'orders'
      AND REFERENCED_COLUMN_NAME = 'id'
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
      AND COLUMN_NAME = 'dish_id'
      AND REFERENCED_TABLE_NAME = 'dishes'
      AND REFERENCED_COLUMN_NAME = 'id'
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
      AND COLUMN_NAME = 'user_id'
      AND REFERENCED_TABLE_NAME = 'users'
      AND REFERENCED_COLUMN_NAME = 'id'
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
      AND COLUMN_NAME = 'user_id'
      AND REFERENCED_TABLE_NAME = 'users'
      AND REFERENCED_COLUMN_NAME = 'id'
  ),
  'SELECT "fk_ai_avatars_user already exists" AS message',
  'ALTER TABLE ai_avatars ADD CONSTRAINT fk_ai_avatars_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

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
('dish-1', 'cat-signature', '北京烤鸭', '传统挂炉烤制，皮酥肉嫩，配荷叶饼、甜面酱', 'https://images.unsplash.com/photo-1518492104633-130d0cc84637?auto=format&fit=crop&w=600&q=80', '热销', 1, 1),
('dish-2', 'cat-hot', '宫保鸡丁', '川菜经典，鸡肉嫩滑，花生香脆，酸甜微辣', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80', '热销', 1, 2),
('dish-3', 'cat-hot', '麻婆豆腐', '豆腐细嫩入味，麻香浓郁，适合配米饭', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80', '热销', 1, 3),
('dish-4', 'cat-hot', '糖醋里脊', '酸甜开胃，外酥里嫩，适合全家共享', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80', '推荐', 1, 4),
('dish-5', 'cat-cold', '凉拌黄瓜', '清爽开胃，蒜香浓郁，夏日必备凉菜', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80', '清爽', 1, 5),
('dish-6', 'cat-cold', '皮蛋豆腐', '经典凉菜，口感细腻，配特制酱汁', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', '经典', 1, 6),
('dish-7', 'cat-dessert', '蛋挞', '酥脆外皮，香滑蛋奶馅，下午茶首选', 'https://images.unsplash.com/photo-1558303006-1f76f15dca82?auto=format&fit=crop&w=600&q=80', '甜品', 1, 7),
('dish-8', 'cat-dessert', '芒果布丁', '新鲜芒果制作，口感顺滑，甜而不腻', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80', '人气', 1, 8),
('dish-9', 'cat-staple', '扬州炒饭', '粒粒分明，配料丰富，经典主食', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80', '主食', 1, 9),
('dish-10', 'cat-staple', '葱油拌面', '葱香四溢，面条劲道，简单美味', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80', '主食', 1, 10),
('dish-11', 'cat-seafood', '清蒸鲈鱼', '新鲜鲈鱼，清蒸保留原味，鲜嫩可口', 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?auto=format&fit=crop&w=600&q=80', '海鲜', 1, 11),
('dish-12', 'cat-seafood', '蒜蓉粉丝蒸扇贝', '扇贝鲜美，蒜香浓郁，粉丝入味', 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80', '海鲜', 1, 12)
ON DUPLICATE KEY UPDATE name = VALUES(name);

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'database initialization completed' AS message;
SELECT COUNT(*) AS category_count FROM categories;
SELECT COUNT(*) AS dish_count FROM dishes;
