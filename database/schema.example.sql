-- Структура таблицы для хранения остатков товаров из МойСклад
-- Таблица: dbo.pbi_test
-- СУБД: Microsoft SQL Server

-- Создание базы данных (если не существует)
-- Раскомментируйте если нужно создать БД:
-- CREATE DATABASE stock_sync;
-- GO

USE stock_sync;
GO

-- Удаление таблицы если существует (опционально, для пересоздания)
-- DROP TABLE IF EXISTS dbo.pbi_test;
-- GO

-- Таблица остатков товаров из МойСклад
-- Полный путь: [database].dbo.pbi_test
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pbi_test' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.pbi_test (
        -- ID записи (автоинкремент)
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        
        -- Идентификаторы
        id_prod VARCHAR(36) NOT NULL,
        id_warehouse VARCHAR(36) NOT NULL,
        
        -- Дата синхронизации
        [date] DATETIME2 NOT NULL,
        
        -- Остатки
        qty_stock INT DEFAULT 0,
        qty_reserved INT DEFAULT 0,
        qty_available INT DEFAULT 0,
        qty_in_transit INT DEFAULT 0,
        
        -- Финансовые данные
        avg_cost INT DEFAULT 0,
        
        -- Аналитика
        days_on_stock INT DEFAULT 0
    );
    
    -- Индексы для оптимизации запросов
    CREATE INDEX idx_id_prod ON dbo.pbi_test(id_prod);
    CREATE INDEX idx_id_warehouse ON dbo.pbi_test(id_warehouse);
    CREATE INDEX idx_date ON dbo.pbi_test([date]);
    CREATE INDEX idx_warehouse_date ON dbo.pbi_test(id_warehouse, [date]);
    CREATE INDEX idx_prod_warehouse ON dbo.pbi_test(id_prod, id_warehouse);
    
    PRINT 'Таблица dbo.pbi_test успешно создана';
END
ELSE
BEGIN
    PRINT 'Таблица dbo.pbi_test уже существует';
END
GO

-- Проверка создания таблицы
SELECT 
    SCHEMA_NAME(schema_id) + '.' + name AS TableName,
    create_date AS CreatedDate
FROM sys.tables 
WHERE name = 'pbi_test';
GO

-- Примечания:
-- 1. id_prod извлекается из meta.href после /entity/product/ и до ?
-- 2. id_warehouse - это ID склада, по которому запрашивалась информация
-- 3. date - текущая дата/время синхронизации
-- 4. Все количественные поля (qty_*) приводятся к INT
-- 5. avg_cost = price / 100 (приводится к INT)
-- 6. days_on_stock = stockDays (приводится к INT)

