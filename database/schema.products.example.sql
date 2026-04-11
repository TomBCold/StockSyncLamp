-- Справочник товаров: dbo.pbi_products
--
-- Источник схемы при первом запуске приложения — Sequelize (см. server.js: sequelize.sync).
-- Определение колонок и типов строится из product_fields.txt + utils/fieldMapping.js
-- (в т.ч. JSON-колонка attributes по utils/mappedAttributesRules.js).
--
-- Важно:
--   • При отсутствии таблицы она создаётся автоматически при старте сервера (sync с подключённой БД).
--   • Используется sync({ alter: false }): новые таблицы создаются целиком по текущим моделям,
--     но уже существующие таблицы НЕ изменяются (новые колонки из маппинга нужно добавлять вручную
--     или временно включить alter: true только в среде разработки — см. DATABASE_SETUP.md).
--
-- Ручной скрипт CREATE ниже не является актуальным перечнем колонок; для миграций ориентируйтесь
-- на модель Product и product_fields.txt.

USE [stock_sync]
GO

-- Пример условного создания только если нужен пустой каркас без Node (не рекомендуется как основной путь):
-- IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'pbi_products' AND schema_id = SCHEMA_ID('dbo'))
--   CREATE TABLE [dbo].[pbi_products] ( ... );

PRINT N'Схема pbi_products задаётся приложением через Sequelize; см. комментарии в начале файла.';
GO
