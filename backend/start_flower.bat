@echo off
REM Flower Monitoring Dashboard Startup Script
REM This script starts Flower for monitoring Celery tasks

echo.
echo ========================================
echo   Starting Flower Monitoring Dashboard
echo ========================================
echo.

REM Activate virtual environment if it exists
if exist "internal_venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call internal_venv\Scripts\activate.bat
)

echo Starting Flower...
echo.
echo Dashboard will be available at: http://localhost:5555
echo Press CTRL+C to stop Flower
echo.

celery -A app.core.celery_app flower --port=5555

pause

