@echo off
title Setup - hacintmor.local

echo.
echo  ============================================================
echo    Configuration acces reseau : hacintmor.local
echo  ============================================================
echo.
echo  Ce script ajoute hacintmor.local dans le fichier hosts
echo  de CET appareil pour acceder au serveur MEGAINDUS.
echo.

REM ── Verification droits admin ────────────────────────────────────────────────
net session >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Ce script doit etre lance en tant qu'Administrateur.
    echo.
    echo  Comment faire :
    echo    1. Clic droit sur setup_hosts.bat
    echo    2. "Executer en tant qu'administrateur"
    echo.
    pause & exit /b 1
)

set "HOSTS=%SystemRoot%\System32\drivers\etc\hosts"
set "HOSTNAME=hacintmor.local"
set "SERVER_IP=192.168.16.110"
set "ENTRY=%SERVER_IP%    %HOSTNAME%"

REM ── Verification si l'entree existe deja ────────────────────────────────────
findstr /i "%HOSTNAME%" "%HOSTS%" >nul 2>&1
if not errorlevel 1 (
    echo [INFO] L'entree "%HOSTNAME%" existe deja :
    findstr /i "%HOSTNAME%" "%HOSTS%"
    echo.
    echo Vidage du cache DNS...
    ipconfig /flushdns >nul 2>&1
    echo [OK] Cache DNS vide. Aucune autre modification necessaire.
    echo.
    echo Vous pouvez maintenant acceder a : http://hacintmor.local
    echo.
    pause & exit /b 0
)

REM ── Ajout de l'entree ────────────────────────────────────────────────────────
echo Ajout dans %HOSTS% :
echo   %ENTRY%
echo.

echo %ENTRY%>> "%HOSTS%"
if errorlevel 1 (
    echo [ERREUR] Impossible de modifier le fichier hosts.
    echo         Essayez de desactiver l'antivirus temporairement.
    pause & exit /b 1
)

REM ── Vider le cache DNS ───────────────────────────────────────────────────────
echo Vidage du cache DNS...
ipconfig /flushdns >nul 2>&1

echo.
echo  ============================================================
echo    [OK] Configuration terminee !
echo.
echo    Cet appareil peut maintenant acceder a :
echo      http://hacintmor.local
echo.
echo    (Le serveur doit etre demarre sur 192.168.16.110)
echo  ============================================================
echo.
pause
