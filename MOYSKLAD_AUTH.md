# Аутентификация в API МойСклад

## Описание

Сервис поддерживает два метода аутентификации для работы с API МойСклад:

1. **Basic Auth** (логин и пароль)
2. **Bearer Token** (токен доступа)

---

## Вариант 1: Basic Auth (рекомендуется)

### Что это?

Basic Auth использует ваш логин и пароль от МойСклад. При каждом запросе они автоматически кодируются в формате Base64 и отправляются в заголовке `Authorization`.

### Настройка

В файле `.env`:

```env
API_URL=https://api.moysklad.ru/api/remap/1.2/report/stock/all
API_LOGIN=ваш_логин@компания
API_PASSWORD=ваш_пароль
```

### Формат логина

Логин в МойСклад имеет формат: `email@компания`

**Пример:**
```
API_LOGIN=admin@my-company
API_PASSWORD=secure_password_123
```

### Как это работает?

1. Сервис берет `API_LOGIN` и `API_PASSWORD`
2. Кодирует их в Base64: `Buffer.from('login:password').toString('base64')`
3. Отправляет заголовок: `Authorization: Basic <base64-строка>`

---

## Вариант 2: Bearer Token

### Что это?

Bearer Token - это токен доступа, который можно сгенерировать в личном кабинете МойСклад.

### Как получить токен?

1. Войдите в МойСклад
2. Перейдите в **Настройки** → **Безопасность**
3. В разделе **Токены доступа** создайте новый токен
4. Скопируйте токен (он показывается только один раз!)

### Настройка

В файле `.env`:

```env
API_URL=https://api.moysklad.ru/api/remap/1.2/report/stock/all
API_TOKEN=ваш_токен_доступа
```

**Важно:** Если указан `API_TOKEN`, то `API_LOGIN` и `API_PASSWORD` игнорируются.

### Как это работает?

1. Сервис берет `API_TOKEN`
2. Отправляет заголовок: `Authorization: Bearer <токен>`

---

## Что выбрать?

| Критерий | Basic Auth | Bearer Token |
|----------|------------|--------------|
| Простота настройки | ✅ Простой | ⚠️ Нужно генерировать токен |
| Безопасность | ⚠️ Логин и пароль в .env | ✅ Отдельный токен, можно отозвать |
| Срок действия | ✅ Постоянный | ⚠️ Может истечь |
| Рекомендуется для | Разработки и тестирования | Production |

**Рекомендация:**
- Для начала используйте **Basic Auth** (проще)
- Для production используйте **Bearer Token** (безопаснее)

---

## Проверка авторизации

### Тест подключения к API

```cmd
npm run test:api
```

Скрипт автоматически определит, какой метод авторизации вы используете, и попытается подключиться к API МойСклад.

**Успешный результат:**
```
=== Тестирование подключения к API МойСклад ===

Параметры API:
  URL: https://api.moysklad.ru/api/remap/1.2/report/stock/all
  Метод авторизации: Basic Auth
  Login: admin@my-company
  Password: ***************

Отправка тестового запроса...
✓ Подключение к API МойСклад успешно!
  Статус ответа: 200 OK
  Тип контента: application/json;charset=utf-8

✓ Получено записей: 10
  Формат данных: МойСклад (rows)

✓ Тест завершен успешно!
```

---

## Устранение проблем

### Ошибка 401 Unauthorized

**Причины:**
- Неверный логин или пароль
- Неверный или истекший токен
- Токен отозван в МойСклад

**Решение:**
1. Проверьте правильность учетных данных в `.env`
2. Для Basic Auth: попробуйте войти в МойСклад с этим логином/паролем
3. Для Bearer Token: сгенерируйте новый токен

### Ошибка 403 Forbidden

**Причины:**
- У пользователя нет прав доступа к API
- API доступ отключен для вашей организации

**Решение:**
1. Проверьте права пользователя в МойСклад
2. Убедитесь, что API доступ включен в настройках

### Ошибка: "Не указаны данные для авторизации"

**Причины:**
- В `.env` не указан ни `API_TOKEN`, ни пара `API_LOGIN`/`API_PASSWORD`

**Решение:**
Добавьте в `.env`:
```env
# Вариант 1 (Basic Auth):
API_LOGIN=your_login
API_PASSWORD=your_password

# ИЛИ Вариант 2 (Bearer Token):
API_TOKEN=your_token
```

---

## Примеры запросов

### С Basic Auth (curl)

```bash
curl -X GET "https://api.moysklad.ru/api/remap/1.2/report/stock/all?limit=10" \
  -H "Authorization: Basic $(echo -n 'login:password' | base64)" \
  -H "Content-Type: application/json"
```

### С Bearer Token (curl)

```bash
curl -X GET "https://api.moysklad.ru/api/remap/1.2/report/stock/all?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### С PowerShell

```powershell
# Basic Auth
$credentials = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("login:password"))
Invoke-WebRequest -Uri "https://api.moysklad.ru/api/remap/1.2/report/stock/all?limit=10" `
  -Headers @{
    "Authorization" = "Basic $credentials"
    "Content-Type" = "application/json"
  }

# Bearer Token
Invoke-WebRequest -Uri "https://api.moysklad.ru/api/remap/1.2/report/stock/all?limit=10" `
  -Headers @{
    "Authorization" = "Bearer YOUR_TOKEN"
    "Content-Type" = "application/json"
  }
```

---

## Безопасность

### ✅ Хорошие практики:

1. **НЕ коммитьте .env в Git** (уже в .gitignore)
2. **Используйте разные учетные данные** для разработки и production
3. **Регулярно меняйте пароли** и перевыпускайте токены
4. **Ограничьте права** пользователя API до необходимого минимума
5. **Храните .env в безопасном месте** с ограниченным доступом

### ⚠️ Плохие практики:

1. ❌ Хранить пароли в коде
2. ❌ Отправлять .env по email или мессенджерам
3. ❌ Использовать одинаковые пароли для разных окружений
4. ❌ Давать API доступ с правами администратора без необходимости

---

## Дополнительная информация

Официальная документация МойСклад API:
- [Аутентификация](https://dev.moysklad.ru/doc/api/remap/1.2/#mojsklad-json-api-obschie-swedeniq-autentifikaciq)
- [Работа с API](https://dev.moysklad.ru/doc/api/remap/1.2/)
- [Отчет об остатках](https://dev.moysklad.ru/doc/api/remap/1.2/reports/#otchety-otchet-ostatki)

