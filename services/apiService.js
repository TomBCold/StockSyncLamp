const axios = require('axios');
require('dotenv').config();

class ApiService {
  constructor() {
    this.apiUrl = process.env.API_URL;
    this.apiToken = process.env.API_TOKEN;
    this.apiLogin = process.env.API_LOGIN;
    this.apiPassword = process.env.API_PASSWORD;
  }

  /**
   * Получение заголовка авторизации
   * Поддерживает Basic Auth (логин:пароль) и Bearer Token
   * @returns {string} - Заголовок Authorization
   */
  getAuthHeader() {
    if (this.apiToken) {
      // Аутентификация по токену (Bearer Token)
      return `Bearer ${this.apiToken}`;
    } else if (this.apiLogin && this.apiPassword) {
      // Аутентификация Basic Auth (логин:пароль в Base64)
      const credentials = Buffer.from(`${this.apiLogin}:${this.apiPassword}`).toString('base64');
      return `Basic ${credentials}`;
    } else {
      throw new Error('Не указаны данные для авторизации. Установите API_TOKEN или API_LOGIN и API_PASSWORD в .env файле');
    }
  }

  /**
   * Формирование фильтра для запроса остатков
   * @param {string} warehouseId - ID склада
   * @param {string} moment - Момент времени (опционально)
   * @returns {string} - Строка фильтра
   */
  buildFilter(warehouseId, moment = null) {
    const filters = [];
    
    // Момент времени (из параметра, .env или текущая дата/время)
    const momentTime = moment 
      || process.env.API_MOMENT 
      || new Date().toISOString().replace('T', ' ').substring(0, 19);
    filters.push(`moment=${momentTime}`);
    
    // Включить архивные и неархивные товары
    filters.push('archived=false');
    filters.push('archived=true');
    
    // Склад (полный URL)
    const storeUrl = `https://api.moysklad.ru/api/remap/1.2/entity/store/${warehouseId}`;
    filters.push(`store=${storeUrl}`);
    
    return filters.join(';');
  }

  /**
   * Получение данных по остаткам для конкретного склада
   * Поддерживает пагинацию для обхода ограничений API
   * @param {string} warehouseId - ID (код) склада
   * @returns {Promise<Array>} - Массив данных об остатках
   */
  async getStockData(warehouseId) {
    try {
      let allData = [];
      let offset = 0;
      const limit = 1000; // МойСклад: максимум 1000 записей за запрос
      let hasMoreData = true;

      // Формируем фильтр один раз
      const filter = this.buildFilter(warehouseId);

      console.log(`Запрос данных для склада ${warehouseId} с фильтром: ${filter}`);

      while (hasMoreData) {
        const response = await axios.get(this.apiUrl, {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip'
          },
          params: {
            filter: filter,
            offset: offset,
            limit: limit
          }
        });

        if (response.data && response.data.rows && Array.isArray(response.data.rows)) {
          // МойСклад формат: { rows: [...] }
          allData = allData.concat(response.data.rows);
          
          // Проверка наличия следующей страницы
          // Если получили меньше чем limit, значит это последняя страница
          hasMoreData = response.data.rows.length >= limit;
          offset += limit;
        } else if (response.data && Array.isArray(response.data)) {
          // Альтернативный формат: просто массив
          allData = allData.concat(response.data);
          hasMoreData = response.data.length >= limit;
          offset += limit;
        } else {
          hasMoreData = false;
        }

        // Защита от бесконечного цикла
        if (offset > 100000) {
          console.warn(`Достигнут лимит записей (100000) для склада ${warehouse}`);
          break;
        }
      }

      console.log(`Получено ${allData.length} записей для склада ${warehouseId}`);
      return allData;
    } catch (error) {
      console.error(`Ошибка получения данных для склада ${warehouseId}:`, error.message);
      if (error.response) {
        console.error(`Статус ответа: ${error.response.status}`);
        console.error(`Данные ответа:`, error.response.data);
      }
      throw error;
    }
  }

  /**
   * Получение данных по остаткам для конкретного склада за определенную дату
   * @param {string} warehouseId - ID (код) склада
   * @param {string} dateTime - Дата и время в формате YYYY-MM-DD HH:MM
   * @returns {Promise<Array>} - Массив данных об остатках
   */
  async getStockDataForDate(warehouseId, dateTime) {
    try {
      let allData = [];
      let offset = 0;
      const limit = 1000;
      let hasMoreData = true;

      // Формируем момент времени с секундами (если не указаны)
      const moment = dateTime.includes(':') 
        ? `${dateTime}:00`  // Если есть HH:MM, добавляем :00
        : `${dateTime} 07:00:00`;  // Если только дата, добавляем 07:00:00

      // Формируем фильтр с указанной датой
      const filter = this.buildFilter(warehouseId, moment);

      console.log(`Запрос данных для склада ${warehouseId} за ${dateTime}`);
      console.log(`Фильтр: ${filter}`);

      while (hasMoreData) {
        const response = await axios.get(this.apiUrl, {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip'
          },
          params: {
            filter: filter,
            offset: offset,
            limit: limit
          }
        });

        if (response.data && response.data.rows && Array.isArray(response.data.rows)) {
          allData = allData.concat(response.data.rows);
          hasMoreData = response.data.rows.length >= limit;
          offset += limit;
        } else if (response.data && Array.isArray(response.data)) {
          allData = allData.concat(response.data);
          hasMoreData = response.data.length >= limit;
          offset += limit;
        } else {
          hasMoreData = false;
        }

        if (offset > 100000) {
          console.warn(`Достигнут лимит записей (100000) для склада ${warehouseId} за ${dateTime}`);
          break;
        }
      }

      console.log(`Получено ${allData.length} записей для склада ${warehouseId} за ${dateTime}`);
      return allData;
    } catch (error) {
      console.error(`Ошибка получения данных для склада ${warehouseId} за ${dateTime}:`, error.message);
      if (error.response) {
        console.error(`Статус ответа: ${error.response.status}`);
        console.error(`Данные ответа:`, error.response.data);
      }
      throw error;
    }
  }

  /**
   * Проверка доступности API
   * @returns {Promise<boolean>}
   */
  async checkApiHealth() {
    try {
      const response = await axios.get(this.apiUrl, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        params: {
          limit: 1 // Запросить минимум данных для проверки
        },
        timeout: 10000
      });
      return response.status === 200;
    } catch (error) {
      console.error('API недоступен:', error.message);
      return false;
    }
  }
}

module.exports = new ApiService();

