// Скрипт для тестирования подключения к API МойСклад
require('dotenv').config();
const axios = require('axios');

/**
 * Получение заголовка авторизации
 * @returns {string} - Заголовок Authorization
 */
function getAuthHeader() {
  const apiToken = process.env.API_TOKEN;
  const apiLogin = process.env.API_LOGIN;
  const apiPassword = process.env.API_PASSWORD;

  if (apiToken) {
    // Аутентификация по токену (Bearer Token)
    return `Bearer ${apiToken}`;
  } else if (apiLogin && apiPassword) {
    // Аутентификация Basic Auth (логин:пароль в Base64)
    const credentials = Buffer.from(`${apiLogin}:${apiPassword}`).toString('base64');
    return `Basic ${credentials}`;
  } else {
    throw new Error('Не указаны данные для авторизации');
  }
}

async function testApi() {
  console.log('=== Тестирование подключения к API МойСклад ===\n');
  
  const apiUrl = process.env.API_URL;
  const apiToken = process.env.API_TOKEN;
  const apiLogin = process.env.API_LOGIN;
  const apiPassword = process.env.API_PASSWORD;

  console.log('Параметры API:');
  console.log(`  URL: ${apiUrl}`);
  
  if (apiToken) {
    console.log(`  Метод авторизации: Bearer Token`);
    console.log(`  Token: ${apiToken.substring(0, 10)}...`);
  } else if (apiLogin && apiPassword) {
    console.log(`  Метод авторизации: Basic Auth`);
    console.log(`  Login: ${apiLogin}`);
    console.log(`  Password: ${'*'.repeat(apiPassword.length)}`);
  } else {
    console.error('✗ Ошибка: Не указаны данные для авторизации');
    console.error('   Установите API_TOKEN или (API_LOGIN и API_PASSWORD) в .env файле');
    process.exit(1);
  }
  console.log('');

  if (!apiUrl) {
    console.error('✗ Ошибка: API_URL не установлен в .env файле');
    process.exit(1);
  }

  try {
    console.log('Отправка тестового запроса...');
    
    const authHeader = getAuthHeader();
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip'
      },
      params: {
        limit: 10 // Запросить только 10 записей для теста
      },
      timeout: 10000
    });

    console.log('✓ Подключение к API МойСклад успешно!');
    console.log(`  Статус ответа: ${response.status} ${response.statusText}`);
    console.log(`  Тип контента: ${response.headers['content-type']}`);
    
    if (response.data) {
      console.log('\nПример данных (первые 800 символов):');
      const dataStr = JSON.stringify(response.data, null, 2);
      console.log(dataStr.substring(0, 800));
      if (dataStr.length > 800) {
        console.log('...\n(данные обрезаны)');
      }
      
      if (response.data.rows && Array.isArray(response.data.rows)) {
        console.log(`\n✓ Получено записей: ${response.data.rows.length}`);
        console.log(`  Формат данных: МойСклад (rows)`);
      } else if (Array.isArray(response.data)) {
        console.log(`\n✓ Получено записей: ${response.data.length}`);
        console.log(`  Формат данных: Массив`);
      }
    }

    console.log('\n✓ Тест завершен успешно!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Ошибка подключения к API:');
    
    if (error.response) {
      console.error(`  Статус: ${error.response.status} ${error.response.statusText}`);
      console.error(`  Данные: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error('  Запрос был отправлен, но ответ не получен');
      console.error(`  ${error.message}`);
    } else {
      console.error(`  ${error.message}`);
    }

    console.error('\nПроверьте:');
    console.error('  1. API_URL корректен');
    console.error('  2. API_TOKEN или (API_LOGIN и API_PASSWORD) в файле .env корректны');
    console.error('  3. API МойСклад доступен и работает');
    console.error('  4. Сетевое подключение работает');
    console.error('  5. Учетные данные действительны');
    process.exit(1);
  }
}

testApi();

