const path = require('path');
const { buildModelAttributes, readFieldMapping } = require('../utils/fieldMapping');

module.exports = (sequelize) => {
  let mapping;
  try {
    mapping = readFieldMapping(path.join(__dirname, '../modification_fields.txt'));
  } catch (error) {
    console.error('Ошибка чтения маппинга полей модификаций:', error.message);
    mapping = [];
  }

  const attributes = buildModelAttributes(mapping);

  const Modification = sequelize.define('Modification', attributes, {
    tableName: 'pbi_modifications',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      { fields: ['id_href'] },
      { fields: ['product_id'] },
      { fields: ['sync_date'] }
    ]
  });

  return Modification;
};
