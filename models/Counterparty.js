const path = require('path');
const { buildModelAttributes, readFieldMapping } = require('../utils/fieldMapping');

module.exports = (sequelize) => {
  let mapping;
  try {
    mapping = readFieldMapping(path.join(__dirname, '../counterparty_fields.txt'));
  } catch (error) {
    console.error('Ошибка чтения маппинга полей контрагентов:', error.message);
    mapping = [];
  }

  const attributes = buildModelAttributes(mapping);

  const Counterparty = sequelize.define('Counterparty', attributes, {
    tableName: 'pbi_counterparties',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      { fields: ['id_href'] },
      { fields: ['sync_date'] }
    ]
  });

  return Counterparty;
};
