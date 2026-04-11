const { buildModelAttributes, readFieldMapping } = require('../utils/fieldMapping');

module.exports = (sequelize, Sequelize) => {
  let mapping;
  try {
    mapping = readFieldMapping();
  } catch (error) {
    console.error('Ошибка чтения маппинга полей товаров:', error.message);
    mapping = [];
  }

  const attributes = buildModelAttributes(mapping);

  const Product = sequelize.define('Product', attributes, {
    tableName: 'pbi_products',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      { fields: ['id_href'] },
      { fields: ['sync_date'] }
    ]
  });

  return Product;
};
