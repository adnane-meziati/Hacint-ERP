# MEGAINDUS — Suivi des Échantillons Connecteurs

Application web de gestion des échantillons de connecteurs pour l'industrie automobile.

## Stack technique

- **Backend** : Django 5 + Django REST Framework + PostgreSQL
- **Frontend** : React (Vite) + TailwindCSS
- **Traitement fichiers** : Pillow (images), pandas (CSV)

---

## Démarrage rapide avec Docker

### Prérequis

- [Docker Desktop]a installé et démarré

### Lancement

```bash
# Cloner le projet et se placer dedans
cd sample-tracker

# Démarrer tous les services
docker compose up --build

# Dans un autre terminal, créer le super-utilisateur et les données de test
docker compose exec backend python seed.py
```

L'application est ensuite accessible à :

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:5173      |
| Backend  | http://localhost:8000      |
| Admin    | http://localhost:8000/admin |

**Identifiants par défaut (seed)** : `admin` / `admin123`

---

## Démarrage sans Docker (développement local)

### Backend

```bash
cd backend

# Créer l'environnement virtuel
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Linux/macOS

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
copy .env.example .env
# Éditer .env avec vos paramètres PostgreSQL

# Migrations et démarrage
python manage.py migrate
python seed.py
python manage.py runserver
```

### Frontend

```bash
cd frontend

npm install
npm run dev
```

---

## Structure du projet

```
sample-tracker/
├── backend/
│   ├── core/          # Configuration Django
│   ├── samples/       # Application principale (modèles, API, migrations)
│   ├── manage.py
│   ├── seed.py        # Script de données de test
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── api/       # Client HTTP (axios)
│       ├── components/ # Composants React
│       └── App.jsx    # Point d'entrée
└── docker-compose.yml
```

---

## API REST

| Méthode | URL                       | Description                          |
|---------|---------------------------|--------------------------------------|
| GET     | `/api/samples/`           | Liste paginée (+ recherche, filtres) |
| POST    | `/api/samples/`           | Créer un échantillon (multipart)     |
| GET     | `/api/samples/{id}/`      | Détail                               |
| PUT     | `/api/samples/{id}/`      | Modifier                             |
| DELETE  | `/api/samples/{id}/`      | Supprimer (soft delete)              |
| GET     | `/api/samples/export/`    | Exporter CSV                         |
| POST    | `/api/samples/import/`    | Importer CSV                         |
| GET     | `/api/samples/search/?q=` | Recherche rapide                     |
| GET     | `/api/samples/{id}/audit/`| Journal des modifications            |
| POST    | `/api/projects/import-excel/` | Import Excel client (Board Specification) — crée projet + échantillons + matrice |

### Import Excel client (Étude Technique)

Bouton **Importer Excel** sur la page Étude Technique : charge un classeur client
(`.xlsm`/`.xlsx`), feuille **« Board Specification »** (en-têtes ligne 11, données
à partir de la ligne 13, colonnes I à O : Status, Item, Equipment, Kit name,
Component APN, Customer ID, Holder APN-ID). Après un aperçu et confirmation,
l'application crée en une étape : le projet (statut En attente), un échantillon
par ligne (APN = Holder APN-ID, n° de série unique auto, description = détails
de la variante) et une entrée de matrice de référence par ligne. Les doublons
d'APN ne sont **pas** fusionnés : chaque ligne est une variante distincte,
recherchable par APN, n° de série ou contenu de la description.

### Comptabilité (section Comptabilité — conformité Maroc)

| Méthode | URL                                        | Description                                        |
|---------|--------------------------------------------|----------------------------------------------------|
| GET/PATCH | `/api/accounting/societe/`               | Profil société (ICE, IF, RC, TP, CNSS, RIB…)       |
| CRUD    | `/api/accounting/tiers/`                   | Clients & fournisseurs (ICE 15 chiffres validé)    |
| CRUD    | `/api/accounting/taxcodes/`                | Codes TVA (20 %, 10 %, exonéré, hors champ)        |
| CRUD    | `/api/accounting/documents/`               | Devis / factures / avoirs / factures d'achat       |
| POST    | `/api/accounting/documents/{id}/valider/`  | Validation → numéro séquentiel définitif (art. 145)|
| POST    | `/api/accounting/documents/{id}/convertir-en-facture/` | Devis → facture                       |
| POST    | `/api/accounting/documents/{id}/creer-avoir/` | Facture → avoir                                 |
| GET     | `/api/accounting/documents/{id}/pdf/`      | PDF avec mentions légales art. 145 CGI             |
| GET     | `/api/accounting/documents/stats/`         | Indicateurs (CA, encours, retards)                 |
| CRUD    | `/api/accounting/paiements/`               | Paiements (timbre 0,25 % auto sur espèces)         |
| GET     | `/api/accounting/tva/rapport/`             | Rapport TVA (régimes encaissement / débits)        |
| GET     | `/api/accounting/tva/releve-deductions/`   | Relevé des déductions — XML Simpl-TVA (DGI)        |
| GET     | `/api/accounting/tva/export/`              | Export Excel du rapport TVA                        |
| CRUD    | `/api/accounting/comptes/`                 | Plan comptable PCGE (CGNC, classes 1-8)            |
| CRUD    | `/api/accounting/journaux/`                | Journaux (VT, AC, BQ, CS, OD)                      |
| CRUD    | `/api/accounting/ecritures/`               | Écritures comptables (OD manuelles équilibrées)    |
| POST    | `/api/accounting/comptabiliser-tout/`      | Comptabilise les documents/paiements sans écriture |
| GET     | `/api/accounting/grand-livre/?compte=`     | Grand livre d'un compte (+ `format=xlsx`)          |
| GET     | `/api/accounting/balance/`                 | Balance générale (+ `format=xlsx`)                 |
| GET     | `/api/accounting/journal-export/`          | Livre-journal — export Excel                       |
| GET     | `/api/accounting/bilan/?date_to=`          | Bilan simplifié (actif / passif)                   |
| GET     | `/api/accounting/cpc/?annee=`              | CPC — produits, charges, résultat                  |
| GET/POST| `/api/accounting/exercices/` (+ `cloturer/`, `rouvrir/`) | Exercices — verrouillage annuel      |

**Comptabilité générale (CGNC)** : chaque facture/avoir validé et chaque paiement
génère automatiquement son écriture (ventes : 3421 → 7121 + 4455 ; achats :
6121 + 34552 → 4411 ; trésorerie : 5141/5161, timbre espèces 6167). Les écritures
générées sont immuables ; les OD manuelles doivent être équilibrées. La clôture
d'un exercice bloque toute opération datée de l'année clôturée.

Le rôle utilisateur `accounting` (groupe « Accounting ») donne accès à la section
Comptabilité uniquement. Les documents validés sont immuables (correction par avoir),
la numérotation est continue par type et par année (`FAC-2026-00001`), et la TVA
déductible est calculée au paiement (art. 101-3° CGI).

### Paramètres de filtrage (GET /api/samples/)

| Paramètre   | Type   | Exemple                  |
|-------------|--------|--------------------------|
| `search`    | string | `?search=APN-001`        |
| `client`    | string | `?client=Aptiv`          |
| `status`    | string | `?status=pending`        |
| `date_from` | date   | `?date_from=2024-01-01`  |
| `date_to`   | date   | `?date_to=2024-12-31`    |
| `page`      | int    | `?page=2`                |

---

## Format CSV (import/export)

```
apn,project,placement,received_date,client,status,description,image_filename
APN-001,Aptiv EMEA - Projet X,A1,2024-06-15,Aptiv,pending,Connecteur 12 voies,photo.jpg
```

**Clients valides** : `Aptiv`, `Yazaki`, `Lear`, `Renault`, `Stellantis`, `Sumitomo`, `Other`  
**Statuts valides** : `pending`, `approved`, `rejected`, `archived`  
**Format placement** : lettre majuscule + 1-2 chiffres (ex: `A1`, `B6`, `C12`)

---

## Variables d'environnement (backend/.env)

| Variable               | Description                    | Défaut              |
|------------------------|--------------------------------|---------------------|
| `SECRET_KEY`           | Clé secrète Django             | *(obligatoire en prod)* |
| `DEBUG`                | Mode debug                     | `True`              |
| `DB_NAME`              | Nom de la base de données      | `sampletracker`     |
| `DB_USER`              | Utilisateur PostgreSQL         | `postgres`          |
| `DB_PASSWORD`          | Mot de passe PostgreSQL        | `postgres`          |
| `DB_HOST`              | Hôte PostgreSQL                | `localhost`         |
| `DB_PORT`              | Port PostgreSQL                | `5432`              |
| `CORS_ALLOWED_ORIGINS` | Origines autorisées (frontend) | `http://localhost:5173` |
