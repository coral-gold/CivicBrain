@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org then double-click start.bat again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo First run: installing - this takes a few minutes. Please keep this window open.
  call npm install
  if errorlevel 1 (
    echo Install failed. Please take a screenshot of this window and send it.
    pause
    exit /b 1
  )
)
echo.
echo Starting CivicBrain. The first start also downloads a small database (about 100 MB) - please wait.
echo When you see "CivicBrain API listening", open http://localhost:5173
echo Your login codes are printed in this window (look for [DEV ONLY] OTP).
echo.
start "" cmd /c "timeout /t 25 /nobreak >nul & start http://localhost:5173"
call npm run demo
pause
