# Примеры API запросов

## Для Windows (PowerShell)

### 1. Получить информацию о сервисе
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/" -Method GET | Select-Object -Expand Content
```

### 2. Проверить состояние (Health Check)
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/health" -Method GET | Select-Object -Expand Content
```

### 3. Запустить синхронизацию вручную
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/sync/manual" -Method POST | Select-Object -Expand Content
```

### 4. Получить статус синхронизации
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/sync/status" -Method GET | Select-Object -Expand Content
```

---

## Для Windows (curl)

Если у вас установлен curl в Windows:

### 1. Получить информацию о сервисе
```cmd
curl http://localhost:3000/
```

### 2. Проверить состояние
```cmd
curl http://localhost:3000/health
```

### 3. Запустить синхронизацию
```cmd
curl -X POST http://localhost:3000/sync/manual
```

### 4. Получить статус
```cmd
curl http://localhost:3000/sync/status
```

---

## Для тестирования с другого компьютера

Замените `localhost` на IP-адрес сервера:

```powershell
Invoke-WebRequest -Uri "http://192.168.1.100:3000/health" -Method GET
```

---

## Использование Postman

### 1. Создайте новую коллекцию "Stock Sync Service"

### 2. Добавьте запросы:

#### GET - Service Info
- **Method:** GET
- **URL:** `http://localhost:3000/`
- **Headers:** нет

#### GET - Health Check
- **Method:** GET
- **URL:** `http://localhost:3000/health`
- **Headers:** нет

#### POST - Manual Sync
- **Method:** POST
- **URL:** `http://localhost:3000/sync/manual`
- **Headers:** 
  - `Content-Type: application/json`
- **Body:** нет (или пустой JSON `{}`)

#### GET - Sync Status
- **Method:** GET
- **URL:** `http://localhost:3000/sync/status`
- **Headers:** нет

---

## Примеры ответов

### GET / - Service Info
```json
{
  "service": "Stock Sync Service",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "/health",
    "syncManual": "/sync/manual",
    "syncStatus": "/sync/status"
  }
}
```

### GET /health - Health Check
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-12-02T10:00:00.000Z"
}
```

### POST /sync/manual - Manual Sync (Success)
```json
{
  "message": "Синхронизация запущена",
  "timestamp": "2024-12-02T10:00:00.000Z"
}
```

### POST /sync/manual - Manual Sync (Error)
```json
{
  "error": "Ошибка запуска синхронизации",
  "message": "Database connection failed"
}
```

### GET /sync/status - Sync Status
```json
{
  "message": "Функционал в разработке",
  "cronSchedule": "0 0 * * *"
}
```

---

## Мониторинг в реальном времени

### Просмотр логов (PowerShell)
```powershell
Get-Content -Path "logs\sync.log" -Wait -Tail 10
```

### Просмотр логов (CMD)
```cmd
type logs\sync.log
```

### Если используется PM2
```cmd
pm2 logs stock-sync --lines 50
```

---

## Автоматизация тестирования

Создайте файл `test-api-endpoints.bat`:

```batch
@echo off
echo Testing Stock Sync Service Endpoints
echo.

echo [1/4] Testing Service Info...
curl http://localhost:3000/
echo.
echo.

echo [2/4] Testing Health Check...
curl http://localhost:3000/health
echo.
echo.

echo [3/4] Testing Manual Sync...
curl -X POST http://localhost:3000/sync/manual
echo.
echo.

echo [4/4] Testing Sync Status...
curl http://localhost:3000/sync/status
echo.
echo.

echo Tests completed!
pause
```

Запустите:
```cmd
test-api-endpoints.bat
```

---

## Проверка работы cron задачи

Установите короткое расписание для теста в `.env`:
```env
CRON_SCHEDULE=*/5 * * * *
```
(каждые 5 минут)

Перезапустите сервис и наблюдайте за логами:
```cmd
type logs\sync.log
```

После тестирования верните обычное расписание:
```env
CRON_SCHEDULE=0 0 * * *
```

---

## Troubleshooting

### Ошибка "Connection refused"
- Убедитесь, что сервис запущен: `npm start`
- Проверьте порт в `.env`: `PORT=3000`

### Ошибка "Database disconnected"
- Проверьте подключение к MySQL: `npm run test:db`
- Проверьте настройки БД в `.env`

### Синхронизация не запускается
- Проверьте `warehouses.txt` - должен содержать коды складов
- Проверьте API: `npm run test:api`
- Посмотрите логи: `type logs\sync.log`

