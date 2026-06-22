@echo off
title Hacint SolidWorks Bridge
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or is not available in PATH.
  echo Install Node.js LTS from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)

echo Starting Hacint SolidWorks Bridge...
echo Keep this window open while using the ERP.
echo.
node solidworks-bridge.mjs

echo.
echo [ERROR] The bridge stopped unexpectedly. Exit code: %errorlevel%
pause
