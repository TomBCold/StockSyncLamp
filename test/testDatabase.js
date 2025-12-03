// Скрипт для тестирования подключения к базе данных
require('dotenv').config();
const db = require('../models');

async function testDatabase() {
  console.log('=== Тестирование подключения к базе данных ===\n');
  
  console.log('Параметры подключения:');
  console.log(`  Хост: ${process.env.DB_HOST}`);
  console.log(`  Порт: ${process.env.DB_PORT}`);
  console.log(`  База данных: ${process.env.DB_NAME}`);
  console.log(`  Пользователь: ${process.env.DB_USER}`);
  console.log('');

  try {
    console.log('Попытка подключения...');
    await db.sequelize.authenticate();
    console.log('✓ Подключение к базе данных успешно установлено!');
    
    // Проверка таблиц
    console.log('\nПроверка существующих таблиц...');
    const [results] = await db.sequelize.query('SHOW TABLES');
    
    if (results.length > 0) {
      console.log(`✓ Найдено таблиц: ${results.length}`);
      results.forEach((row, index) => {
        const tableName = Object.values(row)[0];
        console.log(`  ${index + 1}. ${tableName}`);
      });
    } else {
      console.log('⚠ Таблицы не найдены. Возможно, нужно выполнить миграции.');
    }

    // Проверка версии MySQL
    console.log('\nИнформация о сервере:');
    const [version] = await db.sequelize.query('SELECT VERSION() as version');
    console.log(`  MySQL версия: ${version[0].version}`);

    console.log('\n✓ Тест завершен успешно!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Ошибка подключения к базе данных:');
    console.error(`  ${error.message}`);
    console.error('\nПроверьте:');
    console.error('  1. MySQL запущен');
    console.error('  2. Параметры в файле .env корректны');
    console.error('  3. База данных создана');
    console.error('  4. Пользователь имеет необходимые права');
    process.exit(1);
  }
}

testDatabase();

