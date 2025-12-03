# Быстрый старт

## За 5 минут

### Шаг 1: Установка зависимостей
```cmd
npm install
```

### Шаг 2: Настройка переменных окружения
```cmd
copy env.example.txt .env
notepad .env
```

Заполните:
- `API_URL` - адрес API МойСклад (по умолчанию: https://api.moysklad.ru/api/remap/1.2/report/stock/all)
- **Вариант 1:** `API_TOKEN` - токен доступа МойСклад (Bearer Token)
- **Вариант 2:** `API_LOGIN` и `API_PASSWORD` - логин и пароль (Basic Auth)
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - настройки MySQL

**Важно:** Укажите либо токен, либо логин/пароль (не оба варианта одновременно)

### Шаг 3: Создание базы данных
```sql
CREATE DATABASE stock_sync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Шаг 4: Настройка складов
Отредактируйте `warehouses.txt`, добавьте коды складов (по одному на строку):
```
WAREHOUSE_01
WAREHOUSE_02
```

### Шаг 5: Тестирование
```cmd
npm run test:db
npm run test:api
```

### Шаг 6: Запуск
```cmd
npm start
```

Сервис будет доступен на http://localhost:3000

---

## Ручной запуск синхронизации

```cmd
curl -X POST http://localhost:3000/sync/manual
```

Или откройте в браузере Postman и отправьте POST запрос на:
```
http://localhost:3000/sync/manual
```

---

## Автоматический запуск (Windows)

### Вариант 1: PM2 (рекомендуется)
```cmd
npm install -g pm2
pm2 start server.js --name stock-sync
pm2 save
pm2 startup
```

### Вариант 2: Windows Service
```cmd
npm install -g node-windows
npm run install:service
```

---

## Просмотр логов

Логи сохраняются в `logs/sync.log`

Для просмотра в реальном времени (если используется PM2):
```cmd
pm2 logs stock-sync
```

Или просто откройте файл в блокноте:
```cmd
notepad logs\sync.log
```

---

## Проверка статуса

### Проверка сервиса
```
GET http://localhost:3000/health
```

### Информация о сервисе
```
GET http://localhost:3000/
```

---

## Настройка расписания

Отредактируйте в `.env`:
```env
CRON_SCHEDULE=0 0 * * *
```

**Примеры:**
- `0 0 * * *` - каждый день в полночь
- `0 2 * * *` - каждый день в 2:00
- `0 */6 * * *` - каждые 6 часов

После изменения перезапустите сервис.

---

## Что дальше?

После получения:
1. **Структуры таблицы БД** → обновите `models/Stock.js` и `database/schema.example.sql`
2. **Примера ответа API** → обновите `services/apiService.js` и `services/syncService.js`

См. `TODO.md` для подробностей.

---

## Помощь

- **README.md** - полная документация
- **INSTALL_WINDOWS.md** - детальная инструкция для Windows
- **STRUCTURE.md** - описание структуры проекта
- **TODO.md** - список доработок

При проблемах проверьте логи в `logs/sync.log`

