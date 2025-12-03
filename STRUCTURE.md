# Структура проекта Stock Sync Service

## Дерево файлов

```
StockSyncLamp/
│
├── config/                          # Конфигурация
│   └── database.js                  # Настройки подключения к БД
│
├── database/                        # SQL скрипты
│   └── schema.example.sql           # Пример структуры таблицы
│
├── models/                          # Модели Sequelize
│   ├── index.js                     # Инициализация Sequelize
│   └── Stock.js                     # Модель таблицы остатков (заглушка)
│
├── services/                        # Бизнес-логика
│   ├── apiService.js                # Работа с внешним API
│   └── syncService.js               # Логика синхронизации данных
│
├── utils/                           # Утилиты
│   └── logger.js                    # Логирование в файл
│
├── test/                            # Тестовые скрипты
│   ├── testApi.js                   # Проверка подключения к API
│   └── testDatabase.js              # Проверка подключения к БД
│
├── scripts/                         # Вспомогательные скрипты
│   ├── quickstart.bat               # Быстрый старт для Windows
│   └── setup-example-env.bat        # Создание .env из примера
│
├── logs/                            # Логи (создается автоматически)
│   └── sync.log                     # Файл логов синхронизации
│
├── server.js                        # Главный файл приложения
├── package.json                     # Зависимости и скрипты npm
├── .gitignore                       # Исключения для Git
├── warehouses.txt                   # Список складов для синхронизации
│
├── env.example.txt                  # Пример файла с переменными окружения
├── .env                             # Переменные окружения (создать вручную)
│
├── install-service-windows.js       # Установка Windows Service
├── uninstall-service-windows.js     # Удаление Windows Service
│
├── README.md                        # Основная документация
├── INSTALL_WINDOWS.md               # Инструкция для Windows
├── TODO.md                          # Список доработок
└── STRUCTURE.md                     # Этот файл
```

---

## Описание ключевых файлов

### Главные файлы

#### `server.js`
Основной файл приложения. Содержит:
- Инициализацию Express сервера
- Настройку cron задачи
- API endpoints для управления синхронизацией
- Проверку подключения к БД

#### `package.json`
Конфигурация npm проекта с зависимостями и скриптами:
- `npm start` - запуск сервиса
- `npm run dev` - режим разработки
- `npm run test:api` - тест API
- `npm run test:db` - тест БД
- `npm run install:service` - установка Windows Service
- `npm run uninstall:service` - удаление Windows Service

### Конфигурация

#### `config/database.js`
Настройки подключения к MySQL:
- Читает параметры из .env
- Настраивает connection pool
- Отключает подробное логирование SQL запросов

#### `.env` (создать вручную)
Файл с переменными окружения:
```env
API_URL=...
API_KEY=...
DB_HOST=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
PORT=3000
CRON_SCHEDULE=0 0 * * *
```

### Модели (Sequelize)

#### `models/index.js`
- Инициализация Sequelize
- Подключение к БД
- Экспорт моделей

#### `models/Stock.js`
Модель таблицы остатков товаров.
**TODO**: Добавить поля после получения структуры таблицы

### Сервисы

#### `services/apiService.js`
Работа с внешним API:
- Метод `getStockData(warehouse)` - получение данных по складу
- Поддержка пагинации для обхода ограничений API
- Обработка ошибок

**TODO**: Настроить после получения примера ответа API

#### `services/syncService.js`
Логика синхронизации:
- Чтение списка складов из файла
- Метод `syncWarehouse(warehouse)` - синхронизация одного склада
- Метод `syncAll()` - синхронизация всех складов
- Запись данных в БД

**TODO**: Настроить маппинг полей после получения структуры таблицы

### Утилиты

#### `utils/logger.js`
Логирование операций:
- Метод `log(warehouse, success, recordCount, error)` - основной лог
- Метод `info(message)` - информационные сообщения
- Формат: `дата | склад | статус | количество записей`

### Тесты

#### `test/testDatabase.js`
Проверяет:
- Подключение к MySQL
- Наличие таблиц
- Версию MySQL

#### `test/testApi.js`
Проверяет:
- Доступность API
- Правильность API_KEY
- Формат ответа

### Windows Service

#### `install-service-windows.js`
Устанавливает сервис как Windows Service с автозапуском.
Требует: `npm install -g node-windows`

#### `uninstall-service-windows.js`
Удаляет Windows Service.

---

## Потоки данных

### 1. Автоматическая синхронизация (cron)

```
Cron задача (по расписанию)
    ↓
syncService.syncAll()
    ↓
Чтение warehouses.txt
    ↓
Для каждого склада:
    ↓
apiService.getStockData(warehouse)
    ↓
API возвращает данные
    ↓
Маппинг данных в модель
    ↓
Запись в БД через Sequelize
    ↓
Логирование результата
```

### 2. Ручная синхронизация (API endpoint)

```
POST /sync/manual
    ↓
syncService.syncAll()
    ↓
(аналогично автоматической)
```

### 3. Логирование

```
Каждая операция синхронизации
    ↓
logger.log(warehouse, success, count, error)
    ↓
Запись в logs/sync.log
    +
Вывод в консоль
```

---

## API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Информация о сервисе |
| GET | `/health` | Проверка состояния (БД, сервис) |
| POST | `/sync/manual` | Запуск синхронизации вручную |
| GET | `/sync/status` | Статус синхронизации (в разработке) |

---

## Переменные окружения

| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| API_URL | URL внешнего API | - (обязательно) |
| API_KEY | Ключ доступа к API | - (обязательно) |
| DB_HOST | Хост MySQL | localhost |
| DB_PORT | Порт MySQL | 3306 |
| DB_NAME | Имя базы данных | stock_sync |
| DB_USER | Пользователь MySQL | root |
| DB_PASSWORD | Пароль MySQL | - (обязательно) |
| PORT | Порт Express сервера | 3000 |
| CRON_SCHEDULE | Расписание cron | 0 0 * * * (полночь) |
| LOG_FILE | Путь к файлу логов | logs/sync.log |
| TZ | Часовой пояс | Europe/Moscow |

---

## Зависимости

### Production
- **express** - веб-фреймворк
- **sequelize** - ORM для работы с БД
- **mysql2** - драйвер MySQL
- **node-cron** - планировщик задач
- **dotenv** - загрузка переменных окружения
- **axios** - HTTP клиент для API

### Development
- **nodemon** - автоперезагрузка при разработке

### Optional
- **node-windows** - для установки как Windows Service

---

## Что нужно доработать

См. файл `TODO.md` для подробного списка доработок после получения:
1. Структуры таблицы БД
2. Примера ответа API
3. Формата списка складов

---

## Быстрый старт

### Windows

Запустите:
```cmd
scripts\quickstart.bat
```

Или вручную:
```cmd
npm install
copy env.example.txt .env
REM Отредактируйте .env
npm run test:db
npm start
```

### Проверка работы

1. Откройте http://localhost:3000
2. Проверьте здоровье: http://localhost:3000/health
3. Запустите синхронизацию:
```cmd
curl -X POST http://localhost:3000/sync/manual
```

---

## Поддержка

При возникновении проблем:
1. Проверьте логи в `logs/sync.log`
2. Запустите тесты: `npm run test:db` и `npm run test:api`
3. Убедитесь, что `.env` настроен правильно
4. Проверьте `warehouses.txt`

См. также:
- `README.md` - основная документация
- `INSTALL_WINDOWS.md` - специфичная информация для Windows
- `TODO.md` - список задач для доработки

