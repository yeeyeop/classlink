@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js 20 or newer first.
  pause
  exit /b 1
)

if not exist ".env.local" copy /Y ".env.example" ".env.local" >nul

if not exist "node_modules" (
  echo First run: installing dependencies. This may take a few minutes...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting CLASSLINK in LAN mode...
if not exist ".next\BUILD_ID" (
  echo Building the production bundle for LAN sharing...
  call npm run build
  if errorlevel 1 (
    echo Production build failed.
    pause
    exit /b 1
  )
)

start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 5; Start-Process 'http://localhost:3000'"
call npm run start:lan

if errorlevel 1 (
  echo The CLASSLINK server stopped with an error.
  pause
  exit /b 1
)

endlocal
