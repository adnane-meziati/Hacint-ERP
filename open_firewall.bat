@echo off
title MEGAINDUS - Ouverture du pare-feu

echo.
echo  ============================================================
echo    MEGAINDUS - Ouverture du pare-feu (port 8000)
echo  ============================================================
echo.

net session >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Clic droit ^> "Executer en tant qu'administrateur"
    pause & exit /b 1
)

netsh advfirewall firewall delete rule name="MEGAINDUS HTTP port 8000" >nul 2>&1
netsh advfirewall firewall add rule name="MEGAINDUS HTTP port 8000" protocol=TCP dir=in localport=8000 action=allow profile=any

echo.
echo  [OK] Les autres appareils peuvent maintenant acceder a :
echo       http://192.168.16.110:8000
echo.
pause
