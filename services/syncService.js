const fs = require('fs');
const path = require('path');
const apiService = require('./apiService');
const logger = require('../utils/logger');
const db = require('../models');

class SyncService {
  constructor() {
    this.warehousesFile = path.join(__dirname, '../warehouses.txt');
  }

  /**
   * Чтение списка складов из файла
   * @returns {Array<string>} - Массив кодов/названий складов
   */
  readWarehouses() {
    try {
      if (!fs.existsSync(this.warehousesFile)) {
        logger.info('Файл warehouses.txt не найден. Создан пустой файл.');
        fs.writeFileSync(this.warehousesFile, '', 'utf8');
        return [];
      }

      const content = fs.readFileSync(this.warehousesFile, 'utf8');
      const warehouses = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));

      return warehouses;
    } catch (error) {
      logger.info(`Ошибка чтения файла складов: ${error.message}`);
      return [];
    }
  }

  /**
   * Извлечение ID товара из href
   * @param {string} href - URL вида "https://api.moysklad.ru/api/remap/1.2/entity/product/UUID?expand=supplier"
   *                        или "https://api.moysklad.ru/api/remap/1.2/entity/variant/UUID?expand=product"
   * @returns {string|null} - UUID товара/варианта или null
   */
  extractProductId(href) {
    if (!href) return null;
    
    // Извлекаем ID из URL после /entity/product/ или /entity/variant/ и до ? (или до конца строки)
    // Поддерживаем оба типа: product и variant
    const match = href.match(/\/entity\/(product|variant)\/([a-f0-9-]+)(\?|$)/i);
    return match ? match[2] : null;
  }

  /**
   * Преобразование данных из API в формат для БД
   * @param {Object} item - Элемент из API
   * @param {string} warehouseId - ID склада
   * @param {Date} syncDate - Дата синхронизации
   * @returns {Object} - Данные для записи в БД
   */
  transformStockItem(item, warehouseId, syncDate) {
    // Извлекаем ID товара из href
    const productId = this.extractProductId(item.meta?.href);
    
    if (!productId) {
      console.warn('Не удалось извлечь ID товара из:', item.meta?.href);
      return null;
    }
    return {
      idProd: productId,
      idWarehouse: warehouseId,
      date: syncDate,
      // Остатки (приводим к целым числам)
      qtyStock: Math.floor(item.stock || 0),
      qtyReserved: Math.floor(item.reserve || 0),
      qtyAvailable: Math.floor(item.quantity || 0),
      qtyInTransit: Math.floor(item.inTransit || 0),
      // Финансовые данные (price делим на 100 и приводим к int)
      avgCost: Math.floor((item.price || 0) / 100),
      // Аналитика (приводим к int)
      daysOnStock: Math.floor(item.stockDays || 0)
    };
  }

  /**
   * Синхронизация данных для одного склада
   * @param {string} warehouseId - ID склада (UUID)
   * @returns {Promise<{success: boolean, recordCount: number, error: string}>}
   */
  async syncWarehouse(warehouseId) {
    try {
      logger.info(`Начало синхронизации для склада ${warehouseId}`);
      
      // Получение данных из API
      const stockData = await apiService.getStockData(warehouseId);

      if (!stockData || stockData.length === 0) {
        logger.log(warehouseId, true, 0, 'Нет данных');
        return { success: true, recordCount: 0, error: 'Нет данных' };
      }

      logger.info(`Получено ${stockData.length} записей из API для склада ${warehouseId}`);

      // Подготовка данных для записи в БД
      const currentDate = new Date();
      const recordsToInsert = stockData
        .map(item => this.transformStockItem(item, warehouseId, currentDate))
        .filter(item => item !== null); // Убираем записи без ID товара

      if (recordsToInsert.length === 0) {
        logger.log(warehouseId, false, 0, 'Не удалось обработать ни одной записи');
        return { success: false, recordCount: 0, error: 'Не удалось обработать данные' };
      }

      logger.info(`Подготовлено ${recordsToInsert.length} записей для вставки в БД`);

      // Логируем пример первой записи для отладки
      console.log('Пример данных для вставки:', JSON.stringify(recordsToInsert[0], null, 2));

      // Запись в БД (пакетная вставка)
      logger.info('Начало вставки в БД...');
      const insertedRecords = await db.Stock.bulkCreate(recordsToInsert, {
        validate: true,
        ignoreDuplicates: false,
        returning: true, // Вернуть вставленные записи
        logging: console.log // Логировать SQL запросы
      });

      logger.info(`bulkCreate завершен. Вставлено записей: ${insertedRecords.length}`);

      // Проверка: запрашиваем количество записей в БД для этого склада
      const count = await db.Stock.count({
        where: {
          idWarehouse: warehouseId,
          date: currentDate
        }
      });

      logger.info(`Проверка: найдено ${count} записей в БД для склада ${warehouseId} с датой ${currentDate.toISOString()}`);

      if (count === 0) {
        logger.log(warehouseId, false, 0, 'Записи не найдены в БД после вставки!');
        return { success: false, recordCount: 0, error: 'Данные не сохранились в БД' };
      }

      logger.log(warehouseId, true, count);
      logger.info(`Успешно записано ${count} записей для склада ${warehouseId}`);
      
      return { success: true, recordCount: count, error: '' };
    } catch (error) {
      logger.log(warehouseId, false, 0, error.message);
      console.error(`Ошибка синхронизации склада ${warehouseId}:`, error);
      return { success: false, recordCount: 0, error: error.message };
    }
  }

  /**
   * Синхронизация данных для всех складов
   * @returns {Promise<Object>} - Результаты синхронизации
   */
  async syncAll() {
    logger.info('=== Начало синхронизации ===');

    const warehouses = this.readWarehouses();

    if (warehouses.length === 0) {
      logger.info('Список складов пуст. Синхронизация не выполнена.');
      return { total: 0, success: 0, failed: 0, results: [] };
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const warehouse of warehouses) {
      const result = await this.syncWarehouse(warehouse);
      results.push({ warehouse, ...result });

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    const summary = {
      total: warehouses.length,
      success: successCount,
      failed: failedCount,
      results: results
    };

    logger.info(`=== Синхронизация завершена. Всего: ${summary.total}, Успешно: ${summary.success}, Ошибок: ${summary.failed} ===`);

    return summary;
  }
}

module.exports = new SyncService();

