@echo off
setlocal
cd /d "%~dp0"
node --version >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 22 or newer, then open this launcher again.
  pause
  exit /b 1
)
node "%~dp0scripts\serve.mjs" --open %*
if errorlevel 1 pause

