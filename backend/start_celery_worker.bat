@echo off
REM Celery Worker Startup Script
REM This script starts the Celery worker for processing asynchronous tasks

echo.
echo ========================================
echo   Starting Celery Worker
echo ========================================
echo.

REM Activate virtual environment if it exists
if exist "internal_venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call internal_venv\Scripts\activate.bat
)

echo Starting Celery worker...
echo.
echo Note: Keep this terminal window open while using the application
echo Press CTRL+C to stop the worker
echo.

celery -A app.core.celery_app worker --loglevel=info --pool=solo

pause

