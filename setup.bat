@echo off
setlocal enabledelayedexpansion

echo =====================================================================
echo  ARIVON: Adaptive Manufacturing Intelligence Platform - Windows Setup
echo =====================================================================
echo.

:: 1. Check Python
echo [1/7] Verifying Python installation (Python 3.11+ required)...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in PATH. Please install Python 3.11+.
    pause
    exit /b 1
)
python --version

:: 2. Check Node & NPM
echo.
echo [2/7] Verifying Node.js and NPM...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found in PATH. Please install Node.js 18+.
    pause
    exit /b 1
)
node --version
npm --version

:: 3. Prepare Environment Configuration (.env)
echo.
echo [3/7] Checking environment configuration...
if not exist ".env" (
    if exist ".env.example" (
        echo Copying .env.example to .env...
        copy .env.example .env >nul
    ) else (
        echo Creating default .env...
        echo APP_ENV=development>.env
        echo SECRET_KEY=arivon-secret-key-windows-2026>>.env
        echo JWT_SECRET_KEY=arivon-jwt-secret-windows-2026>>.env
        echo MONGO_URI=mongodb://127.0.0.1:27017/production_planning>>.env
        echo MONGO_DB_NAME=production_planning>>.env
    )
)

:: 4. Initialize Required Directories
echo.
echo [4/7] Initializing system directories...
if not exist "backend\ml\models" mkdir "backend\ml\models"
if not exist "backend\data\demo" mkdir "backend\data\demo"
if not exist "docs" mkdir "docs"

:: 5. Install Backend Dependencies
echo.
echo [5/7] Installing backend Python packages...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)

:: 6. Install Frontend Dependencies
echo.
echo [6/7] Installing frontend Node packages...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend npm packages.
    cd ..
    pause
    exit /b 1
)
cd ..

:: 7. Train Demonstration ML Models & Reset Demo Scenario
echo.
echo [7/7] Training ML Models and preparing guaranteed demonstration state...
python -m ml.train
python scripts\generate_demo_data.py
python scripts\demo_reset.py
if %errorlevel% neq 0 (
    echo [ERROR] Demo reset and seeding encountered an issue.
    pause
    exit /b 1
)

echo.
echo =====================================================================
echo  ARIVON SETUP COMPLETED SUCCESSFULLY!
echo =====================================================================
echo.
echo  To start the application:
echo.
echo    Terminal 1 (Backend API & WebSockets):
echo      python backend\app.py
echo.
echo    Terminal 2 (React Frontend Webpack Dev Server):
echo      cd frontend ^&^& npm start
echo.
echo  Access URLs:
echo    Web Application: http://localhost:3000
echo    Backend API:     http://localhost:5000/api/v1/factory
echo    Health Probe:    http://localhost:5000/health
echo    Readiness Probe: http://localhost:5000/ready
echo.
echo  Default Credentials:
echo    Manager:        manager / password123
echo    Supervisor:     supervisor / password123
echo    Service Person: service / password123
echo =====================================================================
pause
