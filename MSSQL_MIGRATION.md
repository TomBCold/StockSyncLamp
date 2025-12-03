# Миграция на MS SQL Server

## Что изменено

Проект переведен с MySQL на Microsoft SQL Server.

### Основные изменения:

1. **Драйвер БД**: `mysql2` → `tedious`
2. **Порт по умолчанию**: `3306` → `1433`
3. **Диалект Sequelize**: `mysql` → `mssql`
4. **SQL синтаксис**: Адаптирован под MS SQL

---

## Установка зависимостей

### 1. Удалите старые зависимости
```cmd
npm uninstall mysql2
```

### 2. Установите новые зависимости
```cmd
npm install tedious
```

Или установите все заново:
```cmd
npm install
```

---

## Настройка подключения

### 1. Обновите файл `.env`

```env
# Database Configuration (MS SQL Server)
DB_HOST=localhost
DB_PORT=1433
DB_NAME=stock_sync
DB_USER=sa
DB_PASSWORD=YourStrongPassword123

# Дополнительные параметры
DB_ENCRYPT=false                   # true для Azure SQL
DB_TRUST_CERT=true                # true для локальных БД
DB_INSTANCE=                      # Для именованных экземпляров (SQLEXPRESS и т.д.)
```

### Параметры подключения:

| Параметр | Описание | Значение по умолчанию |
|----------|----------|----------------------|
| `DB_HOST` | Адрес сервера | `localhost` |
| `DB_PORT` | Порт MS SQL | `1433` |
| `DB_USER` | Пользователь | `sa` |
| `DB_PASSWORD` | Пароль | - |
| `DB_NAME` | Имя БД | `stock_sync` |
| `DB_ENCRYPT` | Шифрование (для Azure) | `false` |
| `DB_TRUST_CERT` | Доверять сертификату | `true` |
| `DB_INSTANCE` | Имя экземпляра | - |

---

## Создание базы данных

### Способ 1: Через SQL Server Management Studio (SSMS)

1. Откройте SSMS
2. Подключитесь к серверу
3. Выполните:
```sql
CREATE DATABASE stock_sync;
GO
```

### Способ 2: Через sqlcmd

```cmd
sqlcmd -S localhost -U sa -P YourPassword
```

```sql
CREATE DATABASE stock_sync;
GO
EXIT
```

### Способ 3: Через PowerShell

```powershell
Invoke-Sqlcmd -ServerInstance "localhost" -Query "CREATE DATABASE stock_sync;" -Username "sa" -Password "YourPassword"
```

---

## Создание таблицы bi_test

### Способ 1: Через SQL скрипт

```cmd
sqlcmd -S localhost -U sa -P YourPassword -d stock_sync -i database\schema.example.sql
```

### Способ 2: Через SSMS

1. Откройте SSMS
2. Подключитесь к БД `stock_sync`
3. Откройте файл `database/schema.example.sql`
4. Выполните скрипт (F5)

### Способ 3: Автоматически через Sequelize

При первом запуске сервиса таблица создастся автоматически:
```cmd
npm start
```

---

## Различия в SQL синтаксисе

### MySQL vs MS SQL

| Аспект | MySQL | MS SQL |
|--------|-------|--------|
| **Автоинкремент** | `AUTO_INCREMENT` | `IDENTITY(1,1)` |
| **Datetime** | `DATETIME` | `DATETIME2` |
| **Кавычки для зарезервированных слов** | `` `date` `` | `[date]` |
| **Условное создание** | `CREATE TABLE IF NOT EXISTS` | `IF NOT EXISTS (SELECT * FROM sys.tables...)` |
| **Комментарии** | `COMMENT 'text'` | Расширенные свойства |
| **Множественные команды** | `;` | `GO` |
| **Engine** | `ENGINE=InnoDB` | Не используется |
| **Charset** | `CHARACTER SET utf8mb4` | По умолчанию Unicode |

---

## Подключение к локальному SQL Server

### Windows Authentication vs SQL Server Authentication

#### Вариант 1: SQL Server Authentication (рекомендуется)

В `.env`:
```env
DB_USER=sa
DB_PASSWORD=YourPassword123
```

#### Вариант 2: Windows Authentication

В `.env`:
```env
DB_USER=
DB_PASSWORD=
```

В `config/database.js` добавьте:
```javascript
dialectOptions: {
  options: {
    trustedConnection: true  // Для Windows Authentication
  }
}
```

---

## Подключение к именованному экземпляру

Для локальных установок часто используется `SQLEXPRESS`:

### В `.env`:
```env
DB_HOST=localhost
DB_INSTANCE=SQLEXPRESS
DB_PORT=
```

Или используйте полное имя:
```env
DB_HOST=localhost\SQLEXPRESS
DB_PORT=
DB_INSTANCE=
```

---

## Подключение к Azure SQL

### В `.env`:
```env
DB_HOST=your-server.database.windows.net
DB_PORT=1433
DB_NAME=stock_sync
DB_USER=your_username@your-server
DB_PASSWORD=your_password
DB_ENCRYPT=true
DB_TRUST_CERT=false
```

---

## Проверка подключения

### 1. Тест через приложение
```cmd
npm run test:db
```

Ожидаемый результат:
```
=== Тестирование подключения к базе данных ===

Параметры подключения:
  Хост: localhost
  Порт: 1433
  База данных: stock_sync
  Пользователь: sa

Попытка подключения...
✓ Подключение к базе данных успешно установлено!

✓ Найдено таблиц: 1
  1. bi_test

Информация о сервере:
  MS SQL версия: Microsoft SQL Server 2019...

✓ Тест завершен успешно!
```

### 2. Прямой тест через sqlcmd
```cmd
sqlcmd -S localhost -U sa -P YourPassword -Q "SELECT @@VERSION"
```

---

## Устранение проблем

### Ошибка: "Login failed for user 'sa'"

**Причины:**
- Неверный пароль
- SQL Server Authentication отключена

**Решение:**
1. Откройте SQL Server Configuration Manager
2. Включите SQL Server Authentication
3. Перезапустите службу SQL Server

### Ошибка: "Cannot open database 'stock_sync'"

**Решение:**
```sql
CREATE DATABASE stock_sync;
GO
```

### Ошибка: "A connection was successfully established, but then an error occurred during the login"

**Причины:**
- Проблема с сертификатом SSL

**Решение:**
В `.env` установите:
```env
DB_TRUST_CERT=true
```

### Ошибка: "Failed to connect to localhost:1433"

**Причины:**
- SQL Server не запущен
- Firewall блокирует порт 1433
- TCP/IP протокол отключен

**Решение:**
1. Проверьте статус службы SQL Server
2. Включите TCP/IP в SQL Server Configuration Manager
3. Перезапустите SQL Server

### Порт 1433 не слушается

В SQL Server Configuration Manager:
1. SQL Server Network Configuration → Protocols for [INSTANCE]
2. TCP/IP → Enabled = Yes
3. TCP/IP → IP Addresses → IPAll → TCP Port = 1433
4. Перезапустите SQL Server

---

## Запуск сервиса

После настройки:

```cmd
# Проверьте подключение к БД
npm run test:db

# Проверьте подключение к API
npm run test:api

# Запустите сервис
npm start
```

---

## Примеры SQL запросов (MS SQL)

### Получить все записи
```sql
SELECT TOP 100 * FROM bi_test 
ORDER BY [date] DESC;
```

### Статистика по складу
```sql
SELECT 
    CAST([date] AS DATE) as sync_date,
    COUNT(*) as total_products,
    SUM(qty_stock) as total_stock,
    SUM(qty_available) as total_available
FROM bi_test 
WHERE id_warehouse = '6599a08d-9475-4601-8518-d6175cf12aeb'
    AND CAST([date] AS DATE) = CAST(GETDATE() AS DATE)
GROUP BY CAST([date] AS DATE);
```

### Очистка старых данных
```sql
DELETE FROM bi_test 
WHERE [date] < DATEADD(DAY, -30, GETDATE());
```

---

## Резервное копирование

### Создать backup
```sql
BACKUP DATABASE stock_sync 
TO DISK = 'C:\Backup\stock_sync.bak'
WITH FORMAT, INIT, NAME = 'stock_sync Full Backup';
GO
```

### Восстановить backup
```sql
USE master;
GO
RESTORE DATABASE stock_sync 
FROM DISK = 'C:\Backup\stock_sync.bak'
WITH REPLACE;
GO
```

---

## Мониторинг

### Размер таблицы
```sql
SELECT 
    t.NAME AS TableName,
    p.rows AS RowCounts,
    SUM(a.total_pages) * 8 / 1024 AS TotalSpaceMB,
    SUM(a.used_pages) * 8 / 1024 AS UsedSpaceMB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.OBJECT_ID = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE t.NAME = 'bi_test'
GROUP BY t.Name, p.Rows;
```

### Активные подключения
```sql
SELECT 
    session_id,
    login_name,
    program_name,
    host_name,
    status
FROM sys.dm_exec_sessions
WHERE database_id = DB_ID('stock_sync');
```

---

## Полезные ссылки

- [Документация MS SQL Server](https://docs.microsoft.com/en-us/sql/)
- [Sequelize для MS SQL](https://sequelize.org/docs/v6/other-topics/dialect-specific-things/#mssql)
- [Tedious - драйвер для Node.js](https://tediousjs.github.io/tedious/)

