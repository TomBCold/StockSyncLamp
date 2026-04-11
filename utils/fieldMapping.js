const fs = require('fs');
const path = require('path');
const { DataTypes } = require('sequelize');

const FIELD_MAP_FILE = path.join(__dirname, '../product_fields.txt');
const MAPPED_ATTR_RULES = require('./mappedAttributesRules');

/**
 * Имя поля в Sequelize: колонка attributes зарезервирована в API модели — используем attributesJson + field: attributes
 * @param {string} dbColumn
 * @returns {string}
 */
function dbColumnToModelKey(dbColumn) {
  if (dbColumn === 'attributes') return 'attributesJson';
  return dbColumn.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Парсинг строки типа данных в Sequelize DataType
 * @param {string} typeStr - Строка типа, например "STRING(255)", "DECIMAL(9,2)", "BOOLEAN"
 * @returns {Object} - Sequelize DataType
 */
function parseDataType(typeStr) {
  const str = typeStr.trim().toUpperCase();

  const match = str.match(/^(\w+)(?:\((.+)\))?$/);
  if (!match) return DataTypes.STRING;

  const typeName = match[1];
  const params = match[2];

  switch (typeName) {
    case 'STRING':
    case 'NVARCHAR':
      return params ? DataTypes.STRING(parseInt(params, 10)) : DataTypes.STRING;
    case 'TEXT':
      return DataTypes.TEXT;
    case 'INTEGER':
    case 'INT':
      return DataTypes.INTEGER;
    case 'BIGINT':
      return DataTypes.BIGINT;
    case 'DECIMAL': {
      if (params) {
        const [precision, scale] = params.split(',').map(s => parseInt(s.trim(), 10));
        return DataTypes.DECIMAL(precision, scale);
      }
      return DataTypes.DECIMAL;
    }
    case 'BOOLEAN':
      return DataTypes.BOOLEAN;
    case 'DATE':
      return DataTypes.DATE;
    case 'FLOAT':
      return DataTypes.FLOAT;
    case 'JSON':
      return DataTypes.TEXT;
    default:
      return DataTypes.STRING;
  }
}

/**
 * Чтение и парсинг файла маппинга полей
 * @returns {Array<{apiField: string, dbColumn: string, dataType: string, transform: string|null}>}
 */
function readFieldMapping() {
  if (!fs.existsSync(FIELD_MAP_FILE)) {
    throw new Error(`Файл маппинга не найден: ${FIELD_MAP_FILE}`);
  }

  const content = fs.readFileSync(FIELD_MAP_FILE, 'utf8');
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  return lines.map(line => {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 3) {
      throw new Error(`Неверный формат строки маппинга: "${line}". Ожидается: поле_api | поле_бд | тип_данных [ | трансформация ]`);
    }
    return {
      apiField: parts[0],
      dbColumn: parts[1],
      dataType: parts[2],
      transform: parts[3] || null
    };
  });
}

/**
 * Извлечение значения из объекта по пути с точкой (meta.href → obj.meta.href)
 * @param {Object} obj - Объект API
 * @param {string} fieldPath - Путь к полю, например "meta.href"
 * @returns {*} - Значение поля или null
 */
function getNestedValue(obj, fieldPath) {
  const parts = fieldPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return null;
    current = current[part];
  }
  return current !== undefined ? current : null;
}

/**
 * Извлечение UUID из URL МойСклад (meta.href)
 * @param {string} href - URL вида https://api.moysklad.ru/api/remap/1.2/entity/product/UUID
 * @returns {string|null}
 */
function extractIdFromHref(href) {
  if (!href) return null;
  const match = href.match(/\/entity\/\w+\/([a-f0-9-]+)(\?|$)/i);
  return match ? match[1] : null;
}

/**
 * Значение цены продажи из salePrices по имени типа цены (priceType.name)
 * @param {Array} salePrices - Массив salePrices из API товара
 * @param {string} priceTypeName - Точное совпадение с priceType.name
 * @returns {number|null}
 */
function getSalePriceValueByTypeName(salePrices, priceTypeName) {
  if (!Array.isArray(salePrices)) return null;
  const entry = salePrices.find(
    p => p && p.priceType && p.priceType.name === priceTypeName
  );
  if (!entry) return null;
  return entry.value !== undefined && entry.value !== null ? entry.value : null;
}

/** Разделитель для «Категория ОЗ» → category / subcategory */
const CATEGORY_OZ_SPLIT_SEP = ' // ';

/**
 * Значение доп. поля по имени атрибута (как в МойСклад: name в metadata).
 * long/time/boolean/string/double — value; customentity — value.name
 * @param {Array} attributes
 * @param {string} attrName
 * @returns {*}
 */
function getAttributeValueByName(attributes, attrName) {
  if (!Array.isArray(attributes)) return null;
  const attr = attributes.find(a => a.name === attrName);
  if (!attr) return null;

  const t = String(attr.type || '').toLowerCase();
  if (t === 'customentity') {
    if (attr.value == null) return null;
    if (typeof attr.value === 'object' && attr.value.name !== undefined) {
      return attr.value.name;
    }
    return typeof attr.value === 'string' ? attr.value : null;
  }

  return attr.value !== undefined ? attr.value : null;
}

/**
 * customentity: строка name режется по separator; partIndex 0 — первая часть, 1 — вторая
 * @param {Array} attributes
 * @param {string} attrName
 * @param {number} partIndex
 * @param {string} [separator=CATEGORY_OZ_SPLIT_SEP]
 * @returns {string|null}
 */
function getAttributeSplitPart(attributes, attrName, partIndex, separator = CATEGORY_OZ_SPLIT_SEP) {
  if (!Array.isArray(attributes)) return null;
  const attr = attributes.find(a => a.name === attrName);
  if (!attr) return null;

  let text = null;
  const t = String(attr.type || '').toLowerCase();
  if (t === 'customentity') {
    if (attr.value && typeof attr.value === 'object' && attr.value.name != null) {
      text = String(attr.value.name);
    } else if (typeof attr.value === 'string') {
      text = attr.value;
    }
  }
  if (text == null || text === '') return null;

  const parts = text.split(separator).map(s => s.trim());
  return parts[partIndex] !== undefined ? parts[partIndex] : null;
}

/**
 * Объект со всеми доп. полями по правилам скриншота (ключи — имена колонок из маппинга)
 * @param {Array} attributes
 * @returns {Object}
 */
function buildMappedAttributesObject(attributes) {
  const out = {};
  for (const rule of MAPPED_ATTR_RULES) {
    if (rule.kind === 'scalar') {
      const v = getAttributeValueByName(attributes, rule.name);
      out[rule.key] = v === undefined ? null : v;
    } else if (rule.kind === 'split') {
      const [k0, k1] = rule.keys;
      out[k0] = getAttributeSplitPart(attributes, rule.name, 0);
      out[k1] = getAttributeSplitPart(attributes, rule.name, 1);
    }
  }
  return out;
}

/**
 * Извлечение значения дополнительного поля (attribute) из массива attributes
 * @param {Array} attributes - Массив attributes из API
 * @param {string} attrId - UUID атрибута
 * @param {string|null} subField - Подполе (например "name"), по умолчанию "value"
 * @returns {*} - Значение атрибута или null
 */
function getAttributeValue(attributes, attrId, subField) {
  if (!Array.isArray(attributes)) return null;
  const attr = attributes.find(a => a.id === attrId);
  if (!attr) return null;

  const key = subField || 'value';

  // Если value — объект со своим meta.href (ссылка на справочник), извлекаем имя
  if (key === 'value' && attr.value && typeof attr.value === 'object') {
    return attr.value.name || null;
  }

  return attr[key] !== undefined ? attr[key] : null;
}

/**
 * Парсинг поля API: определяет тип доступа (обычное, attribute, salePrice, вложенное)
 * @param {string} apiField - Строка поля, например "name", "salePrice(\"Цена продажи\")", "attribute(UUID)"
 * @returns {{type: string, path?: string, attrId?: string, subField?: string, priceTypeName?: string}}
 */
function parseApiField(apiField) {
  if (apiField === 'mappedAttributes') {
    return { type: 'mappedAttributes' };
  }
  // salePrice("имя типа цены") — элемент salePrices[] по priceType.name
  const salePriceMatch = apiField.match(/^salePrice\("([^"]*)"\)$/);
  if (salePriceMatch) {
    return { type: 'salePrice', priceTypeName: salePriceMatch[1] };
  }
  // attribute(UUID) или attribute(UUID).subfield
  const attrMatch = apiField.match(/^attribute\(([a-f0-9-]+)\)(?:\.(\w+))?$/i);
  if (attrMatch) {
    return { type: 'attribute', attrId: attrMatch[1], subField: attrMatch[2] || null };
  }
  return { type: 'path', path: apiField };
}

/**
 * Применение трансформации к значению
 * @param {*} value - Исходное значение
 * @param {string|null} transform - Строка трансформации, например "/100"
 * @returns {*} - Преобразованное значение
 */
function applyTransform(value, transform) {
  if (!transform || value == null) return value;

  const divMatch = transform.match(/^\/(\d+)$/);
  if (divMatch) {
    const divisor = Number(divMatch[1]);
    const num = Number(value);
    return isNaN(num) ? value : num / divisor;
  }

  const mulMatch = transform.match(/^\*(\d+)$/);
  if (mulMatch) {
    const multiplier = Number(mulMatch[1]);
    const num = Number(value);
    return isNaN(num) ? value : num * multiplier;
  }

  return value;
}

/**
 * Трансформация одного элемента API в объект для БД согласно маппингу
 * @param {Object} item - Элемент из API МойСклад
 * @param {Array} mapping - Массив маппинга из readFieldMapping()
 * @returns {Object|null} - Объект для записи в БД
 */
function transformItem(item, mapping) {
  const record = {};

  for (const field of mapping) {
    const parsed = parseApiField(field.apiField);
    let value;

    if (parsed.type === 'attribute') {
      value = getAttributeValue(item.attributes, parsed.attrId, parsed.subField);
    } else if (parsed.type === 'mappedAttributes') {
      value = buildMappedAttributesObject(item.attributes);
    } else if (parsed.type === 'salePrice') {
      value = getSalePriceValueByTypeName(item.salePrices, parsed.priceTypeName);
    } else {
      value = getNestedValue(item, parsed.path);
    }

    // Для полей *.href автоматически извлекаем UUID
    if (parsed.path && parsed.path.endsWith('.href') && typeof value === 'string') {
      value = extractIdFromHref(value);
    }

    // Тип JSON — сериализуем объект/массив в строку
    if (field.dataType.trim().toUpperCase() === 'JSON' && value != null && typeof value === 'object') {
      value = JSON.stringify(value);
    }

    // Применяем трансформацию (например /100)
    value = applyTransform(value, field.transform);

    const modelKey = dbColumnToModelKey(field.dbColumn);
    record[modelKey] = value;
  }

  return record;
}

/**
 * Построение определения полей Sequelize из маппинга
 * @param {Array} mapping - Массив маппинга из readFieldMapping()
 * @returns {Object} - Определение полей для sequelize.define()
 */
function buildModelAttributes(mapping) {
  const attributes = {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    }
  };

  for (const field of mapping) {
    const modelKey = dbColumnToModelKey(field.dbColumn);
    attributes[modelKey] = {
      type: parseDataType(field.dataType),
      allowNull: true,
      field: field.dbColumn
    };
  }

  // Системное поле: дата синхронизации
  attributes.syncDate = {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'sync_date'
  };

  return attributes;
}

module.exports = {
  readFieldMapping,
  parseDataType,
  getNestedValue,
  extractIdFromHref,
  getSalePriceValueByTypeName,
  getAttributeValueByName,
  getAttributeSplitPart,
  buildMappedAttributesObject,
  dbColumnToModelKey,
  applyTransform,
  transformItem,
  buildModelAttributes
};
