#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# MEGAINDUS — Sample Tracker  |  LAN startup script
# Usage: bash start.sh
# ─────────────────────────────────────────────────────────────────
set -e

# ── Detect LAN IP ────────────────────────────────────────────────
if command -v ip &>/dev/null; then
    LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}')
elif command -v hostname &>/dev/null; then
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi
LOCAL_IP=${LOCAL_IP:-localhost}

echo ""
echo " =========================================="
echo "   MEGAINDUS - Suivi Echantillons"
echo " =========================================="
echo ""
echo "   Adresse réseau : $LOCAL_IP"
echo ""
echo "   Backend  ──► http://$LOCAL_IP:8000"
echo "   Frontend ──► http://$LOCAL_IP:5173"
echo "   Admin    ──► http://$LOCAL_IP:8000/admin"
echo ""
echo " =========================================="
echo ""

# ── Copy .env if missing ─────────────────────────────────────────
if [ ! -f backend/.env ] && [ -f backend/.env.example ]; then
    cp backend/.env.example backend/.env
    echo "[INFO] backend/.env créé depuis .env.example"
fi

# ── Start backend ─────────────────────────────────────────────────
echo "[1/2] Démarrage du backend Django..."
(
    cd backend
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    fi
    python manage.py runserver 0.0.0.0:8000
) &
BACKEND_PID=$!
echo "       PID: $BACKEND_PID"

sleep 2

# ── Start frontend ────────────────────────────────────────────────
echo "[2/2] Démarrage du frontend Vite..."
(
    cd frontend
    npm run dev
) &
FRONTEND_PID=$!
echo "       PID: $FRONTEND_PID"

echo ""
echo " =========================================="
echo "  Partagez cette URL avec vos appareils :"
echo "  http://$LOCAL_IP:5173"
echo ""
echo "  Ctrl+C pour arrêter les deux services."
echo " =========================================="
echo ""

# ── Graceful shutdown on Ctrl+C ───────────────────────────────────
cleanup() {
    echo ""
    echo "Arrêt des services..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    echo "Services arrêtés."
    exit 0
}
trap cleanup INT TERM

wait
