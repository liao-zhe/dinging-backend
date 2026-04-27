-- ============================================
-- Family Chef - database initialization script
-- Database: homechef
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY COMMENT 'User ID (UUID)',
  openid VARCHAR(100) UNIQUE NOT NULL COMMENT 'WeChat openid',
  nickname VARCHAR(50) COMMENT 'Nickname',
  avatar_url TEXT COMMENT 'Avatar URL',
  phone VARCHAR(20) COMMENT 'Phone number',
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
  INDEX idx_sort (sort_order),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dishes';

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY COMMENT 'Order ID',
  user_id VARCHAR(36) NOT NULL COMMENT 'User ID',
  order_no VARCHAR(20) UNIQUE NOT NULL COMMENT 'Order number',
  order_date DATE NOT NULL COMMENT 'Order date',
  meal_type VARCHAR(20) NOT NULL COMMENT 'Meal type',
  people_count INT NOT NULL COMMENT 'People count',
  status VARCHAR(20) DEFAULT 'pending' COMMENT 'Order status',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time',
  INDEX idx_user (user_id),
  INDEX idx_order_no (order_no),
  INDEX idx_status (status),
  INDEX idx_date (order_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Orders';

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(36) PRIMARY KEY COMMENT 'Order item ID',
  order_id VARCHAR(36) NOT NULL COMMENT 'Order ID',
  dish_id VARCHAR(36) NOT NULL COMMENT 'Dish ID',
  dish_name VARCHAR(100) NOT NULL COMMENT 'Dish name snapshot',
  dish_image TEXT COMMENT 'Dish image snapshot',
  quantity INT NOT NULL COMMENT 'Quantity',
  INDEX idx_order (order_id),
  INDEX idx_dish (dish_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Order items';

CREATE TABLE IF NOT EXISTS wishlists (
  id VARCHAR(36) PRIMARY KEY COMMENT 'Wishlist ID',
  user_id VARCHAR(36) NOT NULL COMMENT 'User ID',
  dish_name VARCHAR(100) NOT NULL COMMENT 'Dish name',
  image_url TEXT COMMENT 'Image URL',
  remark TEXT COMMENT 'Remark',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  INDEX idx_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Wishlists';

CREATE TABLE IF NOT EXISTS ai_avatars (
  id VARCHAR(36) PRIMARY KEY COMMENT 'Record ID',
  user_id VARCHAR(36) UNIQUE NOT NULL COMMENT 'User ID',
  avatar_url TEXT NOT NULL COMMENT 'Avatar URL',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI avatars';

INSERT INTO categories (id, name, sort_order, is_active) VALUES
('cat-signature', '招牌菜', 1, 1),
('cat-hot', '热菜', 2, 1),
('cat-cold', '凉菜', 3, 1),
('cat-dessert', '点心', 4, 1),
('cat-staple', '主食', 5, 1),
('cat-seafood', '海鲜', 6, 1)
ON DUPLICATE KEY UPDATE name=VALUES(name);

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
ON DUPLICATE KEY UPDATE name=VALUES(name);

SELECT 'database initialization completed' AS message;
SELECT COUNT(*) AS category_count FROM categories;
SELECT COUNT(*) AS dish_count FROM dishes;
