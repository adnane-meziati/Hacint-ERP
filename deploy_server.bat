@echo off
setlocal EnableDelayedExpansion
title MEGAINDUS - Serveur LAN

echo.
echo  ============================================================
echo    MEGAINDUS - Suivi Echantillons  ^|  Serveur LAN
echo    http://192.168.16.110:8000
echo  ============================================================
echo.

REM ── 0. Verification de la racine du projet ───────────────────────────────────
if not exist "backend" (
    echo [ERREUR] Lancez ce script depuis la racine du projet sample-tracker\
    pause & exit /b 1
)

REM ── 0b. Verification droits admin (pare-feu requiert admin) ──────────────────
net session >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Ce script doit etre lance en tant qu'Administrateur.
    echo          Clic droit ^> "Executer en tant qu'administrateur"
    pause & exit /b 1
)

REM ── 0c. Ouverture du pare-feu sur port 8000 ──────────────────────────────────
echo [0/5] Configuration du pare-feu (port 8000)...
netsh advfirewall firewall delete rule name="MEGAINDUS HTTP port 8000" >nul 2>&1
netsh advfirewall firewall add rule name="MEGAINDUS HTTP port 8000" protocol=TCP dir=in localport=8000 action=allow profile=any >nul
echo       OK  -  pare-feu ouvert sur port 8000

REM ── 1. Build du frontend React ───────────────────────────────────────────────
echo.
echo [1/5] Compilation du frontend React...
cd frontend
call npm install --silent
if errorlevel 1 ( echo [ERREUR] npm install a echoue & cd .. & pause & exit /b 1 )
call npm run build
if errorlevel 1 ( echo [ERREUR] npm run build a echoue & cd .. & pause & exit /b 1 )
cd ..
echo       OK  -  frontend compile dans backend\frontend_dist\

REM ── 2. Environnement Python ──────────────────────────────────────────────────
echo.
echo [2/5] Preparation de l'environnement Python...
cd backend

REM Trouver Python (py launcher, python3, ou python)
set PYTHON_CMD=
where py >nul 2>&1
if not errorlevel 1 ( set PYTHON_CMD=py )
if "!PYTHON_CMD!"=="" (
    where python3 >nul 2>&1
    if not errorlevel 1 ( set PYTHON_CMD=python3 )
)
if "!PYTHON_CMD!"=="" (
    where python >nul 2>&1
    if not errorlevel 1 (
        python --version 2>&1 | findstr /v "Windows Apps" >nul 2>&1
        if not errorlevel 1 ( set PYTHON_CMD=python )
    )
)
if "!PYTHON_CMD!"=="" (
    echo [ERREUR] Python introuvable. Installez Python 3.10+ depuis https://python.org
    echo         Cochez "Add Python to PATH" lors de l'installation.
    cd ..
    pause & exit /b 1
)
echo       Python trouve : !PYTHON_CMD!

if not exist ".venv\Scripts\python.exe" (
    echo       Creation du venv...
    !PYTHON_CMD! -m venv .venv
    if errorlevel 1 ( echo [ERREUR] Impossible de creer le venv & cd .. & pause & exit /b 1 )
)

set VENV_PYTHON=.venv\Scripts\python.exe
set VENV_PIP=.venv\Scripts\pip.exe

!VENV_PIP! install -r requirements.txt --quiet
if errorlevel 1 ( echo [ERREUR] pip install a echoue & cd .. & pause & exit /b 1 )
echo       OK  -  dependances Python installees

REM ── 3. Fichier .env ──────────────────────────────────────────────────────────
echo.
echo [3/5] Configuration...
if not exist ".env" (
    if exist ".env.server" (
        copy ".env.server" ".env" >nul
        echo       OK  -  .env cree depuis .env.server
    ) else if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo       OK  -  .env cree depuis .env.example
    ) else (
        echo       [INFO] Pas de fichier .env, utilisation des valeurs par defaut
    )
)

REM ── 4. Migrations + init ─────────────────────────────────────────────────────
echo.
echo [4/5] Migrations de la base de donnees...
!VENV_PYTHON! manage.py migrate
if errorlevel 1 (
    echo [ERREUR] Migrations echouees.
    echo         Verifiez que PostgreSQL est demarre et que .env est configure.
    cd ..
    pause & exit /b 1
)
!VENV_PYTHON! init_groups.py
echo       OK  -  base de donnees prete

REM ── 5. Demarrage du serveur ───────────────────────────────────────────────────
echo.
echo [5/5] Demarrage de Django sur 0.0.0.0:8000...
echo.
echo  ============================================================
echo.
echo    Application disponible sur le reseau :
echo.
echo      http://192.168.16.110:8000           (depuis tout appareil)
echo      http://192.168.16.110:8000/admin     (administration)
echo.
echo    Identifiants par defaut : admin / admin123
echo.
echo    Appuyez sur Ctrl+C pour arreter le serveur.
echo  ============================================================
echo.

!VENV_PYTHON! manage.py runserver 0.0.0.0:8000

echo.
echo [INFO] Serveur arrete.
pause
