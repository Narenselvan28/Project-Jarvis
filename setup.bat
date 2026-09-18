@echo off
echo =====================================================================
echo  Adaptive Production Scheduling Platform - Local Setup (Windows)
echo =====================================================================

echo.
echo [1/5] Checking Python & Node dependencies...
python --version
node --version
npm --version

echo.
echo [2/5] Installing Backend Python Requirements...
pip install -r requirements.txt

echo.
echo [3/5] Installing Frontend Dependencies...
cd frontend
call npm install
cd ..

echo.
echo [4/5] Training ML Models (Cycle Time & Failure Risk)...
python scripts\train_models.py

echo.
echo [5/5] Resetting and Seeding Database with Demonstration Scenario...
python scripts\demo_reset.py

echo.
echo =====================================================================
echo  SETUP COMPLETE!
echo.
echo  To start the application:
echo    Terminal 1 (Backend):  python backend\app.py
echo    Terminal 2 (Frontend): cd frontend ^&^& npm start
echo.
echo  Then open your browser at: http://localhost:3000
echo  Credentials:
echo    Manager:        manager / password123
echo    Supervisor:     supervisor / password123
echo    Service Person: service / password123
echo =====================================================================
pause
