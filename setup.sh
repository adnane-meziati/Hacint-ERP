#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  HACINT — Gestion Industrielle v2
#  Setup and launch script for Linux / macOS
#  Usage: bash setup.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e " ${GREEN}[OK]${NC}    $*"; }
info() { echo -e " ${CYAN}[INFO]${NC}  $*"; }
warn() { echo -e " ${YELLOW}[WARN]${NC}  $*"; }
err()  { echo -e " ${RED}[ERREUR]${NC} $*"; }

echo ""
echo " ================================================"
echo "   HACINT  -  Gestion Industrielle v2"
echo "   Setup and Launch"
echo " ================================================"
echo ""

# ── Must run from project root ────────────────────────────────────────────────
if [[ ! -d "backend" || ! -d "frontend" || ! -f "docker-compose.yml" ]]; then
    err "Lancez ce script depuis la RACINE du projet (dossier contenant backend/, frontend/, docker-compose.yml)."
    exit 1
fi

# ── Detect LAN IP ─────────────────────────────────────────────────────────────
LOCAL_IP="localhost"
if command -v ip &>/dev/null; then
    LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1 || true)
elif command -v hostname &>/dev/null; then
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
fi
[[ -z "$LOCAL_IP" ]] && LOCAL_IP="localhost"

# ── Choose mode ───────────────────────────────────────────────────────────────
echo " Choisissez le mode de demarrage :"
echo ""
echo "   [1] Docker   (recommande)  - necessite Docker"
echo "   [2] Natif                  - Python + Node.js locaux, SQLite"
echo ""
read -rp "  Votre choix [1 ou 2, Entree = 1] : " MODE
MODE="${MODE:-1}"

case "$MODE" in
    1) ;;
    2) ;;
    *) warn "Choix invalide, mode Docker utilise."; MODE=1 ;;
esac


# ═══════════════════════════════════════════════════════════════════════════════
docker_mode() {
    echo ""
    echo " ─────────────────────────────────────────────────"
    echo "  MODE DOCKER"
    echo " ─────────────────────────────────────────────────"
    echo ""

    # ── Check Docker ─────────────────────────────────────────────────────────
    if ! docker info &>/dev/null; then
        err "Docker n'est pas demarre."
        echo ""
        echo "  Demarrez Docker Desktop (ou le daemon Docker) et reessayez."
        echo "  Telechargez sur : https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    ok "Docker detecte."

    # ── Detect compose command ───────────────────────────────────────────────
    if docker compose version &>/dev/null 2>&1; then
        DC="docker compose"
    elif command -v docker-compose &>/dev/null; then
        DC="docker-compose"
    else
        err "Ni 'docker compose' ni 'docker-compose' n'est disponible."
        exit 1
    fi
    ok "Commande compose : $DC"
    echo ""

    # ── Build and start all containers ──────────────────────────────────────
    info "[1/4] Construction et demarrage des conteneurs..."
    info "      (base de donnees + backend + frontend)"
    info "      Cela peut prendre quelques minutes la premiere fois."
    echo ""
    $DC up --build -d
    echo ""
    ok "Conteneurs lances."
    echo ""

    # ── Wait for backend (migrations are automatic in docker-compose command) ─
    info "[2/4] Attente du backend + migrations automatiques..."
    TRIES=0
    until $DC exec -T backend python manage.py check --database default &>/dev/null; do
        TRIES=$((TRIES+1))
        if [[ $TRIES -gt 60 ]]; then
            err "Backend non disponible apres 2 minutes."
            echo "  Consultez les logs :  $DC logs backend"
            exit 1
        fi
        sleep 2
        printf "."
    done
    echo ""
    ok "Backend pret."
    echo ""

    # ── Init groups + admin ──────────────────────────────────────────────────
    info "[3/4] Creation des groupes et du compte admin..."
    $DC exec -T backend python init_groups.py
    echo ""

    # ── Optional seed ────────────────────────────────────────────────────────
    read -rp " [4/4] Charger les donnees demo pour le stockage ? [o/N] : " SEED
    if [[ "${SEED,,}" == "o" ]]; then
        info "Chargement des donnees (seed2.py)..."
        $DC exec -T backend python seed2.py
        ok "Donnees chargees."
    else
        info "Aucune donnee chargee."
    fi
}


# ═══════════════════════════════════════════════════════════════════════════════
native_mode() {
    echo ""
    echo " ─────────────────────────────────────────────────"
    echo "  MODE NATIF  (Python + Node.js + SQLite)"
    echo " ─────────────────────────────────────────────────"
    echo ""

    # ── Check Python ─────────────────────────────────────────────────────────
    if ! command -v python3 &>/dev/null && ! command -v python &>/dev/null; then
        err "Python introuvable. Installez Python 3.10+."
        echo "  https://python.org"
        exit 1
    fi
    PYTHON=$(command -v python3 || command -v python)
    ok "Python : $($PYTHON --version)"

    # ── Check Node.js ─────────────────────────────────────────────────────────
    if ! command -v node &>/dev/null; then
        err "Node.js introuvable. Installez Node.js 18+."
        echo "  https://nodejs.org"
        exit 1
    fi
    ok "Node.js : $(node --version)"
    echo ""

    # ── Virtual environment ──────────────────────────────────────────────────
    info "[1/6] Environnement virtuel Python..."
    if [[ ! -d "backend/.venv" ]]; then
        $PYTHON -m venv backend/.venv
        ok ".venv cree."
    else
        ok ".venv existant."
    fi
    source backend/.venv/bin/activate

    # ── Install packages ─────────────────────────────────────────────────────
    info "[2/6] Installation des packages Python..."
    pip install -q -r backend/requirements-dev.txt
    ok "Packages Python installes."

    # ── .env ─────────────────────────────────────────────────────────────────
    info "[3/6] Configuration (.env)..."
    if [[ ! -f "backend/.env" ]]; then
        cat > backend/.env <<'EOF'
USE_SQLITE=True
SECRET_KEY=dev-insecure-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=*
CORS_ALLOW_ALL_ORIGINS=True
EOF
        ok ".env cree (SQLite, mode dev)."
    else
        ok ".env existant."
    fi

    # ── Migrations ───────────────────────────────────────────────────────────
    info "[4/6] Migrations base de donnees (SQLite)..."
    (cd backend && python manage.py migrate)
    ok "Base de donnees prete."

    # ── Init groups + admin ──────────────────────────────────────────────────
    info "[5/6] Creation des groupes et du compte admin..."
    (cd backend && python init_groups.py)

    # ── Optional seed ────────────────────────────────────────────────────────
    echo ""
    read -rp "  Charger les donnees demo (seed2.py) ? [o/N] : " SEED
    if [[ "${SEED,,}" == "o" ]]; then
        (cd backend && python seed2.py)
        ok "Donnees chargees."
    fi
    echo ""

    # ── npm install ──────────────────────────────────────────────────────────
    info "[6/6] Frontend..."
    if [[ ! -d "frontend/node_modules" ]]; then
        info "Installation des modules npm (premiere fois, ~1 minute)..."
        (cd frontend && npm install --silent)
        ok "Modules npm installes."
    else
        ok "Modules npm existants."
    fi

    # ── Launch backend ───────────────────────────────────────────────────────
    echo ""
    info "Demarrage du backend Django (port 8000)..."
    (
        cd backend
        source .venv/bin/activate
        python manage.py runserver 0.0.0.0:8000
    ) &
    BACKEND_PID=$!
    sleep 2

    # ── Launch frontend ──────────────────────────────────────────────────────
    info "Demarrage du frontend Vite (port 5173)..."
    (
        cd frontend
        npm run dev -- --host
    ) &
    FRONTEND_PID=$!

    # ── Trap Ctrl+C ──────────────────────────────────────────────────────────
    cleanup() {
        echo ""
        info "Arret des services..."
        kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
        ok "Services arretes."
        exit 0
    }
    trap cleanup INT TERM
}


# ═══════════════════════════════════════════════════════════════════════════════
# Run chosen mode
if [[ "$MODE" == "1" ]]; then
    docker_mode
else
    native_mode
fi

# ── Show URLs ─────────────────────────────────────────────────────────────────
echo ""
echo " ================================================"
echo -e "   ${GREEN}HACINT est demarre !${NC}"
echo " ================================================"
echo ""
echo "   Application web  : http://$LOCAL_IP:5173"
echo "   API backend      : http://$LOCAL_IP:8000/api"
echo "   Admin Django     : http://$LOCAL_IP:8000/admin"
echo ""
echo "   Comptes par defaut :"
echo "     admin    /  admin123"
echo "     stockage /  stockage123"
echo ""
echo " ================================================"
echo ""

if [[ "$MODE" == "2" ]]; then
    echo " Ctrl+C pour arreter les deux services."
    wait
fi
