require('dotenv').config();

module.exports = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 1433,
  database: process.env.DB_NAME || 'stock_sync',
  username: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true', // Для Azure SQL требуется true
      trustServerCertificate: process.env.DB_TRUST_CERT !== 'false', // true по умолчанию для локальных БД
      enableArithAbort: true,
      instanceName: process.env.DB_INSTANCE || undefined // Для именованных экземпляров
    }
  },
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

