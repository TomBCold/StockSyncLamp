// Скрипт для проверки данных в таблице pbi_test
require('dotenv').config();
const db = require('../models');

async function checkData() {
  console.log('=== Проверка данных в таблице dbo.pbi_test ===\n');

  try {
    await db.sequelize.authenticate();
    console.log('✓ Подключение установлено\n');

    // Общее количество записей
    const totalCount = await db.Stock.count();
    console.log(`Всего записей в таблице: ${totalCount}`);

    if (totalCount === 0) {
      console.log('\n⚠ Таблица пуста! Данные не были записаны.');
      
      // Проверим существование таблицы
      const [tables] = await db.sequelize.query(`
        SELECT SCHEMA_NAME(schema_id) + '.' + name AS TableName
        FROM sys.tables
        WHERE name = 'pbi_test'
      `);
      
      if (tables.length === 0) {
        console.log('\n✗ ОШИБКА: Таблица dbo.pbi_test не существует!');
        console.log('   Создайте таблицу: npm run test:db или выполните database/schema.example.sql');
      } else {
        console.log(`\n✓ Таблица существует: ${tables[0].TableName}`);
        console.log('   Но данных в ней нет. Проблема с записью данных.');
      }
      
      process.exit(1);
    }

    // Количество записей по складам
    console.log('\nКоличество записей по складам:');
    const [warehouseStats] = await db.sequelize.query(`
      SELECT 
        id_warehouse,
        COUNT(*) as record_count,
        MIN(sync_date) as first_sync,
        MAX(sync_date) as last_sync
      FROM dbo.pbi_test
      GROUP BY id_warehouse
      ORDER BY record_count DESC
    `);

    warehouseStats.forEach((stat, index) => {
      console.log(`  ${index + 1}. Склад ${stat.id_warehouse}:`);
      console.log(`     Записей: ${stat.record_count}`);
      console.log(`     Первая синхронизация: ${new Date(stat.first_sync).toLocaleString()}`);
      console.log(`     Последняя синхронизация: ${new Date(stat.last_sync).toLocaleString()}`);
    });

    // Последние 10 записей
    console.log('\nПоследние 10 записей:');
    const latestRecords = await db.Stock.findAll({
      order: [['syncDate', 'DESC']],
      limit: 10
    });

    latestRecords.forEach((record, index) => {
      console.log(`  ${index + 1}. ID: ${record.id}, Товар: ${record.idProd.substring(0, 8)}..., Склад: ${record.idWarehouse.substring(0, 8)}..., Остаток: ${record.qtyStock}, Дата синхр: ${new Date(record.syncDate).toLocaleString()}, Дата остатка: ${record.stockDate ? new Date(record.stockDate).toLocaleString() : 'N/A'}`);
    });

    // Статистика за сегодня
    console.log('\nСтатистика за сегодня:');
    const [todayStats] = await db.sequelize.query(`
      SELECT 
        COUNT(*) as today_count,
        COUNT(DISTINCT id_warehouse) as warehouses_count,
        COUNT(DISTINCT id_prod) as products_count,
        SUM(qty_stock) as total_stock,
        SUM(qty_available) as total_available
      FROM dbo.pbi_test
      WHERE CAST(sync_date AS DATE) = CAST(GETDATE() AS DATE)
    `);

    if (todayStats[0].today_count > 0) {
      console.log(`  Записей за сегодня: ${todayStats[0].today_count}`);
      console.log(`  Складов: ${todayStats[0].warehouses_count}`);
      console.log(`  Товаров: ${todayStats[0].products_count}`);
      console.log(`  Общий остаток: ${todayStats[0].total_stock}`);
      console.log(`  Доступно: ${todayStats[0].total_available}`);
    } else {
      console.log('  За сегодня записей нет');
    }

    console.log('\n✓ Проверка завершена!');
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Ошибка:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkData();

