// Скрипт для установки сервиса как Windows Service
// Использует node-windows
// Установите перед использованием: npm install -g node-windows

const Service = require('node-windows').Service;
const path = require('path');

// Создание нового сервиса
const svc = new Service({
  name: 'StockSyncService',
  description: 'Сервис синхронизации остатков товаров',
  script: path.join(__dirname, 'server.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    }
  ]
});

// Обработчик события установки
svc.on('install', function() {
  console.log('Сервис успешно установлен!');
  console.log('Запускаю сервис...');
  svc.start();
});

// Обработчик события запуска
svc.on('start', function() {
  console.log('Сервис запущен!');
  console.log('Сервис будет автоматически запускаться при старте Windows');
});

// Обработчик события уже установлен
svc.on('alreadyinstalled', function() {
  console.log('Сервис уже установлен');
});

// Обработчик ошибок
svc.on('error', function(err) {
  console.error('Ошибка:', err);
});

console.log('Установка Windows Service...');
console.log('Имя сервиса: StockSyncService');
console.log('Путь к скрипту:', path.join(__dirname, 'server.js'));
console.log('');
console.log('ВНИМАНИЕ: Запустите этот скрипт с правами администратора!');
console.log('');

// Установка сервиса
svc.install();

