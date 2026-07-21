@echo off
setlocal
title DevelopmentOS @personal
cd /d "%~dp0"

if defined APPDATA (
  set "PATH=%APPDATA%\npm;%PATH%"
)

if not exist ".env.bridge.local" (
  echo.
  echo  Missing .env.bridge.local
  echo.
  echo  Run once in this folder:
  echo    npm run setup-bridge -- -Token "YOUR_TOKEN"
  echo.
  echo  Get the token from DevelopmentOS - Settings - Personal / Codex.
  echo.
  pause
  exit /b 1
)

echo.
echo  Starting @personal bridge...
echo  Close this window to stop.
echo.

node scripts/start-personal.mjs
set EXIT_CODE=%ERRORLEVEL%

echo.
if %EXIT_CODE% NEQ 0 (
  echo  Bridge exited with error %EXIT_CODE%.
) else (
  echo  Bridge stopped.
)
echo.
pause
exit /b %EXIT_CODE%
