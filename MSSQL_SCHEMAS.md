# Работа со схемами в MS SQL Server

## Что такое схемы?

В MS SQL Server **схема** (schema) - это контейнер для объектов базы данных (таблиц, представлений, процедур и т.д.). Схема позволяет логически группировать объекты и управлять доступом к ним.

**Формат полного имени объекта:**
```
[database].[schema].[object]
```

**Примеры:**
- `stock_sync.dbo.pbi_test` - полный путь к таблице
- `dbo.pbi_test` - если БД уже выбрана (USE stock_sync)
- `pbi_test` - если схема `dbo` используется по умолчанию

---

## Схема dbo (Database Owner)

`dbo` - это схема по умолчанию в MS SQL Server.

**Особенности:**
- Создается автоматически при создании БД
- Используется по умолчанию, если схема не указана
- Владелец - роль `db_owner`

**В нашем проекте:**
```javascript
{
  tableName: 'pbi_test',
  schema: 'dbo'  // Схема указана явно
}
```

Sequelize будет обращаться к таблице как `dbo.pbi_test`

---

## Просмотр схем в БД

### Список всех схем
```sql
SELECT name, schema_id
FROM sys.schemas
ORDER BY name;
```

### Таблицы в конкретной схеме
```sql
SELECT 
    s.name AS SchemaName,
    t.name AS TableName,
    t.create_date
FROM sys.tables t
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE s.name = 'dbo'
ORDER BY t.name;
```

### Все объекты в схеме dbo
```sql
SELECT 
    SCHEMA_NAME(schema_id) AS SchemaName,
    name AS ObjectName,
    type_desc AS ObjectType,
    create_date
FROM sys.objects
WHERE schema_id = SCHEMA_ID('dbo')
ORDER BY type_desc, name;
```

---

## Создание собственной схемы

### Создать схему
```sql
CREATE SCHEMA myschema;
GO
```

### Создать таблицу в своей схеме
```sql
CREATE TABLE myschema.pbi_test (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100)
);
GO
```

### В Sequelize для другой схемы
```javascript
{
  tableName: 'pbi_test',
  schema: 'myschema'  // Своя схема вместо dbo
}
```

---

## Проверка текущей схемы

### Схема по умолчанию для пользователя
```sql
SELECT SCHEMA_NAME() AS CurrentSchema;
```

### Схема конкретного пользователя
```sql
SELECT default_schema_name 
FROM sys.database_principals 
WHERE name = 'sa';
```

---

## Полный путь к таблице в проекте

В нашем проекте используется:

**Полный путь:** `[stock_sync].dbo.pbi_test`

Где:
- `stock_sync` - имя базы данных
- `dbo` - схема (database owner)
- `pbi_test` - имя таблицы

**В SQL запросах можно использовать:**
```sql
-- Полный путь (если работаете с другой БД)
SELECT * FROM stock_sync.dbo.pbi_test;

-- Путь со схемой (если уже в нужной БД)
USE stock_sync;
SELECT * FROM dbo.pbi_test;

-- Только имя таблицы (если схема dbo - по умолчанию)
SELECT * FROM pbi_test;
```

**Рекомендация:** Всегда указывайте схему явно (`dbo.pbi_test`), чтобы избежать путаницы.

---

## Права доступа к схемам

### Предоставить права на схему
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO username;
GO
```

### Предоставить права на конкретную таблицу
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.pbi_test TO username;
GO
```

### Проверить права
```sql
SELECT 
    USER_NAME(grantee_principal_id) AS User,
    permission_name,
    state_desc
FROM sys.database_permissions
WHERE major_id = OBJECT_ID('dbo.pbi_test');
```

---

## Sequelize и схемы

### Настройка в модели
```javascript
const Stock = sequelize.define('Stock', {
  // ... поля
}, {
  tableName: 'pbi_test',
  schema: 'dbo',  // ← Указание схемы
  timestamps: false
});
```

### Sequelize автоматически:
1. Формирует запросы с указанием схемы
2. Создает таблицу в нужной схеме
3. Работает с индексами в контексте схемы

### Примеры сгенерированных запросов:
```sql
-- SELECT
SELECT * FROM [dbo].[pbi_test];

-- INSERT
INSERT INTO [dbo].[pbi_test] (id_prod, id_warehouse, ...) VALUES (...);

-- CREATE TABLE
CREATE TABLE [dbo].[pbi_test] (...);
```

---

## Несколько схем в проекте

Если в будущем понадобится работать с несколькими схемами:

```javascript
// Модель в схеме dbo
const StockDbo = sequelize.define('Stock', {...}, {
  schema: 'dbo',
  tableName: 'pbi_test'
});

// Модель в другой схеме
const StockArchive = sequelize.define('StockArchive', {...}, {
  schema: 'archive',
  tableName: 'pbi_test_archive'
});
```

---

## Миграция между схемами

### Переместить таблицу в другую схему
```sql
ALTER SCHEMA newschema TRANSFER dbo.pbi_test;
GO
```

### Скопировать данные между схемами
```sql
INSERT INTO newschema.pbi_test
SELECT * FROM dbo.pbi_test;
GO
```

---

## Типичные схемы в Enterprise проектах

| Схема | Назначение |
|-------|-----------|
| `dbo` | Основные таблицы (по умолчанию) |
| `archive` | Архивные данные |
| `staging` | Временные данные для ETL |
| `reporting` | Представления для отчетов |
| `audit` | Логи и аудит |
| `import` | Данные импорта |

В нашем проекте используется только `dbo` - это стандартный подход для большинства приложений.

---

## Устранение проблем

### Ошибка: "Invalid object name 'pbi_test'"

**Причина:** Таблица не найдена или находится в другой схеме.

**Решение:**
```sql
-- Проверьте существование таблицы
SELECT * FROM sys.tables WHERE name = 'pbi_test';

-- Если таблица существует, но в другой схеме:
SELECT SCHEMA_NAME(schema_id) + '.' + name 
FROM sys.tables 
WHERE name = 'pbi_test';
```

### Ошибка: "The specified schema name 'dbo' either does not exist..."

**Причина:** Схема не существует (очень редко, так как dbo создается автоматически).

**Решение:**
```sql
CREATE SCHEMA dbo;
GO
```

---

## Полезные запросы

### Размер всех таблиц в схеме dbo
```sql
SELECT 
    SCHEMA_NAME(t.schema_id) AS SchemaName,
    t.name AS TableName,
    p.rows AS RowCounts,
    SUM(a.total_pages) * 8 / 1024 AS TotalSpaceMB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.OBJECT_ID = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE t.schema_id = SCHEMA_ID('dbo')
GROUP BY t.schema_id, t.name, p.Rows
ORDER BY TotalSpaceMB DESC;
```

### Список индексов таблицы с учетом схемы
```sql
SELECT 
    SCHEMA_NAME(t.schema_id) + '.' + t.name AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE t.name = 'pbi_test' AND t.schema_id = SCHEMA_ID('dbo')
ORDER BY i.name;
```

---

## Итог

В проекте **Stock Sync** используется стандартная схема `dbo`:

✅ **В Sequelize:** указано `schema: 'dbo'`  
✅ **В SQL:** используется `dbo.pbi_test`  
✅ **Полный путь:** `stock_sync.dbo.pbi_test`

Это стандартный и рекомендуемый подход для большинства проектов на MS SQL Server.

