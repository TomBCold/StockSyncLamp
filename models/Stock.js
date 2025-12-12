module.exports = (sequelize, Sequelize) => {
  const { DataTypes } = Sequelize;
  
  const Stock = sequelize.define('Stock', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: 'ID записи (автоинкремент)'
    },
    // Идентификаторы
    idProd: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'id_prod',
      comment: 'ID товара из МойСклад (UUID)'
    },
    idWarehouse: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'id_warehouse',
      comment: 'ID склада из МойСклад (UUID)'
    },
    // Дата синхронизации (с часовым поясом)
    syncDate: {
      type: 'DATETIMEOFFSET',
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'sync_date',
      comment: 'Дата и время синхронизации с часовым поясом'
    },
    // Дата остатка (за какую дату этот остаток из API)
    stockDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'stock_date',
      comment: 'Дата и время остатка (из параметра moment API)'
    },
    // Остатки
    qtyStock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'qty_stock',
      comment: 'Остаток на складе (stock)'
    },
    qtyReserved: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'qty_reserved',
      comment: 'Зарезервировано (reserve)'
    },
    qtyAvailable: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'qty_available',
      comment: 'Доступно (quantity)'
    },
    qtyInTransit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'qty_in_transit',
      comment: 'В пути (inTransit)'
    },
    // Финансовые данные
    avgCost: {
      type: DataTypes.DECIMAL(9, 2),
      allowNull: true,
      defaultValue: 0,
      field: 'avg_cost',
      comment: 'Средняя стоимость (price/100, с копейками)'
    },
    // Аналитика
    daysOnStock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'days_on_stock',
      comment: 'Дней на складе (stockDays)'
    }
  }, {
    tableName: 'pbi_test',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      { fields: ['id_prod'] },
      { fields: ['id_warehouse'] },
      { fields: ['sync_date'] },
      { fields: ['stock_date'] },
      { fields: ['id_warehouse', 'sync_date'] },
      { fields: ['id_warehouse', 'stock_date'] },
      { fields: ['id_prod', 'id_warehouse'] }
    ]
  });

  return Stock;
};

