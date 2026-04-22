const { Sequelize } = require('sequelize');
const dbConfig = require('../config/database');

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Импорт моделей
db.Stock = require('./Stock')(sequelize, Sequelize);
db.Product = require('./Product')(sequelize, Sequelize);
db.Counterparty = require('./Counterparty')(sequelize, Sequelize);
db.Modification = require('./Modification')(sequelize, Sequelize);

module.exports = db;

