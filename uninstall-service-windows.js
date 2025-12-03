// Скрипт для удаления Windows Service
// Использует node-windows

const Service = require('node-windows').Service;
const path = require('path');

// Создание объекта сервиса (с теми же параметрами, что и при установке)
const svc = new Service({
  name: 'StockSyncService',
  script: path.join(__dirname, 'server.js')
});

// Обработчик события удаления
svc.on('uninstall', function() {
  console.log('Сервис успешно удален');
  console.log('Теперь сервис не будет запускаться автоматически');
});

// Обработчик события "сервис не установлен"
svc.on('alreadyuninstalled', function() {
  console.log('Сервис не был установлен');
});

// Обработчик ошибок
svc.on('error', function(err) {
  console.error('Ошибка:', err);
});

console.log('Удаление Windows Service...');
console.log('Имя сервиса: StockSyncService');
console.log('');
console.log('ВНИМАНИЕ: Запустите этот скрипт с правами администратора!');
console.log('');

// Удаление сервиса
svc.uninstall();

