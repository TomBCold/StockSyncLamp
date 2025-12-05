// Скрипт для тестирования подключения к базе данных
require('dotenv').config();
const db = require('../models');

async function testDatabase() {
  console.log('=== Тестирование подключения к базе данных (MS SQL Server) ===\n');
  
  console.log('Параметры подключения:');
  console.log(`  Хост: ${process.env.DB_HOST}`);
  console.log(`  Порт: ${process.env.DB_PORT || 1433}`);
  console.log(`  База данных: ${process.env.DB_NAME}`);
  console.log(`  Пользователь: ${process.env.DB_USER}`);
  if (process.env.DB_INSTANCE) {
    console.log(`  Экземпляр: ${process.env.DB_INSTANCE}`);
  }
  console.log('');

  try {
    console.log('Попытка подключения к MS SQL Server...');
    await db.sequelize.authenticate();
    console.log('✓ Подключение к базе данных успешно установлено!');
    
    // Проверка таблиц (MS SQL синтаксис)
    console.log('\nПроверка существующих таблиц...');
    const [results] = await db.sequelize.query(`
      SELECT 
        SCHEMA_NAME(schema_id) + '.' + name AS TableName,
        create_date AS CreatedDate
      FROM sys.tables
      ORDER BY name
    `);
    
    if (results.length > 0) {
      console.log(`✓ Найдено таблиц: ${results.length}`);
      results.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.TableName} (создана: ${new Date(row.CreatedDate).toLocaleDateString()})`);
      });
    } else {
      console.log('⚠ Таблицы не найдены. Возможно, нужно создать таблицу.');
      console.log('   Выполните: database/schema.example.sql');
    }

    // Проверка версии MS SQL Server
    console.log('\nИнформация о сервере:');
    const [version] = await db.sequelize.query('SELECT @@VERSION as version');
    const versionStr = version[0].version;
    // Извлекаем краткую версию (первая строка)
    const shortVersion = versionStr.split('\n')[0].trim();
    console.log(`  MS SQL Server: ${shortVersion}`);

    // Дополнительная информация
    const [dbInfo] = await db.sequelize.query(`
      SELECT 
        DB_NAME() AS DatabaseName,
        SUSER_SNAME() AS LoginName,
        USER_NAME() AS UserName,
        @@SERVERNAME AS ServerName
    `);
    console.log(`  Сервер: ${dbInfo[0].ServerName}`);
    console.log(`  База данных: ${dbInfo[0].DatabaseName}`);
    console.log(`  Пользователь: ${dbInfo[0].UserName}`);

    console.log('\n✓ Тест завершен успешно!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Ошибка подключения к базе данных:');
    console.error(`  ${error.message}`);
    console.error('\nПроверьте:');
    console.error('  1. MS SQL Server запущен');
    console.error('  2. Параметры в файле .env корректны');
    console.error('  3. База данных создана');
    console.error('  4. Пользователь имеет необходимые права');
    console.error('  5. TCP/IP протокол включен в SQL Server Configuration Manager');
    console.error('  6. Порт 1433 не заблокирован firewall');
    
    if (error.message.includes('Login failed')) {
      console.error('\n💡 Подсказка: Проверьте логин и пароль, убедитесь что SQL Server Authentication включена');
    }
    if (error.message.includes('certificate')) {
      console.error('\n💡 Подсказка: Попробуйте установить DB_TRUST_CERT=true в .env');
    }
    
    process.exit(1);
  }
}

testDatabase();

