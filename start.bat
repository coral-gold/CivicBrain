@echo off
cd /d "%~dp0"
where docker >nul 2>nul || (echo Docker is not installed. Install Docker Desktop from https://www.docker.com/products/docker-desktop & pause & exit /b 1)
echo Starting CivicBrain (first time takes a few minutes)...
docker compose up --build -d || (echo Could not start. Is Docker Desktop open and running? & pause & exit /b 1)
echo Waiting for the app...
timeout /t 40 >nul
echo.
echo CivicBrain is running.
echo   App:          http://localhost:3000
echo   Email inbox:  http://localhost:8025   (login codes appear here)
echo   Staff login:  http://localhost:3000/admin/login
echo       Officer:  officer@civicbrain.demo / Officer!Demo2026
echo       Admin:    admin@civicbrain.demo   / Admin!Demo2026x
echo To stop: docker compose down
start http://localhost:3000
pause
