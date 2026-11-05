@echo off
setlocal
chcp 65001 >nul

set "APP_DIR=%~dp0项目源码"
if not exist "%APP_DIR%\package.json" set "APP_DIR=%~dp0"
if not exist "%APP_DIR%\package.json" set "APP_DIR=E:\最终提交\项目源码"

if not exist "%APP_DIR%\package.json" (
  echo Cannot find the CLASSLINK project.
  pause
  exit /b 1
)

cd /d "%APP_DIR%"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  pause
  exit /b 1
)

call npm run lan:share
pause
endlocal
