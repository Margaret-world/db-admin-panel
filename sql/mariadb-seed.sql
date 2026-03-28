-- ============================================================
--  DB Admin Panel — Test Seed Data (MariaDB)
--  Database: db_admin_test
-- ============================================================

CREATE DATABASE IF NOT EXISTS db_admin_test
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE db_admin_test;

-- ------------------------------------------------------------
-- 1. users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
                                     id         INT          NOT NULL AUTO_INCREMENT  COMMENT 'Primary key',
                                     name       VARCHAR(100) NOT NULL                 COMMENT 'Full name',
                                     email      VARCHAR(200) NOT NULL                 COMMENT 'Login email',
                                     role       VARCHAR(50)  NOT NULL DEFAULT 'viewer' COMMENT 'admin | editor | viewer',
                                     status     TINYINT(1)   NOT NULL DEFAULT 1        COMMENT '1=active 0=disabled',
                                     created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                     updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                     PRIMARY KEY (id),
                                     UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB COMMENT='Application users';

INSERT INTO users (name, email, role, status) VALUES
                                                  ('Alice Chen',    'alice@acme.com',   'admin',  1),
                                                  ('Bob Miller',    'bob@acme.com',     'editor', 1),
                                                  ('Carol Smith',   'carol@acme.com',   'viewer', 1),
                                                  ('David Park',    'david@acme.com',   'editor', 1),
                                                  ('Eva Torres',    'eva@acme.com',     'admin',  1),
                                                  ('Frank Liu',     'frank@acme.com',   'viewer', 0),
                                                  ('Grace Kim',     'grace@acme.com',   'editor', 1),
                                                  ('Henry Zhang',   'henry@acme.com',   'viewer', 1);

-- ------------------------------------------------------------
-- 2. categories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
                                          id         INT          NOT NULL AUTO_INCREMENT,
                                          name       VARCHAR(100) NOT NULL,
                                          slug       VARCHAR(100) NOT NULL,
                                          parent_id  INT              NULL COMMENT 'Self-referencing FK',
                                          sort_order INT          NOT NULL DEFAULT 0,
                                          PRIMARY KEY (id),
                                          UNIQUE KEY uq_categories_slug (slug),
                                          KEY        idx_categories_parent (parent_id)
) ENGINE=InnoDB COMMENT='Product categories';

INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
                                                               ('Electronics',      'electronics',       NULL, 1),
                                                               ('Phones',           'phones',            1,    1),
                                                               ('Laptops',          'laptops',           1,    2),
                                                               ('Accessories',      'accessories',       1,    3),
                                                               ('Clothing',         'clothing',          NULL, 2),
                                                               ('T-Shirts',         't-shirts',          5,    1),
                                                               ('Jackets',          'jackets',           5,    2),
                                                               ('Subscriptions',    'subscriptions',     NULL, 3);

-- ------------------------------------------------------------
-- 3. products
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
                                        id          INT            NOT NULL AUTO_INCREMENT,
                                        category_id INT            NOT NULL,
                                        name        VARCHAR(150)   NOT NULL,
                                        sku         VARCHAR(80)    NOT NULL,
                                        price       DECIMAL(10,2)  NOT NULL,
                                        stock       INT            NOT NULL DEFAULT 0,
                                        is_active   TINYINT(1)     NOT NULL DEFAULT 1,
                                        description TEXT               NULL,
                                        created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                        PRIMARY KEY (id),
                                        UNIQUE KEY  uq_products_sku (sku),
                                        KEY         idx_products_category (category_id)
) ENGINE=InnoDB COMMENT='Product catalogue';

INSERT INTO products (category_id, name, sku, price, stock, is_active, description) VALUES
                                                                                        (2, 'iPhone 15 Pro',         'SKU-IP15P',   1199.00, 42,  1, 'Apple iPhone 15 Pro 256GB'),
                                                                                        (2, 'Samsung Galaxy S24',    'SKU-SGS24',    899.00, 67,  1, 'Samsung Galaxy S24 128GB'),
                                                                                        (3, 'MacBook Air M3',        'SKU-MBA-M3',  1299.00, 18,  1, 'Apple MacBook Air 13" M3'),
                                                                                        (3, 'Dell XPS 15',           'SKU-XPS15',   1499.00, 11,  1, 'Dell XPS 15 OLED 2024'),
                                                                                        (4, 'USB-C Hub 7-in-1',      'SKU-USBC7',     49.00, 200, 1, NULL),
                                                                                        (4, 'Wireless Charger Pad',  'SKU-WCHG',      29.00, 150, 1, NULL),
                                                                                        (6, 'Classic White Tee',     'SKU-TEE-W',     19.00, 300, 1, '100% cotton unisex tee'),
                                                                                        (7, 'Rain Jacket Navy',      'SKU-JKT-N',     89.00,  55, 1, 'Waterproof lightweight jacket'),
                                                                                        (8, 'Pro Plan Monthly',      'SKU-PRO-M',     49.00,   0, 1, 'Monthly subscription'),
                                                                                        (8, 'Enterprise Annual',     'SKU-ENT-A',   2999.00,   0, 1, 'Annual enterprise plan');

-- ------------------------------------------------------------
-- 4. orders
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
                                      id           INT           NOT NULL AUTO_INCREMENT,
                                      user_id      INT           NOT NULL,
                                      status       VARCHAR(30)   NOT NULL DEFAULT 'pending' COMMENT 'pending|paid|shipped|cancelled',
                                      total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                                      note         VARCHAR(500)      NULL,
                                      created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                      updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                      PRIMARY KEY (id),
                                      KEY idx_orders_user   (user_id),
                                      KEY idx_orders_status (status)
) ENGINE=InnoDB COMMENT='Customer orders';

INSERT INTO orders (user_id, status, total_amount, note) VALUES
                                                             (1, 'paid',      1248.00, NULL),
                                                             (2, 'paid',       918.00, 'Gift wrap please'),
                                                             (3, 'pending',   1299.00, NULL),
                                                             (1, 'shipped',     78.00, NULL),
                                                             (4, 'paid',      1588.00, NULL),
                                                             (5, 'cancelled',   49.00, 'Changed mind'),
                                                             (2, 'paid',       108.00, NULL),
                                                             (7, 'pending',   1199.00, NULL);

-- ------------------------------------------------------------
-- 5. order_items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
                                           id         INT           NOT NULL AUTO_INCREMENT,
                                           order_id   INT           NOT NULL,
                                           product_id INT           NOT NULL,
                                           quantity   INT           NOT NULL DEFAULT 1,
                                           unit_price DECIMAL(10,2) NOT NULL,
                                           PRIMARY KEY (id),
                                           KEY idx_order_items_order   (order_id),
                                           KEY idx_order_items_product (product_id)
) ENGINE=InnoDB COMMENT='Line items per order';

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
                                                                         (1, 1,  1, 1199.00),
                                                                         (1, 5,  1,   49.00),
                                                                         (2, 2,  1,  899.00),
                                                                         (2, 6,  1,   19.00),
                                                                         (3, 3,  1, 1299.00),
                                                                         (4, 5,  1,   49.00),
                                                                         (4, 6,  1,   29.00),
                                                                         (5, 4,  1, 1499.00),
                                                                         (5, 7,  1,   89.00),
                                                                         (6, 9,  1,   49.00),
                                                                         (7, 7,  1,   89.00),
                                                                         (7, 8,  1,   19.00),
                                                                         (8, 1,  1, 1199.00);

-- ------------------------------------------------------------
-- 6. tags  (many-to-many with products via product_tags)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
                                    id   INT         NOT NULL AUTO_INCREMENT,
                                    name VARCHAR(80) NOT NULL,
                                    PRIMARY KEY (id),
                                    UNIQUE KEY uq_tags_name (name)
) ENGINE=InnoDB COMMENT='Product tags';

INSERT INTO tags (name) VALUES
                            ('new-arrival'), ('bestseller'), ('sale'), ('featured'), ('digital');

CREATE TABLE IF NOT EXISTS product_tags (
                                            product_id INT NOT NULL,
                                            tag_id     INT NOT NULL,
                                            PRIMARY KEY (product_id, tag_id),
                                            KEY idx_product_tags_tag (tag_id)
) ENGINE=InnoDB COMMENT='Product ↔ Tag junction';

INSERT INTO product_tags (product_id, tag_id) VALUES
                                                  (1, 1), (1, 2),
                                                  (2, 1), (2, 3),
                                                  (3, 2), (3, 4),
                                                  (4, 4),
                                                  (9, 5), (10, 5);

-- ------------------------------------------------------------
-- 7. sessions  (no PK auto-increment — UUID string key)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
                                        id         VARCHAR(36)  NOT NULL COMMENT 'UUID session token',
                                        user_id    INT          NOT NULL,
                                        ip_address VARCHAR(45)      NULL,
                                        user_agent VARCHAR(300)     NULL,
                                        expires_at DATETIME     NOT NULL,
                                        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                        PRIMARY KEY (id),
                                        KEY idx_sessions_user    (user_id),
                                        KEY idx_sessions_expires (expires_at)
) ENGINE=InnoDB COMMENT='Active user sessions';

INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at) VALUES
                                                                           ('a1b2c3d4-0001-0001-0001-000000000001', 1, '192.168.1.10', 'Mozilla/5.0 Chrome/120', DATE_ADD(NOW(), INTERVAL 7 DAY)),
                                                                           ('a1b2c3d4-0002-0002-0002-000000000002', 2, '10.0.0.22',    'Mozilla/5.0 Firefox/121', DATE_ADD(NOW(), INTERVAL 7 DAY)),
                                                                           ('a1b2c3d4-0003-0003-0003-000000000003', 5, '172.16.0.5',   'Mozilla/5.0 Safari/17',  DATE_ADD(NOW(), INTERVAL 1 DAY));

-- ------------------------------------------------------------
-- Done
-- ------------------------------------------------------------
SELECT 'Seed complete!' AS message;
SELECT table_name, table_rows, table_comment
FROM information_schema.tables
WHERE table_schema = 'db_admin_test'
ORDER BY table_name;