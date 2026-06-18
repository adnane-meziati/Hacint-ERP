# Rapport — Intégration des modules RH & Logistique

**Date :** 2026-06-12
**Projet :** sample-tracker (projet principal)
**Source :** modules portés depuis sample-trackerHR

> Voir aussi [`full-project-report.md`](./full-project-report.md) pour une vue
> d'ensemble détaillée de **tous** les modules du projet (modèles de données,
> rôles, relations inter-modules). Ce dernier document **corrige** le §2
> ci-dessous : le module Logistique possède en réalité de vraies
> ForeignKey/ManyToMany en base vers `hr.Employee` et `storage.Article`/`Entrepot`
> — voir `full-project-report.md` §7.

---

## 1. Ce qui a été fait

Les modules **Ressources humaines (RH)** et **Logistique** ont été portés depuis
`sample-trackerHR` vers `sample-tracker`, en suivant exactement le même schéma
que les modules existants (Production, Stockage, Comptabilité).

### Backend (Django)
- Apps `hr` et `logistics` copiées dans `backend/` (models, serializers, views,
  urls, migrations).
- Déclarées dans `INSTALLED_APPS` (`core/settings.py`).
- Routées dans `core/urls.py` :
  - `/api/hr/...`
  - `/api/logistics/...`
- `python manage.py check` → **OK**, aucun conflit avec samples / storage /
  accounting.

### Frontend (React)
- Composants copiés dans `frontend/src/components/` :
  - `hr/HrPage.jsx`, `EmployeeModal.jsx`, `LeaveModal.jsx`, `AttendanceModal.jsx`
  - `logistics/LogisticsPage.jsx`
- `api/client.js` : 112 fonctions API ajoutées (employés, congés, pointage,
  contrats, paie, recrutement, candidats / véhicules, chauffeurs, livraisons,
  expéditions, transferts, tâches, rapports, notifications, exports
  Excel/CSV/PDF) + helper `queryUrl`.
- `App.jsx` :
  - `HR_TABS` (7 onglets) et `LOGISTICS_TABS` (9 onglets)
  - `HrTabBar` (violet) et `LogisticsTabBar` (teal), sur le même modèle que
    `AccountingTabBar`
  - Nouvelles entrées dans `SECTION_CHIPS`
  - État `hrTab` / `logisticsTab` persistant (sessionStorage)
  - Intégration dans la mise en page admin (header + contenu principal)
- `Sidebar.jsx` : deux nouvelles sections — **« Ressources humaines »** et
  **« Logistique »** — avec icônes dédiées.
- `npm run build` → **OK** (272 modules transformés).

### Reste à faire
- **Appliquer les migrations** `hr` (5) et `logistics` (8) sur la base
  PostgreSQL de `sample-tracker`.
- Bloqué par un problème **pré-existant** et indépendant de ce changement :
  `backend/.env` contient `DB_PASSWORD=postgres`, mais le service PostgreSQL
  réellement actif sur la machine (`PostgreSQL_For_Odoo`, port 5432) refuse ce
  mot de passe (`authentification par mot de passe échouée`). Ce problème
  bloquerait **n'importe quelle** commande `manage.py` touchant la base, pas
  seulement RH/Logistique.
- → Nécessite une décision : fournir le bon mot de passe PostgreSQL, ou passer
  en SQLite pour le développement local (`USE_SQLITE=True`, comme cela a été
  fait pour `sample-trackerHR`).

---

## 2. Architecture : comment les modules s'articulent

Chaque domaine métier est un **module indépendant**, dupliqué à l'identique
côté backend et frontend. Il n'y a **pas de relation directe en base** (pas de
ForeignKey) entre les apps Django — le couplage se fait uniquement côté
frontend, via des appels API croisés quand c'est utile.

### Côté backend — une « app » Django par module

```
backend/
├── samples/       → /api/...           (échantillons, production)
├── storage/        → /api/storage/...   (stock, entrepôts, mouvements)
├── accounting/     → /api/accounting/... (devis, factures, comptabilité)
├── hr/              → /api/hr/...        (employés, congés, paie, recrutement)
└── logistics/       → /api/logistics/... (véhicules, livraisons, tâches)
```

Chaque app contient : `models.py`, `serializers.py`, `views.py` (ViewSets DRF),
`urls.py`, `migrations/`. Enregistrement en 2 endroits seulement :
`INSTALLED_APPS` (settings.py) + un `path('api/<module>/', include('<module>.urls'))`
dans `core/urls.py`.

### Liens existants entre modules (faibles, côté frontend uniquement)

- `LogisticsPage` appelle `getEmployees()` (module **RH**) pour assigner des
  chauffeurs/tâches à des employés.
- `LogisticsPage` appelle `getEntrepots()` (module **Storage**) pour les
  transferts entre entrepôts.

C'est le seul type de couplage actuel : un module « consomme » en lecture les
données d'un autre via son API REST — jamais de relation DB directe.

### Côté frontend — une « section » dans `App.jsx`

| Élément | Rôle |
|---|---|
| `XXX_TABS` (const) | Liste des onglets du module (`{id, label}`) |
| `XxxTabBar` (composant) | Barre d'onglets, couleur dédiée au module |
| `SECTION_CHIPS.xxx` | Badge affiché dans le header quand la section est active |
| `xxxTab` (state + sessionStorage) | Onglet actif mémorisé entre sessions |
| `<XxxPage tab={xxxTab} currentUser={user} />` | Page principale du module |
| `Sidebar.jsx → SECTIONS` | Entrée (id/label/icône) pour accéder au module |

Convention couleurs déjà utilisées : Production = bleu, Stockage = orange,
Comptabilité = émeraude, RH = violet, Logistique = teal.

Tous les modules sont actuellement **accessibles uniquement au rôle `admin`**
via la sidebar — sauf Storage et Accounting qui ont en plus un rôle dédié
(layout plein écran sans sidebar, pour un utilisateur qui n'a accès qu'à ce
module).

---

## 3. Ajouter un nouveau module — checklist type

À utiliser pour **Installation** et **Ventes** (ou tout autre futur module).

### Backend
1. `python manage.py startapp <module>` dans `backend/`.
2. Définir `models.py` (entités + champs).
3. `serializers.py` + `views.py` (ViewSets DRF, filtres, permissions).
4. `urls.py` (router DRF).
5. Ajouter `<module>` à `INSTALLED_APPS` (settings.py).
6. Ajouter `path('api/<module>/', include('<module>.urls'))` dans `core/urls.py`.
7. `makemigrations <module>` puis `migrate`.

### Frontend
1. `components/<module>/<Module>Page.jsx` (+ modals si besoin).
2. `api/client.js` : fonctions CRUD + exports éventuels.
3. `App.jsx` :
   - `<MODULE>_TABS`
   - `<Module>TabBar` (choisir une couleur non utilisée)
   - Entrée `SECTION_CHIPS`
   - State `<module>Tab` + setter (sessionStorage)
   - Conditionnels header + contenu principal (layout admin)
4. `Sidebar.jsx` : nouvelle entrée `SECTIONS` (id, label, icône SVG).
5. `npm run check` (Django) + `npm run build` (frontend).

---

## 4. Feuille de route — prochains modules

### A. Module « Installation »
Périmètre à préciser avant de démarrer (comme pour RH/Logistique, l'essentiel
du travail est de définir les **modèles de données** et les **statuts/flux**).
Pistes typiques pour ce type d'ERP industriel :
- Interventions / chantiers d'installation chez le client (planning, statut,
  technicien assigné).
- Suivi des équipements installés (référence, site client, date, garantie).
- Liens probables : **RH** (techniciens = employés), **Logistique**
  (expédition du matériel vers le site), **Stockage** (matériel sorti du
  stock).

### B. Module « Ventes »
⚠️ Chevauchement possible avec **Comptabilité**, qui gère déjà devis,
factures, avoirs et tiers (clients/fournisseurs). À clarifier :
- Si « Ventes » = suivi commercial **avant** le devis (prospects, opportunités,
  pipeline, objectifs commerciaux) → module distinct, pas de doublon.
- Si « Ventes » = ce qui existe déjà dans Comptabilité (devis/factures) →
  pas besoin d'un nouveau module, juste exposer ces onglets autrement
  (ex: rôle dédié « Ventes » qui ne voit que devis/factures/tiers).

### Ordre suggéré
1. Lever le blocage PostgreSQL (prérequis pour tester RH/Logistique).
2. Phase de test RH/Logistique (voir §5).
3. Définir le périmètre exact de « Ventes » vs Comptabilité (courte session de
   cadrage).
4. Définir le périmètre de « Installation ».
5. Implémenter selon la checklist du §3, un module à la fois.

---

## 5. Phase de tests — RH & Logistique

1. **Migrations** : `python manage.py makemigrations hr logistics` (ne doit
   rien générer, déjà fait) puis `migrate`.
2. **Lancement** : `python manage.py runserver` + `npm run dev`.
3. **Connexion admin** : vérifier l'apparition des sections « Ressources
   humaines » et « Logistique » dans la sidebar.
4. **RH** — pour chaque onglet (Tableau de bord, Employés, Congés, Pointage,
   Contrats, Paie, Recrutement) : créer / lire / modifier / supprimer un
   enregistrement.
5. **Logistique** — pour chaque onglet (Tableau de bord, Livraisons,
   Expéditions, Véhicules, Chauffeurs, Transferts, Tâches, Rapports,
   Notifications) : CRUD + tester les exports Excel/CSV/PDF.
6. **Non-régression** : vérifier que Production, Stockage et Comptabilité
   fonctionnent toujours normalement (mêmes URLs, mêmes permissions).
7. **Build de prod** : `npm run build` puis servir via Django
   (`frontend_dist/`) pour un dernier contrôle en conditions réelles.

### Pour chaque futur module (Installation, Ventes…)
Même cycle : `check` → `makemigrations`/`migrate` → smoke test en dev →
`build` → test en conditions de prod.

---

## 6. Point bloquant à traiter en priorité

**Mot de passe PostgreSQL** (`backend/.env` → `DB_PASSWORD`) ne correspond pas
à l'instance Postgres active sur la machine. Sans correction, **aucune**
migration (RH/Logistique ou autre) ne peut être appliquée sur la base
`sampletracker`. Décision nécessaire avant de poursuivre vers la phase de
tests du §5.
