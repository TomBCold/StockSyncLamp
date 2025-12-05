require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const parser = require('cron-parser');
const db = require('./models');
const syncService = require('./services/syncService');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Глобальная переменная для хранения cron task
let cronTask = null;
let cronSchedule = null;
let cronInitialized = false;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Проверка подключения к БД
async function checkDatabaseConnection() {
  try {
    await db.sequelize.authenticate();
    logger.info('Подключение к базе данных установлено успешно');
    return true;
  } catch (error) {
    logger.info(`Ошибка подключения к базе данных: ${error.message}`);
    return false;
  }
}

// Routes

// Главная страница
app.get('/', (req, res) => {
  res.json({
    service: 'Stock Sync Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      syncManual: '/sync/manual',
      syncStatus: '/sync/status'
    }
  });
});

// Health check
app.get('/health', async (req, res) => {
  const dbStatus = await checkDatabaseConnection();
  
  // Информация о расписании cron
  let cronInfo = {
    enabled: false,
    schedule: null,
    nextRun: null,
    timezone: process.env.TZ || 'system'
  };

  if (cronInitialized && cronSchedule) {
    try {
      // Проверяем валидность расписания
      const isValid = cron.validate(cronSchedule);
      
      if (isValid) {
        // Вычисляем следующее время запуска
        const interval = parser.parseExpression(cronSchedule, {
          tz: process.env.TZ || undefined
        });
        const nextDate = interval.next().toDate();
        
        cronInfo = {
          enabled: true,
          schedule: cronSchedule,
          scheduleDescription: getCronDescription(cronSchedule),
          nextRun: nextDate.toISOString(),
          nextRunLocal: nextDate.toLocaleString('ru-RU', { 
            timeZone: process.env.TZ || 'Europe/Moscow' 
          }),
          timezone: process.env.TZ || 'Europe/Moscow'
        };
      } else {
        cronInfo.enabled = false;
        cronInfo.error = 'Неверный формат расписания';
      }
    } catch (error) {
      cronInfo.enabled = false;
      cronInfo.error = error.message;
    }
  }

  res.json({
    status: 'ok',
    database: dbStatus ? 'connected' : 'disconnected',
    cron: cronInfo,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Ручной запуск синхронизации
app.post('/sync/manual', async (req, res) => {
  try {
    logger.info('Запущена ручная синхронизация');
    
    // Запускаем синхронизацию асинхронно
    syncService.syncAll()
      .then(result => {
        logger.info(`Ручная синхронизация завершена: ${JSON.stringify(result)}`);
      })
      .catch(error => {
        logger.info(`Ошибка при ручной синхронизации: ${error.message}`);
      });

    res.json({
      message: 'Синхронизация запущена',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.info(`Ошибка запуска синхронизации: ${error.message}`);
    res.status(500).json({
      error: 'Ошибка запуска синхронизации',
      message: error.message
    });
  }
});

// Статус последней синхронизации (заглушка для будущего функционала)
app.get('/sync/status', (req, res) => {
  res.json({
    message: 'Функционал в разработке',
    cronSchedule: process.env.CRON_SCHEDULE || '0 0 * * *'
  });
});

// Функция для описания расписания cron
function getCronDescription(schedule) {
  const descriptions = {
    '0 0 * * *': 'Каждый день в полночь (00:00)',
    '0 2 * * *': 'Каждый день в 2:00',
    '0 */6 * * *': 'Каждые 6 часов',
    '*/5 * * * *': 'Каждые 5 минут',
    '*/15 * * * *': 'Каждые 15 минут',
    '0 */12 * * *': 'Каждые 12 часов',
    '30 8 * * 1-5': 'В 8:30 по будням'
  };
  
  return descriptions[schedule] || 'Пользовательское расписание';
}

// Настройка cron задачи
function setupCronJob() {
  cronSchedule = process.env.CRON_SCHEDULE || '0 0 * * *'; // По умолчанию: каждый день в полночь
  
  logger.info(`Настройка cron задачи по расписанию: ${cronSchedule}`);
  
  // Проверяем валидность расписания
  if (!cron.validate(cronSchedule)) {
    logger.info(`ОШИБКА: Неверный формат cron расписания: ${cronSchedule}`);
    logger.info('Используйте формат: минута час день месяц день_недели');
    logger.info('Пример: 0 0 * * * (каждый день в полночь)');
    cronInitialized = false;
    return;
  }
  
  try {
    // Вычисляем и логируем следующий запуск
    const interval = parser.parseExpression(cronSchedule, {
      tz: process.env.TZ || undefined
    });
    const nextRun = interval.next().toDate();
    
    logger.info(`Описание расписания: ${getCronDescription(cronSchedule)}`);
    logger.info(`Следующий запуск: ${nextRun.toLocaleString('ru-RU', { timeZone: process.env.TZ || 'Europe/Moscow' })}`);
  } catch (error) {
    logger.info(`Ошибка парсинга расписания: ${error.message}`);
  }
  
  cronTask = cron.schedule(cronSchedule, async () => {
    logger.info('Запущена автоматическая синхронизация по расписанию');
    try {
      const result = await syncService.syncAll();
      logger.info(`Автоматическая синхронизация завершена: ${JSON.stringify(result)}`);
    } catch (error) {
      logger.info(`Ошибка при автоматической синхронизации: ${error.message}`);
    }
  });

  cronInitialized = true;
  logger.info('Cron задача успешно настроена');
}

// Запуск сервера
async function startServer() {
  try {
    // Проверка подключения к БД
    const dbConnected = await checkDatabaseConnection();
    
    if (!dbConnected) {
      logger.info('ВНИМАНИЕ: Не удалось подключиться к базе данных. Проверьте настройки в .env');
      logger.info('Сервис будет запущен, но синхронизация может не работать');
    }

    // Синхронизация моделей с БД (без пересоздания таблиц)
    if (dbConnected) {
      await db.sequelize.sync({ alter: false });
      logger.info('Модели синхронизированы с базой данных');
    }

    // Настройка cron задачи
    setupCronJob();

    // Запуск Express сервера
    app.listen(PORT, () => {
      logger.info(`Сервер запущен на порту ${PORT}`);
      logger.info(`Доступные endpoints:`);
      logger.info(`  - GET  http://localhost:${PORT}/`);
      logger.info(`  - GET  http://localhost:${PORT}/health`);
      logger.info(`  - POST http://localhost:${PORT}/sync/manual`);
      logger.info(`  - GET  http://localhost:${PORT}/sync/status`);
    });
  } catch (error) {
    logger.info(`Ошибка запуска сервера: ${error.message}`);
    process.exit(1);
  }
}

// Обработка ошибок
process.on('unhandledRejection', (error) => {
  logger.info(`Необработанная ошибка Promise: ${error.message}`);
});

process.on('uncaughtException', (error) => {
  logger.info(`Необработанное исключение: ${error.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM получен, закрытие сервера...');
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT получен, закрытие сервера...');
  await db.sequelize.close();
  process.exit(0);
});

// Запуск
startServer();

