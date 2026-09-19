@echo off
echo =====================================================================
echo  Starting Adaptive Production Scheduling Platform...
echo =====================================================================

echo.
echo [1/2] Launching Backend Server on http://127.0.0.1:5000...
start "APS Backend Server (Flask :5000)" cmd /k "python backend\app.py"

echo.
echo [2/2] Launching Frontend Server on http://localhost:3000...
start "APS Frontend Server (Webpack :3000)" cmd /k "cd frontend && npm start"

echo.
echo =====================================================================
echo  Servers are starting in separate windows!
echo  Open your web browser at: http://localhost:3000
echo.
echo  Default Login Credentials:
echo    - Manager:        manager / password123
echo    - Supervisor:     supervisor / password123
echo    - Service Person: service / password123
echo    - Administrator:  admin / password123
echo =====================================================================
