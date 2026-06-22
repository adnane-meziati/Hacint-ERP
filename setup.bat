@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title HACINT — Setup and Launch

REM ═══════════════════════════════════════════════════════════════════════════════
REM  HACINT — Gestion Industrielle
REM  Setup and launch script for Windows
REM  Usage: Double-click OR run from project root:  setup.bat
REM ═══════════════════════════════════════════════════════════════════════════════

color 0F
echo.
echo  ================================================
echo    HACINT  -  Gestion Industrielle v2
echo    Setup and Launch
echo  ================================================
echo.

REM ── Must run from project root ────────────────────────────────────────────────
if not exist "backend" (
    echo  [ERREUR] Dossier "backend" introuvable.
    echo  Lancez setup.bat depuis la RACINE du projet.
    pause & exit /b 1
)
if not exist "frontend" (
    echo  [ERREUR] Dossier "frontend" introuvable.
    echo  Lancez setup.bat depuis la RACINE du projet.
    pause & exit /b 1
)
if not exist "docker-compose.yml" (
    echo  [ERREUR] docker-compose.yml introuvable.
    echo  Lancez setup.bat depuis la RACINE du projet.
    pause & exit /b 1
)

REM ── Detect local LAN IP ───────────────────────────────────────────────────────
set "LOCAL_IP=localhost"
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /R "IPv4"') do (
    set "raw=%%A"
    set "raw=!raw: =!"
    if not "!raw:~0,3!"=="127" if not defined LOCAL_IP_SET (
        set "LOCAL_IP=!raw!"
        set LOCAL_IP_SET=1
    )
)

REM ── Choose mode ───────────────────────────────────────────────────────────────
echo  Choisissez le mode de demarrage :
echo.
echo   [1] Docker   (recommande)  - necessite Docker Desktop
echo   [2] Natif                  - Python + Node.js locaux, SQLite
echo.
set /p "MODE=  Votre choix [1 ou 2, Entree = 1] : "
if "%MODE%"=="" set MODE=1
if "%MODE%"=="1" goto :docker_mode
if "%MODE%"=="2" goto :native_mode
echo  Choix invalide, mode Docker utilise.
goto :docker_mode


REM ═══════════════════════════════════════════════════════════════════════════════
:docker_mode
echo.
echo  ─────────────────────────────────────────────────
echo   MODE DOCKER
echo  ─────────────────────────────────────────────────
echo.

REM ── Check Docker is running ───────────────────────────────────────────────────
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERREUR] Docker n'est pas demarre.
    echo.
    echo  Demarrez Docker Desktop et reessayez.
    echo  Telechargez sur : https://www.docker.com/products/docker-desktop
    pause & exit /b 1
)
echo  [OK] Docker detecte.

REM ── Detect docker compose command (V2 vs V1) ──────────────────────────────────
docker compose version >nul 2>&1
if %errorlevel% equ 0 (
    set "DC=docker compose"
) else (
    docker-compose version >nul 2>&1
    if %errorlevel% equ 0 (
        set "DC=docker-compose"
    ) else (
        echo  [ERREUR] Ni "docker compose" ni "docker-compose" n'est disponible.
        pause & exit /b 1
    )
)
echo  [OK] Commande compose : %DC%
echo.

REM ── Build and start all containers ───────────────────────────────────────────
echo  [1/4] Construction et demarrage des conteneurs...
echo        (base de donnees + backend + frontend)
echo        Cela peut prendre quelques minutes la premiere fois.
echo.
%DC% up --build -d
if %errorlevel% neq 0 (
    echo.
    echo  [ERREUR] Echec du demarrage. Consultez les logs :
    echo    %DC% logs
    pause & exit /b 1
)
echo.
echo  [OK] Conteneurs lances.
echo.

REM ── Wait for backend to be healthy (migrations run inside container) ──────────
echo  [2/4] Attente du backend + migrations...
echo        (les migrations s'executent automatiquement au demarrage)
set TRIES=0
:wait_loop
set /a TRIES+=1
if %TRIES% gtr 60 (
    echo.
    echo  [ERREUR] Backend non disponible apres 2 minutes.
    echo  Verifiez les logs :  %DC% logs backend
    pause & exit /b 1
)
timeout /t 2 /nobreak >nul
%DC% exec -T backend python manage.py check --database default >nul 2>&1
if %errorlevel% neq 0 goto :wait_loop
echo  [OK] Backend pret.
echo.

REM ── Create groups and admin user ─────────────────────────────────────────────
echo  [3/4] Creation des groupes et du compte admin...
%DC% exec -T backend python init_groups.py
echo.

REM ── Optional demo data ───────────────────────────────────────────────────────
echo  [4/4] Donnees de demonstration ?
set /p "SEED=  Charger les donnees demo pour le stockage ? [o/N] : "
if /i "!SEED!"=="o" (
    echo  Chargement des donnees de stockage (seed2.py)...
    %DC% exec -T backend python seed2.py
    echo  [OK] Donnees chargees.
) else (
    echo  [INFO] Aucune donnee chargee.
)

goto :show_urls


REM ═══════════════════════════════════════════════════════════════════════════════
:native_mode
echo.
echo  ─────────────────────────────────────────────────
echo   MODE NATIF  (Python + Node.js + SQLite)
echo  ─────────────────────────────────────────────────
echo.

REM ── Check Python ─────────────────────────────────────────────────────────────
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERREUR] Python introuvable.
    echo  Installez Python 3.10+ depuis https://python.org
    echo  (cochez "Add Python to PATH" a l'installation)
    pause & exit /b 1
)
for /f "tokens=* usebackq" %%V in (`python --version 2^>^&1`) do set PY_VER=%%V
echo  [OK] %PY_VER%

REM ── Check Node.js ────────────────────────────────────────────────────────────
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERREUR] Node.js introuvable.
    echo  Installez Node.js 18+ depuis https://nodejs.org
    pause & exit /b 1
)
for /f "tokens=* usebackq" %%V in (`node --version 2^>^&1`) do set NODE_VER=%%V
echo  [OK] Node.js %NODE_VER%
echo.

REM ── Step 1: Python virtual environment ───────────────────────────────────────
echo  [1/6] Environnement virtuel Python...
if not exist "backend\.venv" (
    echo        Creation de .venv...
    python -m venv "backend\.venv"
    if %errorlevel% neq 0 (
        echo  [ERREUR] Creation du venv echouee.
        pause & exit /b 1
    )
    echo        [OK] .venv cree.
) else (
    echo        [OK] .venv existant.
)

REM ── Step 2: Install Python packages ──────────────────────────────────────────
echo  [2/6] Installation des packages Python...
call "backend\.venv\Scripts\activate.bat"
pip install -q -r "backend\requirements-dev.txt"
if %errorlevel% neq 0 (
    echo  [ERREUR] pip install echoue. Verifiez requirements-dev.txt.
    pause & exit /b 1
)
echo  [OK] Packages Python installes.

REM ── Step 3: .env with SQLite ─────────────────────────────────────────────────
echo  [3/6] Configuration (.env)...
if not exist "backend\.env" (
    (
        echo USE_SQLITE=True
        echo SECRET_KEY=dev-insecure-key-change-in-production
        echo DEBUG=True
        echo ALLOWED_HOSTS=*
        echo CORS_ALLOW_ALL_ORIGINS=True
    ) > "backend\.env"
    echo  [OK] .env cree ^(SQLite, mode dev^).
) else (
    echo  [OK] .env existant.
)

REM ── Step 4: Migrate database ─────────────────────────────────────────────────
echo  [4/6] Migrations base de donnees (SQLite)...
cd backend
python manage.py migrate
if %errorlevel% neq 0 (
    echo  [ERREUR] Migration echouee.
    cd ..
    pause & exit /b 1
)
echo  [OK] Base de donnees prete.

REM ── Step 5: Init groups + admin ──────────────────────────────────────────────
echo  [5/6] Creation des groupes et du compte admin...
python init_groups.py

REM ── Optional seed ────────────────────────────────────────────────────────────
echo.
set /p "SEED=  Charger les donnees demo (seed2.py) ? [o/N] : "
if /i "!SEED!"=="o" (
    echo  Chargement...
    python seed2.py
    echo  [OK] Donnees chargees.
)
echo.
cd ..

REM ── Step 6: npm install if needed ────────────────────────────────────────────
echo  [6/6] Frontend...
if not exist "frontend\node_modules" (
    echo        Installation des modules npm (premiere fois, ~1 minute)...
    cd frontend && npm install --silent && cd ..
    echo  [OK] Modules npm installes.
) else (
    echo  [OK] Modules npm existants.
)

REM ── Start backend in new window ──────────────────────────────────────────────
echo.
echo  Demarrage du backend Django (port 8000)...
start "HACINT - Backend :8000" cmd /k ^
    "cd /d %~dp0backend && call .venv\Scripts\activate.bat && echo. && echo  Backend : http://%LOCAL_IP%:8000 && echo. && python manage.py runserver 0.0.0.0:8000"

echo  Attente du backend (3 sec)...
timeout /t 3 /nobreak >nul

REM ── Start frontend in new window ─────────────────────────────────────────────
echo  Demarrage du frontend Vite (port 5173)...
start "HACINT - Frontend :5173" cmd /k ^
    "cd /d %~dp0frontend && echo. && echo  Frontend : http://%LOCAL_IP%:5173 && echo. && npm run dev -- --host"


REM ═══════════════════════════════════════════════════════════════════════════════
:show_urls
echo.
echo  ================================================
echo    HACINT est demarre !
echo  ================================================
echo.
echo    Application web  : http://%LOCAL_IP%:5173
echo    API backend      : http://%LOCAL_IP%:8000/api
echo    Admin Django     : http://%LOCAL_IP%:8000/admin
echo.
echo    Comptes par defaut :
echo      admin    /  admin123
echo      stockage /  stockage123
echo.
echo  ================================================
echo.
echo  Appuyez sur une touche pour fermer ce launcher.
echo  (les services continuent de fonctionner)
echo.
pause >nul
endlocal
