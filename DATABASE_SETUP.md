# Настройка базы данных

## Создание таблицы bi_test

### Способ 1: Через SQL скрипт (рекомендуется)

1. Подключитесь к MySQL:
```bash
mysql -u root -p
```

2. Выполните SQL скрипт:
```sql
SOURCE database/schema.example.sql;
```

Или:
```bash
mysql -u root -p stock_sync < database/schema.example.sql
```

### Способ 2: Автоматическое создание через Sequelize

При первом запуске сервиса Sequelize автоматически создаст таблицу, если её нет:

```bash
npm start
```

В файле `server.js` есть строка:
```javascript
await db.sequelize.sync({ alter: false });
```

Для создания/обновления таблицы измените на:
```javascript
await db.sequelize.sync({ alter: true });
```

**Внимание:** Используйте `alter: true` только для разработки!

### Способ 3: Вручную через MySQL клиент

Скопируйте SQL из файла `database/schema.example.sql` и выполните в MySQL Workbench, phpMyAdmin или другом клиенте.

---

## Структура таблицы dbo.pbi_test

**Полный путь:** `[database].dbo.pbi_test`  
**Схема:** `dbo` (database owner - схема по умолчанию)

| Поле | Тип | Описание | Источник из API |
|------|-----|----------|-----------------|
| `id` | BIGINT | ID записи (автоинкремент) | - |
| `id_prod` | NVARCHAR(36) | ID товара (UUID) | Извлекается из `meta.href` |
| `id_warehouse` | NVARCHAR(36) | ID склада (UUID) | ID склада из запроса |
| `date` | DATETIMEOFFSET(7) | Дата/время с часовым поясом | Текущая дата/время |
| `qty_stock` | INT | Остаток на складе | `stock` (приведено к INT) |
| `qty_reserved` | INT | Зарезервировано | `reserve` (приведено к INT) |
| `qty_available` | INT | Доступно | `quantity` (приведено к INT) |
| `qty_in_transit` | INT | В пути | `inTransit` (приведено к INT) |
| `avg_cost` | DECIMAL(9,2) | Средняя стоимость с копейками | `price / 100` (с 2 знаками) |
| `days_on_stock` | INT | Дней на складе | `stockDays` (приведено к INT) |

---

## Извлечение id_prod из API

Из поля `meta.href` извлекается UUID товара:

**Пример href:**
```
https://api.moysklad.ru/api/remap/1.2/entity/product/ead24d29-685f-11ea-0a80-009f000b0e46?expand=supplier
```

**Извлекается:**
```
ead24d29-685f-11ea-0a80-009f000b0e46
```

---

## Индексы

Созданы следующие индексы для оптимизации запросов:

1. `idx_id_prod` - для быстрого поиска по товару
2. `idx_id_warehouse` - для быстрого поиска по складу
3. `idx_date` - для фильтрации по дате
4. `idx_warehouse_date` - для комбинированного поиска
5. `idx_prod_warehouse` - для связи товар-склад

---

## Проверка создания таблицы

```sql
USE stock_sync;
SHOW TABLES;
DESCRIBE bi_test;
```

Или через тест:
```bash
npm run test:db
```

---

## Примеры запросов

### Получить все записи по складу
```sql
SELECT TOP 100 * FROM dbo.pbi_test 
WHERE id_warehouse = '6599a08d-9475-4601-8518-d6175cf12aeb'
ORDER BY [date] DESC;
```

### Получить последние остатки по товару
```sql
SELECT TOP 10 * FROM dbo.pbi_test 
WHERE id_prod = 'ead24d29-685f-11ea-0a80-009f000b0e46'
ORDER BY [date] DESC;
```

### Статистика по складу за дату
```sql
SELECT 
  CAST(sync_date AS DATE) as sync_date,
  COUNT(*) as total_products,
  SUM(qty_stock) as total_stock,
  SUM(qty_available) as total_available
FROM dbo.pbi_test 
WHERE id_warehouse = '6599a08d-9475-4601-8518-d6175cf12aeb'
  AND CAST(sync_date AS DATE) = '2025-12-02'
GROUP BY CAST(sync_date AS DATE);
```

### Товары с нулевыми остатками
```sql
SELECT id_prod, id_warehouse, [date]
FROM dbo.pbi_test 
WHERE qty_stock = 0
  AND CAST([date] AS DATE) = CAST(GETDATE() AS DATE)
ORDER BY id_prod;
```

---

## Устранение проблем

### Ошибка: "Table doesn't exist"
Создайте таблицу вручную:
```bash
mysql -u root -p stock_sync < database/schema.example.sql
```

### Ошибка: "Unknown column"
Структура таблицы не соответствует модели. Пересоздайте таблицу:
```sql
DROP TABLE bi_test;
SOURCE database/schema.example.sql;
```

### Ошибка: "Duplicate entry"
Если нужно избежать дублей, добавьте уникальный индекс:
```sql
ALTER TABLE bi_test 
ADD UNIQUE INDEX unique_prod_warehouse_date (id_prod, id_warehouse, date);
```

**Примечание:** Это предотвратит повторную вставку одних и тех же данных.

---

## Очистка данных

### Удалить все данные
```sql
TRUNCATE TABLE dbo.pbi_test;
```

### Удалить данные старше N дней
```sql
DELETE FROM dbo.pbi_test 
WHERE [date] < DATEADD(DAY, -30, GETDATE());
```

### Удалить данные по конкретному складу
```sql
DELETE FROM dbo.pbi_test 
WHERE id_warehouse = '6599a08d-9475-4601-8518-d6175cf12aeb';
```

---

## Резервное копирование

### Создать резервную копию (MS SQL)
```sql
BACKUP DATABASE stock_sync 
TO DISK = 'C:\Backup\stock_sync.bak'
WITH FORMAT, INIT;
```

### Восстановить из резервной копии (MS SQL)
```sql
USE master;
GO
RESTORE DATABASE stock_sync 
FROM DISK = 'C:\Backup\stock_sync.bak'
WITH REPLACE;
GO
```

---

## Мониторинг размера таблицы

```sql
SELECT 
    SCHEMA_NAME(t.schema_id) + '.' + t.NAME AS TableName,
    p.rows AS RowCounts,
    SUM(a.total_pages) * 8 / 1024 AS TotalSpaceMB,
    SUM(a.used_pages) * 8 / 1024 AS UsedSpaceMB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.OBJECT_ID = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE t.NAME = 'pbi_test' AND t.schema_id = SCHEMA_ID('dbo')
GROUP BY t.schema_id, t.Name, p.Rows;
```

