# Rapport complet du projet — sample-tracker

**Date :** 2026-06-12
**Projet :** sample-tracker
**Portée :** vue d'ensemble détaillée de **tous les modules** (Production, Stockage,
Comptabilité, RH, Logistique) — modèles de données, workflows, rôles utilisateurs et
relations entre modules.

> Ce document complète [`hr-logistics-integration-report.md`](./hr-logistics-integration-report.md),
> qui détaille spécifiquement le portage RH/Logistique, la checklist d'ajout de
> module et la feuille de route (Installation, Ventes, phase de tests). Ce
> rapport-ci documente **l'ensemble du projet existant**.

---

## 1. Vue d'ensemble

### 1.1 Stack technique

| Couche | Techno |
|---|---|
| Backend | Django 5 + Django REST Framework |
| Base de données | PostgreSQL (dev/prod) — `db.sqlite3` présent en local mais non activé |
| Frontend | React + Vite + TailwindCSS |
| Auth | Token DRF, rôle dérivé du groupe Django (`core/urls.py`) |

### 1.2 Les 5 modules

| Module | App Django | Préfixe API | Section frontend | Couleur | Rôle(s) dédié(s) |
|---|---|---|---|---|---|
| Production / Échantillons | `samples` | `/api/...` (racine, app historique) | `production` | bleu | designer, programmer, cnc, assembly, quality, etude_technique |
| Stockage | `storage` | `/api/storage/...` | `storage` | orange | storage |
| Comptabilité | `accounting` | `/api/accounting/...` | `accounting` | émeraude | accounting |
| Ressources humaines | `hr` | `/api/hr/...` | `hr` | violet | — (admin uniquement) |
| Logistique | `logistics` | `/api/logistics/...` | `logistics` | teal | — (admin uniquement) |

Chaque module suit le même schéma : une app Django (`models.py` / `serializers.py` /
`views.py` / `urls.py` / `migrations/`) + une "section" frontend (`XXX_TABS`,
`XxxTabBar`, `SECTION_CHIPS.xxx`, état `xxxTab` en sessionStorage, `<XxxPage>`,
entrée dans `Sidebar`).

`admin` voit toutes les sections via la sidebar. `storage` et `accounting` ont en
plus un layout dédié plein écran (sans sidebar) pour les comptes qui n'ont accès
qu'à leur module.

---

## 2. Module Production / Échantillons (`samples`)

### 2.1 Rôle métier
Suivi de fabrication d'échantillons de connecteurs automobiles à travers le
pipeline **Étude technique → Design → Programmation CNC → Usinage CNC → Assemblage
→ Contrôle qualité**.

### 2.2 Modèle central — `Sample`

| Champ | Détail |
|---|---|
| `apn`, `project`, `placement` | identification (placement validé au format A1–Z99) |
| `client` | Aptiv / Yazaki / Lear / Renault / Stellantis / Sumitomo / Other |
| `connector_fill` | full / empty / partial |
| `quantity`, `received_date`, `description`, `commentaire` | données de réception |
| `status` | pending / approved / rejected / archived |
| `serial_number` | auto-assigné 1–1000 (repli 9999) |
| `study_approved`, `is_deleted` | flags |
| `image`, `thumbnail` | générées automatiquement |
| `design_file`, `design_pdf` | livrables du designer |
| `gcode_file` | livrable du programmeur |
| `created_by` / `updated_by` / `created_at` / `updated_at` | audit |

Pour **chaque rôle** (designer, programmer, cnc, assembly, quality), `Sample`
porte un sous-ensemble de champs répétés :
- `<rôle>_status` : ongoing / standby / done
- chrono : `<rôle>_time_started`, `<rôle>_time_spent_minutes`
- `<rôle>_pause_reason` : manque_detail / rework / technical / lunch / clock_out
- `<rôle>_locked_by`, `<rôle>_done`, `<rôle>_done_date`, `<rôle>_done_by`

Champs spécifiques :
- Reprises : `is_rework`, `is_cnc_rework`, `is_assembly_rework`, `is_quality_rework`
- Quantités produites : `cnc_produced_count`, `assembly_produced_count`
- Multi-opérateurs (listes JSON) : `cnc_active_workers`, `assembly_active_workers`,
  `quality_active_workers`

### 2.3 Autres modèles

| Modèle | Rôle |
|---|---|
| `ProgrammerFile` | historique des versions de G-code par échantillon (FK `Sample`) |
| `JimideDxfFile` | bibliothèque DXF partagée (description, uploaded_by/at) |
| `MatrixEntry` | matrice de référence par projet (reference↔apn, designation, quantity, sample_type, notes) |
| `ProjectValidation` | validation "étude technique" par projet (`validation_status` pending/approved/rejected, double validation `validated_*`/`approved_*`, `result` JSON) |
| `AuditLog` | journal d'audit immuable (FK `Sample` nullable, `user`, `action` create/update/delete/import/export, `changes` JSON, `timestamp`) |

### 2.4 API (`urls.py`)
- ViewSets : `SampleViewSet`, `JimideDxfViewSet`, `MatrixEntryViewSet`
- Endpoints dédiés : `validation_list`, `validation_run`, `validation_approve`,
  `project_create`, `project_import_excel`, `project_samples`,
  `project_sample_delete`, `project_update_status`, `project_approve_apn`

### 2.5 Frontend
Pages par rôle : `DesignerPage`, `ProgrammerPage`, `CncPage`, `AssemblyPage`,
`QualityPage`, `TechnicalStudyPage` ; `AdminUsersPage` (gestion utilisateurs/rôles) ;
`Jimide4030Page` (bibliothèque DXF).
Composants partagés : `SampleTable`, `SampleModal`, `DetailModal`, `ImportModal`,
`StatusBadge`, `Topbar`.

### 2.6 Relations avec les autres modules
Aucune — `samples` ne référence aucune autre app en base de données.

---

## 3. Module Stockage (`storage`)

### 3.1 Rôle métier
Gestion de stock multi-entrepôt : catalogue d'articles, lots, emplacements
physiques, mouvements (entrées/sorties/transferts/ajustements), tickets
code-barres/QR.

### 3.2 Modèles de données

| Modèle | Champs clés | Statuts / enums |
|---|---|---|
| `Categorie` | hiérarchie de catégories d'articles | — |
| `Article` | prix, `seuil_alerte`, `duree_vie_jours`, `actif`, FK `Categorie` (nullable) | — |
| `Entrepot` | nom, capacité | `statut` : actif / inactif / maintenance |
| `Placement` | zone/allée/niveau, FK `Entrepot`, `capacite_max` | `statut` : disponible / plein / bloqué |
| `Lot` | FK `Article`, `date_peremption` (indexé) | `statut` : actif / périmé / épuisé |
| `Mouvement` | FK `Article`, `Lot` (nullable), `Placement` source/destination (nullable), `User` | `type_mouvement` : entrée / sortie / transfert / ajustement |
| `Stock` | FK `Article`+`Placement`+`Lot` (unique ensemble), `quantite_disponible`, `quantite_reservee` | — |
| `Ticket` | FK `Article`/`Lot`/`Placement` (nullable), FK `Mouvement` (nullable), génération code-barres/QR | `type_source` : article/lot/placement ; `statut` : généré/imprimé/annulé |

### 3.3 Frontend
8 onglets (`STORAGE_TABS`) : **Stock, Articles, Mouvements, Lots, Entrepôts,
Placements, Catégories, Tickets**.
Composants : `StoragePage`, `QrScannerModal`, `TicketPrintModal`.

### 3.4 Relations avec les autres modules
`storage` ne référence aucune autre app, mais est **référencé par** `accounting`
(lignes de devis/factures) et `logistics` (lignes de commande/expédition/transfert
+ transferts inter-entrepôts) — voir §7.

---

## 4. Module Comptabilité (`accounting`)

### 4.1 Rôle métier
Comptabilité générale conforme au plan comptable marocain (CGNC/PCGE) : devis,
factures, avoirs, achats, paiements, TVA, écritures, grand livre, balance,
exercices.

### 4.2 Modèles de données

| Modèle | Rôle | Champs / enums clés |
|---|---|---|
| `CompanyProfile` | identité légale (singleton) | ICE, IF, RC, TP, CNSS, régime/périodicité TVA, RIB, logo |
| `Tiers` | clients & fournisseurs | `code` (unique), `raison_sociale`, `est_client`/`est_fournisseur`/`est_particulier`, IDs marocains, `delai_paiement_jours`, `actif` |
| `TaxCode` | taux de TVA | `code`, `libelle`, `taux`, mention d'exonération, `actif` |
| `Document` | devis/factures/avoirs/achats | `doc_type` : devis/facture/avoir/facture_achat/avoir_achat ; `statut` : brouillon→validee/envoye→partiellement_payee/payee/annulee (+ devis : envoye/accepte/refuse/expire) |
| `DocumentLigne` | lignes de document | FK `Document`, FK `storage.Article` (nullable), désignation, quantité, prix unitaire HT, remise %, `tax_code` FK |
| `DocumentSequence` | numérotation continue | préfixes DEV/FAC/AVR/FA/AVA par type/année, `next_numero()` atomique (art.145 CGI) |
| `Paiement` | encaissements/décaissements | `mode` : virement/chèque/espèce/effet/carte/compensation ; timbre 0,25% auto sur espèces (art.252 CGI) ; FK `Document` |
| `CompteComptable` | plan comptable CGNC | `numero` (classes 1–8), `intitule`, `actif`, propriété `classe` |
| `Journal` | journaux | `code`, `libelle`, `type_journal` : vente/achat/tresorerie/od |
| `JournalSequence` | numérotation par journal/année | format `CODE-ANNEE-00001` |
| `ExerciceComptable` | exercice annuel | `annee` (unique), `statut` : ouvert/cloture ; `verifier_ouvert()` verrouille les écritures sur exercice clos |
| `EcritureComptable` | écriture comptable | FK `Journal` ; source = `Document` (O2O auto) ou `Paiement` (O2O auto) ou OD manuelle ; `total_debit()`/`total_credit()` |
| `LigneEcriture` | ligne d'écriture | FK `CompteComptable`, débit/crédit, `tiers` FK optionnel, `ordre` |

### 4.3 Champs et méthodes clés de `Document`
`numero` (assigné uniquement à la validation), `tiers` FK, `date_emission`,
`date_echeance`, `reference_externe`, `document_origine` (self-FK : chaîne
devis→facture→avoir), RAS (`ras_type` aucune/is_ht/tva, `ras_taux`, `ras_montant`),
totaux (`total_ht`, `total_tva`, `total_ttc`, `net_a_payer`, `montant_paye`),
`compte_contrepartie`.

Méthodes : `valider()` (numérotation + contrôle ICE + verrouillage),
`recompute_totals()`, `refresh_statut_paiement()`, `tva_par_taux()` ; propriétés
`est_en_retard`, `reste_a_payer`.

### 4.4 Logique métier clé
1. Numérotation uniquement à la validation, jamais en brouillon.
2. Contrôle ICE obligatoire sur factures de vente (sauf tiers particuliers) —
   art.145 CGI.
3. RAS calculée automatiquement dans `recompute_totals()`.
4. `tva_par_taux()` agrège HT/TVA par taux pour la déclaration de TVA.
5. Chaque `Paiement` déclenche `refresh_statut_paiement()` sur le `Document`.
6. Exercice clos = verrou anti-antidatage sur validation de document et
   création/suppression de paiement.
7. Timbre 0,25% automatique sur les paiements en espèces.

### 4.5 Frontend
13 onglets (`ACCOUNTING_TABS`) : **Tableau de bord, Devis, Factures, Avoirs,
Achats, Paiements, TVA, Écritures, Grand livre, Balance & États, Plan comptable,
Clients & Fournisseurs, ⚙ Paramètres**.
Composants : `AccountingPage`, `ComptaGeneraleTabs`, `DocumentModal`.

### 4.6 Relations avec les autres modules
`accounting.DocumentLigne.article` → FK nullable vers `storage.Article` (une
ligne de devis/facture peut référencer un article du stock).

---

## 5. Module Ressources humaines (`hr`)

### 5.1 Rôle métier
Gestion RH : employés, organigramme, contrats, congés, pointage, paie,
recrutement.

### 5.2 Modèles de données

| Modèle | Champs clés | Statuts / enums |
|---|---|---|
| `Department` | `name`, `description`, `manager` FK→`Employee` (nullable) | — |
| `Employee` | `employee_number` (matricule), `CIN`, `hire_date`, `shift_start/end`, `position`, FK `Department`, `user` (1:1 → `User`), propriété `full_name` | `status` : ACTIVE/ON_LEAVE/SUSPENDED/TERMINATED ; `gender` : MALE/FEMALE |
| `Contract` | FK `Employee`, `start_date/end_date`, `base_salary`, `document`, `notes` | `type` : CDI/CDD/INTERNSHIP/ANAPEC/TEMPORARY ; `status` : ACTIVE/EXPIRED/TERMINATED |
| `EmployeeDocument` | FK `Employee` (cascade), `file`, `upload_date`, `notes` | `type` : CONTRACT/CIN_COPY/DIPLOMA/CERTIFICATE/OTHER |
| `Resignation` | FK `Employee` (cascade), `request_date`, `last_working_day`, `reason`, `document` | `status` : PENDING/APPROVED/REJECTED/CANCELLED |
| `PayrollRecord` | FK `Employee` (cascade), `month`/`year` (unique ensemble), `base_salary`, `overtime_amount`, `bonuses`, `deductions` → `net_salary` (auto-calculé) | `status` : DRAFT/VALIDATED/PAID/CANCELLED |
| `Attendance` | FK `Employee` (cascade), `date` (unique avec employee), `check_in/out`, `worked_hours`, `overtime_hours` | `status` : PRESENT/ABSENT/LATE/HALF_DAY |
| `LeaveRequest` | FK `Employee` (cascade), `start/end_date`, `number_of_days`, `reason`, `document`, `approved_by` FK `User`, `approval_date`, `approval_comment` | `type` : PAID/SICK/UNPAID/EXCEPTIONAL ; `status` : PENDING/APPROVED/REJECTED/CANCELLED |
| `JobPosition` | FK `Department` (nullable), `job_title`, `description`, `required_qualifications/experience`, `number_of_openings` | `status` : OPEN/CLOSED/ON_HOLD |
| `Candidate` | autonome, coordonnées, `cv`, `cover_letter`, notes d'évaluation, propriété `full_name` | — |
| `Application` | FK `Candidate`+`JobPosition` (unique ensemble), `application_date`, `notes` | `current_stage` : APPLIED/SCREENING/INTERVIEW_SCHEDULED/INTERVIEWED/ACCEPTED/REJECTED/HIRED |
| `Interview` | FK `Application` (cascade), `interviewer` FK `User`, `interview_date`, `comments` | `result` : PASSED/FAILED/PENDING |

### 5.3 Workflows
- **Congés** : pending → approved/rejected/cancelled, avec traçabilité
  (`approved_by`, `approval_date`, `approval_comment`).
- **Paie** : `net_salary = base_salary + overtime_amount + bonuses - deductions`
  (calculé automatiquement au `save()`), cycle draft → validated → paid.
- **Recrutement** : `JobPosition` (ouvert) → `Candidate` → `Application` (pipeline
  de stages) → `Interview`(s) → embauche.

### 5.4 Frontend
7 onglets (`HR_TABS`) : **Tableau de bord, Employés, Congés, Pointage, Contrats,
Paie, Recrutement**.
Composants : `HrPage`, `EmployeeModal`, `LeaveModal`, `AttendanceModal`.

### 5.5 Relations avec les autres modules
`hr` ne référence aucune autre app, mais `hr.Employee` est **référencé par**
`logistics` (chauffeurs, tâches assignées, notifications) — voir §7.

---

## 6. Module Logistique (`logistics`)

### 6.1 Rôle métier
Gestion logistique : flotte (véhicules/chauffeurs), commandes de livraison,
expéditions, transferts inter-entrepôts, tâches d'équipe (avec
commentaires/pièces jointes/historique), notifications, journal de rapports.

### 6.2 Modèles de données

| Modèle | Rôle | Statuts / enums |
|---|---|---|
| `Vehicle` | véhicule de flotte (immatriculation, type, capacité) | `status` : AVAILABLE/IN_USE/MAINTENANCE/INACTIVE |
| `Driver` | profil chauffeur — **`employee` = OneToOne vers `hr.Employee`** | `status` : AVAILABLE/ASSIGNED/ON_LEAVE/INACTIVE |
| `DeliveryOrder` (+`DeliveryOrderLine`) | commande client (adresse, lignes article+quantité, `article` FK → `storage.Article`) | `status` : DRAFT/PENDING/PREPARATION/READY/SHIPPED/DELIVERED/CANCELLED |
| `Shipment` (+`ShipmentLine`) | expédition — FK `DeliveryOrder`, `Vehicle`/`Driver` (nullable), lignes `article` FK → `storage.Article` | `status` : PENDING/PREPARATION/SHIPPED/IN_DELIVERY/DELIVERED/RETURNED/CANCELLED |
| `WarehouseTransfer` (+`WarehouseTransferLine`) | transfert — FK `source_warehouse`/`destination_warehouse` (`storage.Entrepot`), `Vehicle`/`Driver` (nullable), lignes `article` FK → `storage.Article`, workflow `requested_by`/`approved_by`/`approved_at` | `status` : DRAFT/PENDING_APPROVAL/APPROVED/IN_TRANSIT/RECEIVED/CANCELLED/REJECTED ; `transport_type` : OWN_VEHICLE/SERVICE ; `destination_type` : WAREHOUSE/EXTERNAL |
| `LogisticsTask` (+`Comment`/`Attachment`/`History`) | tâche d'équipe — **`assigned_employees` = ManyToMany vers `hr.Employee`**, FK optionnelles vers DeliveryOrder/Shipment/WarehouseTransfer/Vehicle | `priority` : LOW/MEDIUM/HIGH/CRITICAL ; `status` : TODO/IN_PROGRESS/WAITING/DONE/CANCELLED ; `assigned_role` : DRIVER/WAREHOUSE_OPERATOR/LOGISTICS_MANAGER/ORDER_PREPARER/SHIPPING_COORDINATOR/QUALITY_CONTROLLER/OTHER |
| `LogisticsNotification` | notification — FK `recipient` (`User`), **`employee` FK nullable vers `hr.Employee`**, FK `LogisticsTask` (nullable) | `notification_type` : ASSIGNMENT/MODIFICATION/DEADLINE/COMPLETED/CANCELLED/COMMENT/ATTACHMENT |
| `LogisticsReport` | journal d'événements | `report_type` : DELIVERY/SHIPMENT/TRANSFER/VEHICLE/TASK/INCIDENT/OTHER |

Tous les modèles principaux portent `created_by` (FK `User`) + `created_at`/`updated_at`.

### 6.3 Workflows
- **Transferts d'entrepôt** : DRAFT → PENDING_APPROVAL → (APPROVED | REJECTED) →
  IN_TRANSIT → RECEIVED, avec audit `requested_by`/`approved_by`/`approved_at`.
- **Tâches** : historisation complète des changements (`LogisticsTaskHistory` :
  acteur, action, ancienne/nouvelle valeur) + notifications automatiques
  (affectation, modification, échéance, fin, commentaire, pièce jointe).

### 6.4 Frontend
9 onglets (`LOGISTICS_TABS`) : **Tableau de bord, Livraisons, Expéditions,
Véhicules, Chauffeurs, Transferts, Tâches, Rapports, Notifications**.
Composant : `LogisticsPage` (utilise aussi `getEmployees()` et `getEntrepots()`
pour les listes déroulantes).

### 6.5 Relations avec les autres modules
`logistics` est le module **le plus connecté** : 3 relations en base vers
`hr.Employee`, 5 relations en base vers `storage` (`Article` ×3, `Entrepot` ×2)
— détail au §7.

---

## 7. Relations inter-modules — vue d'ensemble

> ⚠️ **Correction par rapport au rapport précédent** : il avait été indiqué qu'il
> n'existait *aucune* relation en base entre les apps Django, le couplage étant
> uniquement côté frontend (appels API croisés). **C'est inexact pour
> `logistics`** : ce module possède de vraies `ForeignKey`/`ManyToMany` Django
> vers `hr.Employee` et `storage.Article`/`Entrepot`, et `accounting` a une FK
> nullable vers `storage.Article`. Le couplage frontend (`getEmployees()`,
> `getEntrepots()`) sert uniquement à peupler les listes déroulantes dans l'UI —
> la relation existe **aussi et surtout** en base de données.

### Relations en base de données (FK / M2M réelles)

| App source | Champ | → App.Modèle cible | Type |
|---|---|---|---|
| `logistics` | `Driver.employee` | `hr.Employee` | OneToOne |
| `logistics` | `LogisticsTask.assigned_employees` | `hr.Employee` | ManyToMany |
| `logistics` | `LogisticsNotification.employee` | `hr.Employee` | ForeignKey (nullable) |
| `logistics` | `DeliveryOrderLine.article`, `ShipmentLine.article`, `WarehouseTransferLine.article` | `storage.Article` | ForeignKey |
| `logistics` | `WarehouseTransfer.source_warehouse` / `destination_warehouse` | `storage.Entrepot` | ForeignKey |
| `accounting` | `DocumentLigne.article` | `storage.Article` | ForeignKey (nullable) |

**Conséquence pratique** : dans le graphe de migrations Django, `logistics`
dépend de `hr` *et* de `storage` ; `accounting` dépend de `storage`. `samples` et
`hr` sont autonomes (aucune dépendance sortante). Toutes ces apps doivent rester
ensemble dans `INSTALLED_APPS` — c'est déjà le cas.

### Relations côté frontend (appels API croisés, en plus des FK)

| Page | Appelle | Pour |
|---|---|---|
| `LogisticsPage` | `getEmployees()` (module RH) | listes déroulantes chauffeurs / assignation de tâches |
| `LogisticsPage` | `getEntrepots()` (module Storage) | sélection entrepôt source/destination des transferts |

### Schéma synthétique

```
┌──────────┐
│ samples  │   (aucune relation en base avec les autres apps)
└──────────┘

┌──────┐  Employee (O2O, M2M, FK)   ┌─────────────┐  Article / Entrepot (FK)  ┌──────────┐
│  hr  │ ─────────────────────────► │  logistics  │ ────────────────────────► │ storage  │
└──────┘                            └─────────────┘                           └──────────┘
                                                                                     ▲
                                                                                     │ Article (FK)
                                                                              ┌─────────────┐
                                                                              │ accounting  │
                                                                              └─────────────┘
```

---

## 8. Rôles utilisateurs & matrice d'accès

Rôles définis dans `core/urls.py` (`_user_payload` / `_set_role`) : **admin,
designer, programmer, cnc, assembly, quality, storage, accounting,
etude_technique**. (Pas de rôle `hr` ni `logistics` dédié à ce stade — ces
modules sont visibles uniquement par `admin`.)

| Rôle | Accès |
|---|---|
| `admin` | Toutes les sections via la sidebar (Production, Stockage, Comptabilité, RH, Logistique) + `AdminUsersPage` |
| `designer` | `DesignerPage` (production) |
| `programmer` | `ProgrammerPage` (production) |
| `cnc` | `CncPage` (production) |
| `assembly` | `AssemblyPage` (production) |
| `quality` | `QualityPage` (production) |
| `etude_technique` | `TechnicalStudyPage` (validation projets/références) |
| `storage` | Layout dédié plein écran — module Stockage uniquement |
| `accounting` | Layout dédié plein écran — module Comptabilité uniquement |

---

## 9. État d'avancement

- **Production / Stockage / Comptabilité** : modules historiques, opérationnels.
- **RH / Logistique** : portés depuis `sample-trackerHR` (backend + frontend +
  build OK) — voir [`hr-logistics-integration-report.md`](./hr-logistics-integration-report.md)
  pour le détail du portage.
- **Bloquant courant** : `backend/.env` → `DB_PASSWORD` ne correspond pas à
  l'instance PostgreSQL active (`PostgreSQL_For_Odoo`). Aucune migration
  (RH/Logistique incluses) ne peut être appliquée tant que ce point n'est pas
  résolu. *(En attente de décision utilisateur — non traité.)*

---

## 10. Feuille de route — prochains modules

Détail complet (checklist d'ajout de module, périmètres "Installation"/"Ventes",
ordre suggéré) : voir [`hr-logistics-integration-report.md` §3-4](./hr-logistics-integration-report.md).

En bref :
- **Installation** : interventions/chantiers, suivi d'équipements installés →
  liens probables avec RH (techniciens), Logistique (expédition matériel),
  Stockage (sorties de stock) — sur le modèle des FK déjà en place pour
  `logistics`.
- **Ventes** : à clarifier vs Comptabilité (devis/factures/tiers existent déjà)
  — soit un module CRM amont (prospects/pipeline), soit une simple exposition
  différente des onglets Comptabilité existants.

---

## 11. Phase de tests

Plan détaillé : voir [`hr-logistics-integration-report.md` §5](./hr-logistics-integration-report.md).
Résumé :
1. Résoudre le blocage PostgreSQL (§9).
2. `makemigrations`/`migrate` pour `hr`/`logistics`.
3. Test CRUD par onglet pour chaque module (7 onglets RH, 9 onglets Logistique).
4. Non-régression Production/Stockage/Comptabilité.
5. `npm run build` + test en conditions de prod.
