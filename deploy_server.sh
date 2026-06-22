#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# MEGAINDUS — Déploiement serveur LAN  |  192.168.16.110
# Usage :  bash deploy_server.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

SERVER_IP="192.168.16.110"

echo ""
echo " ============================================================"
echo "   MEGAINDUS - Suivi Echantillons  |  Serveur LAN"
echo "   http://$SERVER_IP:8000"
echo " ============================================================"
echo ""

# ── 0. Vérifier la racine du projet ──────────────────────────────────────────
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "[ERREUR] Lancez ce script depuis la racine du projet sample-tracker/"
    exit 1
fi

# ── 1. Build du frontend React ────────────────────────────────────────────────
echo "[1/5] Compilation du frontend React..."
cd frontend
npm install --silent
npm run build
cd ..
echo "      OK — frontend compilé dans backend/frontend_dist/"

# ── 2. Environnement Python ───────────────────────────────────────────────────
echo ""
echo "[2/5] Préparation de l'environnement Python..."
cd backend
if [ ! -d ".venv" ]; then
    echo "      Création du venv..."
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt -q
echo "      OK — dépendances Python installées"

# ── 3. Fichier .env ───────────────────────────────────────────────────────────
echo ""
echo "[3/5] Configuration..."
if [ ! -f ".env" ]; then
    if [ -f ".env.server" ]; then
        cp .env.server .env
        echo "      OK — .env créé depuis .env.server"
    elif [ -f ".env.example" ]; then
        cp .env.example .env
        echo "      OK — .env créé depuis .env.example"
    fi
fi

# ── 4. Migrations + seed ──────────────────────────────────────────────────────
echo ""
echo "[4/5] Migrations de la base de données..."
python manage.py migrate
python seed.py 2>/dev/null || true
echo "      OK — base de données prête"

# ── 5. Démarrage ──────────────────────────────────────────────────────────────
echo ""
echo "[5/5] Démarrage de Django sur 0.0.0.0:8000..."
echo ""
echo " ============================================================"
echo ""
echo "   Application disponible sur le réseau :"
echo ""
echo "     http://$SERVER_IP:8000           ← depuis tout appareil"
echo "     http://$SERVER_IP:8000/admin     ← administration"
echo ""
echo "   Identifiants par défaut : admin / admin123"
echo ""
echo "   Ctrl+C pour arrêter."
echo " ============================================================"
echo ""

python manage.py runserver 0.0.0.0:8000
