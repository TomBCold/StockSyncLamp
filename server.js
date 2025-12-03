require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const db = require('./models');
const syncService = require('./services/syncService');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

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
  res.json({
    status: 'ok',
    database: dbStatus ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
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

// Настройка cron задачи
function setupCronJob() {
  const cronSchedule = process.env.CRON_SCHEDULE || '0 0 * * *'; // По умолчанию: каждый день в полночь
  
  logger.info(`Настройка cron задачи по расписанию: ${cronSchedule}`);
  
  cron.schedule(cronSchedule, async () => {
    logger.info('Запущена автоматическая синхронизация по расписанию');
    try {
      const result = await syncService.syncAll();
      logger.info(`Автоматическая синхронизация завершена: ${JSON.stringify(result)}`);
    } catch (error) {
      logger.info(`Ошибка при автоматической синхронизации: ${error.message}`);
    }
  });

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

