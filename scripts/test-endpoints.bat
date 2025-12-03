@echo off
REM Скрипт для тестирования API endpoints

echo =========================================
echo Testing Stock Sync Service API Endpoints
echo =========================================
echo.

REM Проверка наличия curl
where curl >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] curl не найден!
    echo Используйте PowerShell или установите curl
    pause
    exit /b 1
)

set BASE_URL=http://localhost:3000

echo [1/4] Testing Service Info (GET /)
echo URL: %BASE_URL%/
echo.
curl -s %BASE_URL%/
echo.
echo ----------------------------------------
echo.

timeout /t 2 /nobreak >nul

echo [2/4] Testing Health Check (GET /health)
echo URL: %BASE_URL%/health
echo.
curl -s %BASE_URL%/health
echo.
echo ----------------------------------------
echo.

timeout /t 2 /nobreak >nul

echo [3/4] Testing Sync Status (GET /sync/status)
echo URL: %BASE_URL%/sync/status
echo.
curl -s %BASE_URL%/sync/status
echo.
echo ----------------------------------------
echo.

timeout /t 2 /nobreak >nul

echo [4/4] Testing Manual Sync (POST /sync/manual)
echo URL: %BASE_URL%/sync/manual
echo.
echo ВНИМАНИЕ: Запуск синхронизации!
echo.
curl -s -X POST %BASE_URL%/sync/manual
echo.
echo ----------------------------------------
echo.

echo.
echo =========================================
echo All tests completed!
echo =========================================
echo.
echo Проверьте логи для деталей:
echo   type logs\sync.log
echo.
pause

