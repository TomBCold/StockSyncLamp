-- Структура таблицы для хранения остатков товаров из МойСклад
-- Таблица: bi_test

-- Создание базы данных (если не существует)
CREATE DATABASE IF NOT EXISTS stock_sync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE stock_sync;

-- Удаление таблицы если существует (опционально, для пересоздания)
-- DROP TABLE IF EXISTS bi_test;

-- Таблица остатков товаров из МойСклад
CREATE TABLE IF NOT EXISTS bi_test (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'ID записи (автоинкремент)',
  
  -- Идентификаторы
  id_prod VARCHAR(36) NOT NULL COMMENT 'ID товара из МойСклад (UUID)',
  id_warehouse VARCHAR(36) NOT NULL COMMENT 'ID склада из МойСклад (UUID)',
  
  -- Дата синхронизации
  date DATETIME NOT NULL COMMENT 'Дата и время синхронизации',
  
  -- Остатки
  qty_stock INT DEFAULT 0 COMMENT 'Остаток на складе (stock)',
  qty_reserved INT DEFAULT 0 COMMENT 'Зарезервировано (reserve)',
  qty_available INT DEFAULT 0 COMMENT 'Доступно (quantity)',
  qty_in_transit INT DEFAULT 0 COMMENT 'В пути (inTransit)',
  
  -- Финансовые данные
  avg_cost INT DEFAULT 0 COMMENT 'Средняя стоимость (price/100)',
  
  -- Аналитика
  days_on_stock INT DEFAULT 0 COMMENT 'Дней на складе (stockDays)',
  
  -- Индексы для оптимизации запросов
  INDEX idx_id_prod (id_prod),
  INDEX idx_id_warehouse (id_warehouse),
  INDEX idx_date (date),
  INDEX idx_warehouse_date (id_warehouse, date),
  INDEX idx_prod_warehouse (id_prod, id_warehouse)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Остатки товаров из МойСклад';

-- Примечания:
-- 1. id_prod извлекается из meta.href после /entity/product/ и до ?
-- 2. id_warehouse - это ID склада, по которому запрашивалась информация
-- 3. date - текущая дата/время синхронизации
-- 4. Все количественные поля (qty_*) приводятся к INT
-- 5. avg_cost = price / 100 (приводится к INT)
-- 6. days_on_stock = stockDays (приводится к INT)

