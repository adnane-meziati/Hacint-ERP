@echo off
setlocal
title Install Hacint SolidWorks Bridge
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or is not available in PATH.
  echo Install Node.js LTS from https://nodejs.org/ and run this installer again.
  pause
  exit /b 1
)

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP%\Hacint SolidWorks Bridge.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath='%~dp0start-solidworks-bridge.bat'; $s.WorkingDirectory='%~dp0'; $s.WindowStyle=7; $s.Save()"
if errorlevel 1 (
  echo [ERROR] Could not create the Windows startup shortcut.
  pause
  exit /b 1
)

start "Hacint SolidWorks Bridge" /min "%~dp0start-solidworks-bridge.bat"
timeout /t 2 /nobreak >nul

powershell -NoProfile -Command "try { $r=Invoke-RestMethod 'http://127.0.0.1:43127/health' -TimeoutSec 5; Write-Host ('[OK] Bridge running. SolidWorks: ' + $r.solidWorksInstalled); exit 0 } catch { Write-Host ('[ERROR] Bridge health check failed: ' + $_.Exception.Message); exit 1 }"
if errorlevel 1 (
  echo Check the minimized Hacint SolidWorks Bridge window for the exact error.
  pause
  exit /b 1
)

echo.
echo Installation complete. The bridge will start automatically with Windows.
echo You may now return to the ERP and click View in SolidWorks.
pause
