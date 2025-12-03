@echo off
REM Скрипт быстрого старта для Windows

echo ======================================
echo Stock Sync Service - Quick Start
echo ======================================
echo.

REM Проверка наличия Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js не установлен!
    echo Установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js установлен
node --version
echo.

REM Проверка наличия package.json
if not exist package.json (
    echo [ERROR] Файл package.json не найден!
    echo Убедитесь, что вы находитесь в папке проекта
    pause
    exit /b 1
)

echo [STEP 1] Установка зависимостей...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Ошибка установки зависимостей
    pause
    exit /b 1
)
echo [OK] Зависимости установлены
echo.

REM Проверка наличия .env файла
if not exist .env (
    echo [WARNING] Файл .env не найден!
    echo.
    if exist env.example.txt (
        echo Хотите создать .env на основе env.example.txt? (Y/N)
        set /p CREATE_ENV=
        if /i "%CREATE_ENV%"=="Y" (
            copy env.example.txt .env
            echo [OK] Файл .env создан
            echo ВАЖНО: Отредактируйте .env и укажите ваши настройки!
            echo.
            pause
        ) else (
            echo [WARNING] Создайте файл .env вручную перед запуском!
            echo.
        )
    )
)

REM Проверка наличия папки logs
if not exist logs (
    echo [STEP 2] Создание папки logs...
    mkdir logs
    echo [OK] Папка logs создана
) else (
    echo [OK] Папка logs существует
)
echo.

echo [STEP 3] Тестирование подключения к базе данных...
call npm run test:db
echo.

echo ======================================
echo Настройка завершена!
echo ======================================
echo.
echo Для запуска сервиса используйте:
echo   npm start          - обычный запуск
echo   npm run dev        - режим разработки с автоперезагрузкой
echo.
echo Для установки как Windows Service:
echo   npm run install:service
echo.
echo Документация:
echo   README.md              - общая документация
echo   INSTALL_WINDOWS.md     - установка на Windows
echo   TODO.md                - что нужно доработать
echo.
echo Хотите запустить сервис сейчас? (Y/N)
set /p START_NOW=
if /i "%START_NOW%"=="Y" (
    echo.
    echo Запуск сервиса...
    call npm start
)

pause

