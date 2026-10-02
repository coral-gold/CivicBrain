@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo   CivicBrain - starting
echo ============================================

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker is not installed. Install Docker Desktop from https://www.docker.com/products/docker-desktop
  pause
  exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
  echo.
  echo Docker Desktop is NOT running.
  echo Open Docker Desktop, wait until it says the engine is running, then double-click start.bat again.
  pause
  exit /b 1
)

echo.
echo Building and starting. The FIRST time can take 5-20 minutes. Later starts take under a minute.
echo Please keep this window open.
echo.
docker compose up --build -d
if errorlevel 1 (
  echo.
  echo SOMETHING WENT WRONG while building. Please take a screenshot of this whole window and send it.
  pause
  exit /b 1
)

echo.
echo Waiting for the app to be ready...
set /a n=0
:loop
curl.exe -fs http://localhost:3000/api/public/config >nul 2>nul
if not errorlevel 1 goto ready
set /a n+=1
if %n% GEQ 90 goto failed
timeout /t 2 /nobreak >nul
goto loop

:failed
echo.
echo The app did not become ready. Here is what it says (please send a screenshot):
echo ----------------------------------------------------------------
docker compose ps
docker compose logs --tail 25
pause
exit /b 1

:ready
echo.
echo ============================================
echo   CivicBrain is running
echo ============================================
echo   App:          http://localhost:3000
echo   Email inbox:  http://localhost:8025   (login codes appear here)
echo   Staff login:  http://localhost:3000/admin/login
echo       Officer:  officer@civicbrain.demo / Officer!Demo2026
echo       Admin:    admin@civicbrain.demo   / Admin!Demo2026x
echo.
echo To stop it later: docker compose down
start http://localhost:3000
pause
