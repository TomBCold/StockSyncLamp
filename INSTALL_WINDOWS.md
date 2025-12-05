# Инструкция по установке на Windows

## Шаг 1: Установка зависимостей

Откройте командную строку (cmd) или PowerShell в папке проекта и выполните:

```cmd
npm install
```

## Шаг 2: Настройка переменных окружения

1. Скопируйте файл `env.example.txt` и переименуйте копию в `.env`
2. Откройте файл `.env` в текстовом редакторе (Notepad, VSCode и т.д.)
3. Заполните необходимые параметры:
   - `API_URL` - адрес вашего API
   - `API_KEY` - ключ доступа к API
   - `DB_HOST` - адрес сервера MySQL (обычно localhost)
   - `DB_USER` - пользователь MySQL
   - `DB_PASSWORD` - пароль пользователя MySQL
   - `DB_NAME` - название базы данных

## Шаг 3: Создание базы данных

Подключитесь к MySQL и выполните:

```sql
CREATE DATABASE stock_sync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Или используйте phpMyAdmin / MySQL Workbench для создания базы данных.

## Шаг 4: Настройка списка складов

Откройте файл `warehouses.txt` и добавьте коды складов (по одному на строку):

```
WAREHOUSE_01
WAREHOUSE_02
```

## Шаг 5: Запуск сервиса

### Разовый запуск (для тестирования)

```cmd
npm start
```

### Автоматический запуск при старте Windows

**⚠️ Важно:** Команда `pm2 startup` НЕ работает на Windows! Используйте один из вариантов ниже:

#### Вариант 1: pm2-windows-startup (Рекомендуется для PM2)

1. Установите pm2-windows-startup глобально:
```cmd
npm install -g pm2
npm install -g pm2-windows-startup
```

2. Настройте автозапуск:
```cmd
pm2-windows-startup install
```

3. Запустите сервис:
```cmd
pm2 start server.js --name stock-sync
pm2 save
```

Готово! Сервис будет запускаться автоматически при старте Windows.

#### Вариант 2: node-windows (Windows Service) - Рекомендуется!

Используйте встроенный скрипт для создания Windows Service:

1. Откройте PowerShell или CMD **от имени администратора**
2. Установите node-windows:
```cmd
npm install -g node-windows
```

3. Запустите установку:
```cmd
npm run install:service
```

Сервис будет установлен и запущен автоматически!

**Для удаления службы:**
```cmd
npm run uninstall:service
```

#### Вариант 3: Task Scheduler (Планировщик заданий)

1. Откройте Task Scheduler (Планировщик заданий)
2. Создайте новую задачу:
   - Триггер: При входе в систему
   - Действие: Запустить программу
   - Программа: `node`
   - Аргументы: `C:\путь\к\проекту\server.js`
   - Рабочая папка: `C:\путь\к\проекту`

### Альтернатива: Создание Windows службы

Можно использовать пакет `node-windows`:

1. Установите node-windows:
```cmd
npm install -g node-windows
```

2. Создайте файл `install-service.js` в папке проекта
3. Запустите установку службы

## Проверка работы

1. Откройте браузер и перейдите на http://localhost:3000
2. Проверьте статус: http://localhost:3000/health
3. Запустите синхронизацию вручную (через Postman или curl):

```cmd
curl -X POST http://localhost:3000/sync/manual
```

## Просмотр логов

Логи сохраняются в файл `logs/sync.log`

Для просмотра в реальном времени через PM2:
```cmd
pm2 logs stock-sync
```

## Остановка сервиса

### Если запущен через npm start
Нажмите `Ctrl+C` в командной строке

### Если запущен через PM2
```cmd
pm2 stop stock-sync
pm2 delete stock-sync
```

### Если установлен как Windows Service (node-windows)
```cmd
npm run uninstall:service
```

### Если запущен через pm2-windows-startup
```cmd
pm2 stop stock-sync
pm2 delete stock-sync
pm2 save
pm2-windows-startup uninstall
```

## Решение проблем

### Ошибка "Cannot find module"
Убедитесь, что установлены все зависимости:
```cmd
npm install
```

### Ошибка подключения к БД
- Проверьте, что MySQL запущен
- Проверьте параметры подключения в файле `.env`
- Убедитесь, что база данных создана

### Порт занят
Измените PORT в файле `.env` на другой (например, 3001)

### PM2 не найден
Установите PM2 глобально с правами администратора:
```cmd
npm install -g pm2
```

