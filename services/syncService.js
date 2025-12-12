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
   * @param {string} stockDate - Дата остатка (опционально, для ретроспективы)
   * @returns {Object} - Данные для записи в БД
   */
  transformStockItem(item, warehouseId, syncDate, stockDate = null) {
    // Извлекаем ID товара из href
    const productId = this.extractProductId(item.meta?.href);
    
    if (!productId) {
      console.warn('Не удалось извлечь ID товара из:', item.meta?.href);
      return null;
    }
    return {
      idProd: productId,
      idWarehouse: warehouseId,
      syncDate: syncDate,
      stockDate: stockDate, // Дата остатка (для ретроспективы)
      // Остатки (приводим к целым числам)
      qtyStock: Math.floor(item.stock || 0),
      qtyReserved: Math.floor(item.reserve || 0),
      qtyAvailable: Math.floor(item.quantity || 0),
      qtyInTransit: Math.floor(item.inTransit || 0),
      // Финансовые данные (price делим на 100, сохраняем копейки в DECIMAL)
      avgCost: ((item.price || 0) / 100).toFixed(2),
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
      const systemDate = new Date();
      // Добавляем 3 часа к системному времени (3 * 60 * 60 * 1000 миллисекунд)
      const currentDate = new Date(systemDate.getTime() + (3 * 60 * 60 * 1000));
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
          syncDate: currentDate
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

  /**
   * Ретроспективная синхронизация за период
   * @param {string} startDate - Начальная дата (YYYY-MM-DD)
   * @param {string} endDate - Конечная дата (YYYY-MM-DD)
   * @returns {Promise<Object>} - Результаты синхронизации
   */
  async syncRetrospective(startDate, endDate) {
    logger.info(`=== Начало ретроспективной синхронизации с ${startDate} по ${endDate} ===`);

    const warehouses = this.readWarehouses();

    if (warehouses.length === 0) {
      logger.info('Список складов пуст. Ретроспективная синхронизация не выполнена.');
      return { total: 0, success: 0, failed: 0, dates: [], results: [] };
    }

    // Генерируем массив дат
    const dates = this.generateDateRange(startDate, endDate);
    logger.info(`Будет обработано ${dates.length} дат для ${warehouses.length} складов`);

    const results = [];
    let successCount = 0;
    let failedCount = 0;
    let totalRecords = 0;

    // Итерируемся по датам
    for (const date of dates) {
      logger.info(`\n--- Обработка даты: ${date} ---`);
      
      // Для каждой даты обрабатываем все склады
      for (const warehouse of warehouses) {
        try {
          const result = await this.syncWarehouseForDate(warehouse, date);
          results.push({ warehouse, date, ...result });
          
          if (result.success) {
            successCount++;
            totalRecords += result.recordCount;
          } else {
            failedCount++;
          }
        } catch (error) {
          logger.log(warehouse, false, 0, `Ошибка для даты ${date}: ${error.message}`);
          failedCount++;
        }
      }
    }

    const summary = {
      total: dates.length * warehouses.length,
      success: successCount,
      failed: failedCount,
      totalRecords: totalRecords,
      dates: dates,
      warehouses: warehouses.length,
      results: results
    };

    logger.info(`\n=== Ретроспективная синхронизация завершена ===`);
    logger.info(`Дат: ${dates.length}, Складов: ${warehouses.length}`);
    logger.info(`Успешно: ${summary.success}, Ошибок: ${summary.failed}`);
    logger.info(`Всего записей: ${summary.totalRecords}`);

    return summary;
  }

  /**
   * Синхронизация данных для одного склада за конкретную дату
   * @param {string} warehouseId - ID склада
   * @param {string} dateTime - Дата и время в формате YYYY-MM-DD HH:MM
   * @returns {Promise<{success: boolean, recordCount: number, error: string}>}
   */
  async syncWarehouseForDate(warehouseId, dateTime) {
    try {
      logger.info(`Запрос данных для склада ${warehouseId} за ${dateTime}`);
      
      // Формируем дату для API и БД одинаково
      // Извлекаем только дату из параметра (игнорируем время если есть)
      const datePart = dateTime.trim().split(' ')[0]; // 2025-10-01
      
      // Формируем строку с временем 07:00:00 для API
      const momentForApi = `${datePart} 07:00:00`; // 2025-10-01 07:00:00
      
      logger.info(`Момент времени для API и БД: ${momentForApi}`);
      
      // Получение данных из API за конкретную дату
      const stockData = await apiService.getStockDataForDate(warehouseId, momentForApi);

      if (!stockData || stockData.length === 0) {
        logger.log(warehouseId, true, 0, `Нет данных за ${momentForApi}`);
        return { success: true, recordCount: 0, error: 'Нет данных' };
      }

      logger.info(`Получено ${stockData.length} записей из API для склада ${warehouseId} за ${momentForApi}`);

      // Подготовка данных для записи в БД
      const currentDate = new Date();
      
      // Используем ту же дату что отправили в API
      const stockDateObj = new Date(momentForApi.replace(' ', 'T')); // 2025-10-01T07:00:00
      
      // Проверка валидности даты
      if (isNaN(stockDateObj.getTime())) {
        logger.error(`Неверный формат даты: ${momentForApi}`);
        return { success: false, recordCount: 0, error: 'Неверный формат даты' };
      }
      
      logger.info(`Дата остатка для записи в БД: ${stockDateObj.toISOString()}`);
      
      const recordsToInsert = stockData
        .map(item => this.transformStockItem(item, warehouseId, currentDate, stockDateObj))
        .filter(item => item !== null);

      if (recordsToInsert.length === 0) {
        logger.log(warehouseId, false, 0, `Не удалось обработать данные за ${dateTime}`);
        return { success: false, recordCount: 0, error: 'Не удалось обработать данные' };
      }

      logger.info(`Подготовлено ${recordsToInsert.length} записей для вставки за ${dateTime}`);

      // Запись в БД
      const insertedRecords = await db.Stock.bulkCreate(recordsToInsert, {
        validate: true,
        ignoreDuplicates: false,
        returning: false
      });

      logger.info(`Записано ${recordsToInsert.length} записей для склада ${warehouseId} за ${dateTime}`);
      logger.log(warehouseId, true, recordsToInsert.length, `За дату ${dateTime}`);
      
      return { success: true, recordCount: recordsToInsert.length, error: '' };
    } catch (error) {
      logger.log(warehouseId, false, 0, `${dateTime}: ${error.message}`);
      console.error(`Ошибка синхронизации склада ${warehouseId} за ${dateTime}:`, error);
      return { success: false, recordCount: 0, error: error.message };
    }
  }

  /**
   * Генерация массива дат между начальной и конечной датой
   * @param {string} startDate - Начальная дата (YYYY-MM-DD)
   * @param {string} endDate - Конечная дата (YYYY-MM-DD)
   * @returns {Array<string>} - Массив дат в формате YYYY-MM-DD HH:MM:SS
   */
  generateDateRange(startDate, endDate) {
    const dates = [];
    
    // Парсим даты без создания Date объектов (избегаем проблем с часовыми поясами)
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    
    // Создаем Date объекты в UTC чтобы избежать сдвига часовых поясов
    const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

    // Проверка корректности дат
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Неверный формат даты. Используйте YYYY-MM-DD');
    }

    if (start > end) {
      throw new Error('Начальная дата не может быть больше конечной');
    }

    // Генерируем массив дат с временем 07:00:00
    const current = new Date(start);
    while (current <= end) {
      // Извлекаем компоненты даты напрямую из UTC
      const year = current.getUTCFullYear();
      const month = String(current.getUTCMonth() + 1).padStart(2, '0');
      const day = String(current.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day} 07:00:00`; // YYYY-MM-DD 07:00:00
      dates.push(dateStr);
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
  }
}

module.exports = new SyncService();

