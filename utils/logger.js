const fs = require('fs');
const path = require('path');

class Logger {
  constructor(logFile) {
    this.logFile = logFile || process.env.LOG_FILE || 'logs/sync.log';
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Логирование в файл
   * @param {string} warehouse - Название склада
   * @param {boolean} success - Успешность операции
   * @param {number} recordCount - Количество записанных записей
   * @param {string} error - Сообщение об ошибке (опционально)
   */
  log(warehouse, success, recordCount = 0, error = '') {
    const date = new Date().toISOString();
    const status = success ? 'SUCCESS' : 'ERROR';
    const logMessage = `${date} | ${warehouse} | ${status} | Records: ${recordCount}${error ? ` | Error: ${error}` : ''}\n`;

    try {
      fs.appendFileSync(this.logFile, logMessage, 'utf8');
      console.log(logMessage.trim());
    } catch (err) {
      console.error('Ошибка записи в лог-файл:', err.message);
    }
  }

  /**
   * Логирование общей информации
   * @param {string} message - Сообщение для логирования
   */
  info(message) {
    const date = new Date().toISOString();
    const logMessage = `${date} | INFO | ${message}\n`;

    try {
      fs.appendFileSync(this.logFile, logMessage, 'utf8');
      console.log(logMessage.trim());
    } catch (err) {
      console.error('Ошибка записи в лог-файл:', err.message);
    }
  }
}

module.exports = new Logger();

