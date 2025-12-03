@echo off
REM Скрипт для создания .env файла на основе примера

echo ======================================
echo Создание файла .env
echo ======================================
echo.

if exist .env (
    echo [WARNING] Файл .env уже существует!
    echo Хотите перезаписать его? (Y/N)
    set /p OVERWRITE=
    if /i not "%OVERWRITE%"=="Y" (
        echo Отменено
        pause
        exit /b 0
    )
)

if not exist env.example.txt (
    echo [ERROR] Файл env.example.txt не найден!
    pause
    exit /b 1
)

copy env.example.txt .env
echo [OK] Файл .env создан!
echo.
echo ВАЖНО: Теперь отредактируйте файл .env и укажите ваши настройки:
echo   - API_URL - адрес вашего API
echo   - API_KEY - ключ доступа к API
echo   - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME - настройки MySQL
echo.
echo Открыть .env в блокноте? (Y/N)
set /p OPEN_FILE=
if /i "%OPEN_FILE%"=="Y" (
    notepad .env
)

pause

