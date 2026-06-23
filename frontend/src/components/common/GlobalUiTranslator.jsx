import { useEffect } from 'react'
import i18n from '../../i18n'

// Exact UI phrases take priority. The lexical fallback below handles dynamic
// combinations such as counters, status summaries, and API error messages.
const PHRASES = {
  'À faire': 'To do',
  'À vérifier': 'To verify',
  'Aucun actif enregistré.': 'No assets recorded.',
  'Aucun chauffeur': 'No drivers',
  'Aucun commentaire.': 'No comments.',
  'Aucun composant': 'No components',
  'Aucun échantillon': 'No samples',
  'Aucun échantillon approuvé': 'No approved samples',
  'Aucun échantillon en attente': 'No pending samples',
  'Aucun échantillon.': 'No samples.',
  'Aucun employé assigné.': 'No employees assigned.',
  'Aucun employé disponible.': 'No employees available.',
  'Aucun fichier 3D': 'No 3D file',
  'Aucun fichier BOM': 'No BOM file',
  'Aucun fichier DXF': 'No DXF file',
  'Aucun historique disponible.': 'No history available.',
  'Aucun mouvement sur la période': 'No movements during this period',
  'Aucun mouvement trouvé': 'No movements found',
  'Aucun ordre de livraison': 'No delivery orders',
  'Aucun plan PDF': 'No PDF drawing',
  'Aucun projet trouvé': 'No projects found',
  'Aucun rapport rédigé': 'No reports written',
  'Aucun résultat': 'No results',
  'Aucun stock trouvé': 'No stock found',
  'Aucun ticket trouvé': 'No tickets found',
  'Aucun transfert': 'No transfers',
  'Aucun véhicule': 'No vehicles',
  'Aucune écriture': 'No entries',
  'Aucune expédition': 'No shipments',
  'Aucune ligne. Ajoutez des composants ci-dessus.': 'No lines. Add components above.',
  'Aucune notification': 'No notifications',
  'Aucune tâche': 'No tasks',
  'Aucune tâche en retard': 'No overdue tasks',
  'Aucune donnée disponible.': 'No data available.',
  'Aucune notification pour le moment.': 'No notifications at the moment.',
  'Ajouter un échantillon': 'Add a sample',
  'Ajouter un commentaire': 'Add a comment',
  'Ajustement (correction de stock)': 'Adjustment (stock correction)',
  'Annuler la demande': 'Cancel request',
  'Annuler le rework': 'Cancel rework',
  'Aperçu du ticket': 'Ticket preview',
  'Appliquer pour tous': 'Apply to all',
  'Approuver le projet': 'Approve project',
  'Articles référencés': 'Referenced items',
  'Aucune pièce jointe.': 'No attachments.',
  'Balance & États': 'Balance & Statements',
  'Bon de livraison': 'Delivery note',
  'Catégorie parente': 'Parent category',
  'Chauffeur disponible': 'Available driver',
  'Chauffeur non affecté': 'Unassigned driver',
  'Choisir un fichier…': 'Choose a file…',
  'Clients & fournisseurs': 'Customers & suppliers',
  'Clôture prévue': 'Expected closing',
  'Clôture réelle': 'Actual closing',
  'Complet — toutes broches': 'Full — all pins',
  'Complet (toutes broches)': 'Full (all pins)',
  'Compte… (n° ou intitulé)': 'Account… (number or name)',
  'Créer des comptes et attribuer les rôles': 'Create accounts and assign roles',
  'Créer le brouillon': 'Create draft',
  'Créer le mouvement': 'Create movement',
  'Créer le transfert': 'Create transfer',
  "Créer l'expédition": 'Create shipment',
  'Créer la tâche': 'Create task',
  "Date d'approbation": 'Approval date',
  "Date d'échéance": 'Due date',
  "Date d'embauche": 'Hire date',
  "Date d'émission": 'Issue date',
  "Date d'expédition": 'Shipment date',
  'Date de début': 'Start date',
  'Date de demande': 'Request date',
  'Date de départ': 'Departure date',
  'Date de fabrication': 'Manufacturing date',
  'Date de fin': 'End date',
  'Date de mise en service': 'Commissioning date',
  'Date de naissance': 'Date of birth',
  'Date de péremption': 'Expiry date',
  'Date de réception': 'Reception date',
  'Dernière modification': 'Last modified',
  'Dernière vérification': 'Last verification',
  'Détails de la tâche': 'Task details',
  'Document de démission': 'Resignation document',
  'Durée de vie (années)': 'Lifespan (years)',
  'Durée de vie (jours)': 'Lifespan (days)',
  'Échantillons du projet': 'Project samples',
  'Effacer la sélection': 'Clear selection',
  'Employés actifs': 'Active employees',
  'Employés assignés': 'Assigned employees',
  'En attente': 'Pending',
  'En attente assembly…': 'Waiting for assembly…',
  'En attente CNC…': 'Waiting for CNC…',
  'En attente designer…': 'Waiting for designer…',
  'En attente programmateur…': 'Waiting for programmer…',
  'En cours': 'In progress',
  'En cours de livraison': 'Being delivered',
  'En cours…': 'In progress…',
  'En pause': 'Paused',
  'En préparation': 'Preparing',
  'En retard': 'Overdue',
  'Enregistrer avec succès.': 'Saved successfully.',
  "Enregistrer l'écriture": 'Save entry',
  'Enregistrer pointage': 'Save attendance',
  'Entrepôt destination': 'Destination warehouse',
  'Entrepôt source': 'Source warehouse',
  'Envoyer vers machine': 'Send to machine',
  'Erreur de chargement.': 'Loading error.',
  'Erreur lors de la création.': 'Error while creating.',
  'Erreur lors de la mise à jour.': 'Error while updating.',
  'Erreur lors de la vérification.': 'Error during verification.',
  'Exporter objectifs': 'Export targets',
  'Exporter opportunités': 'Export opportunities',
  'Exporter projets': 'Export projects',
  'Factures en retard': 'Overdue invoices',
  'Fichier 3D — CAD': '3D file — CAD',
  'Fichiers actuels :': 'Current files:',
  'Fichiers G-code': 'G-code files',
  'Gestion des utilisateurs': 'User management',
  'Historique des modifications': 'Change history',
  'Importer des données': 'Import data',
  'Importer un fichier DXF — JIMIDE-4030': 'Import a DXF file — JIMIDE-4030',
  "Impossible d'annuler le rework.": 'Unable to cancel rework.',
  "Impossible d'annuler le statut terminé.": 'Unable to cancel completed status.',
  'Impossible de mettre à jour le statut CNC.': 'Unable to update CNC status.',
  'Impossible de mettre à jour le statut Programmeur.': 'Unable to update Programmer status.',
  'Impossible de supprimer le fichier G-code.': 'Unable to delete the G-code file.',
  'Justification de la pause': 'Pause justification',
  "L'action a échoué. Veuillez réessayer.": 'The action failed. Please try again.',
  'Lancer la vérification': 'Run verification',
  'Le serveur a rencontré une erreur. Veuillez réessayer.': 'The server encountered an error. Please try again.',
  'Les tâches sont créées et suivies dans le projet.': 'Tasks are created and tracked in the project.',
  'Les échantillons en cours ou terminés par le CNC apparaîtront ici.': 'Samples started or completed by CNC will appear here.',
  "Les échantillons terminés par l'assemblage apparaîtront ici.": 'Samples completed by assembly will appear here.',
  'Les échantillons terminés par le designer apparaîtront ici.': 'Samples completed by the designer will appear here.',
  'Les échantillons terminés par le programmateur apparaîtront ici.': 'Samples completed by the programmer will appear here.',
  'Livre-journal (Excel)': 'Journal ledger (Excel)',
  'Manque de détail': 'Missing details',
  'Matrice de référence': 'Reference matrix',
  'Mettre en pause': 'Pause',
  'Mode de paiement': 'Payment method',
  "Modifier l'échantillon": 'Edit sample',
  "Modifier l'employé": 'Edit employee',
  "Modifier l'expédition": 'Edit shipment',
  "Modifier l'opportunité": 'Edit opportunity',
  "Modifier l'ordre de livraison": 'Edit delivery order',
  "Modifier l'utilisateur": 'Edit user',
  'Modifier la présence': 'Edit attendance',
  'Modifier la tâche': 'Edit task',
  'Modifier le chauffeur': 'Edit driver',
  'Modifier le projet': 'Edit project',
  'Modifier le statut': 'Edit status',
  'Modifier le transfert': 'Edit transfer',
  'Modifier le véhicule': 'Edit vehicle',
  'Montant total': 'Total amount',
  'Mot de passe': 'Password',
  'Nom complet': 'Full name',
  "Nom d'utilisateur": 'Username',
  'Nom de la société': 'Company name',
  'Nom du client': 'Customer name',
  'Nom du projet': 'Project name',
  'Non affecté': 'Unassigned',
  'Non commencé': 'Not started',
  'Non spécifié': 'Not specified',
  'Nouveau candidat': 'New candidate',
  'Nouveau contrat': 'New contract',
  'Nouveau département': 'New department',
  'Nouveau poste': 'New position',
  'Nouveau projet': 'New project',
  'Nouveau rapport logistique': 'New logistics report',
  'Nouveau véhicule': 'New vehicle',
  'Nouvel échantillon': 'New sample',
  'Nouvel employé': 'New employee',
  'Nouvel entrepôt': 'New warehouse',
  'Nouvel ordre de livraison': 'New delivery order',
  'Nouvelle catégorie': 'New category',
  'Nouvelle demande': 'New request',
  'Nouvelle demande de congé': 'New leave request',
  'Nouvelle démission': 'New resignation',
  'Nouvelle écriture': 'New entry',
  'Nouvelle expédition': 'New shipment',
  'Nouvelle facture': 'New invoice',
  'Nouvelle opportunité': 'New opportunity',
  'Nouvelle paie': 'New payroll entry',
  'Nouvelle tâche': 'New task',
  'Numéro de livraison': 'Delivery number',
  'Numéro de lot': 'Batch number',
  'Numéro de permis': 'License number',
  'Numéro de suivi': 'Tracking number',
  'Numéro de téléphone': 'Phone number',
  'Numéro de transfert': 'Transfer number',
  'Objectifs commerciaux': 'Sales targets',
  'Opportunités gagnées': 'Won opportunities',
  'Opportunités ouvertes': 'Open opportunities',
  'Opportunités par étape': 'Opportunities by stage',
  'Ordre de livraison': 'Delivery order',
  'Ordres de livraison': 'Delivery orders',
  'Ouvrir le document': 'Open document',
  'Partiellement payé': 'Partially paid',
  'Pas de fichier 3D': 'No 3D file',
  'Pause raison': 'Pause reason',
  'Période du': 'Period from',
  'Plan comptable': 'Chart of accounts',
  'Plan PDF': 'PDF drawing',
  'Pointage du jour': 'Today\'s attendance',
  'Produits concernés': 'Affected products',
  'Produits installation': 'Installation products',
  'Projets actifs': 'Active projects',
  'Projets approuvés uniquement': 'Approved projects only',
  'Projets créés': 'Created projects',
  'Projets distincts': 'Distinct projects',
  'Projets en retard': 'Overdue projects',
  'Projets gagnés': 'Won projects',
  'Projets perdus': 'Lost projects',
  'Projets terminés': 'Completed projects',
  'Projets total': 'Total projects',
  'Quantité actuelle à cet emplacement :': 'Current quantity at this location:',
  'Quantité totale': 'Total quantity',
  'Quantité initiale': 'Initial quantity',
  'Quantité réservée': 'Reserved quantity',
  'Quantité totale agrégée': 'Total aggregated quantity',
  'Rapports projet': 'Project reports',
  'Rechercher et sélectionner...': 'Search and select...',
  'Rechercher par article ou emplacement...': 'Search by item or location...',
  'Rechercher par article, référence...': 'Search by item or reference...',
  'Rechercher par code, nom, code barre...': 'Search by code, name, or barcode...',
  'Rechercher par code, zone...': 'Search by code or zone...',
  'Rechercher par contenu QR, article...': 'Search by QR content or item...',
  'Rechercher par nom de fichier, description, auteur…': 'Search by filename, description, or author…',
  'Rechercher par numéro, article...': 'Search by number or item...',
  'Rechercher projet, client...': 'Search project or customer...',
  'Rechercher référence, désignation…': 'Search reference or designation…',
  'Rechercher un article...': 'Search for an item...',
  'Rechercher un client...': 'Search for a customer...',
  'Rechercher un collaborateur...': 'Search for a team member...',
  'Rechercher un employé...': 'Search for an employee...',
  'Rechercher un projet...': 'Search for a project...',
  'Rechercher APN, #série, projet, placement…': 'Search APN, serial #, project, placement…',
  'Rechercher APN, projet, placement…': 'Search APN, project, placement…',
  'Rechercher… (APN, #série, projet, placement, client)': 'Search… (APN, serial #, project, placement, customer)',
  'Référence document': 'Document reference',
  'Réinitialiser': 'Reset',
  'Retour aux produits': 'Back to products',
  'Retour aux projets': 'Back to projects',
  'Retourner en rework': 'Return for rework',
  'Retourner en rework assembly': 'Return for assembly rework',
  'Retourner en rework CNC': 'Return for CNC rework',
  'Ressources humaines': 'Human Resources',
  'Reste à payer': 'Amount due',
  'Saisir une présence': 'Enter attendance',
  'Sans catégorie': 'No category',
  'Sans département': 'No department',
  'Sans lot': 'No batch',
  'Scanner un code': 'Scan a code',
  'Sélectionner un chauffeur': 'Select a driver',
  'Sélectionner un commercial': 'Select a salesperson',
  'Sélectionner un employé': 'Select an employee',
  'Sélectionner un entrepôt': 'Select a warehouse',
  'Sélectionner un véhicule': 'Select a vehicle',
  'Sélectionner une raison…': 'Select a reason…',
  'Statut CNC': 'CNC status',
  'Statut asm.': 'Assembly status',
  'Statut qualité': 'Quality status',
  'Stock total': 'Total stock',
  'Suivre les livraisons': 'Track deliveries',
  'Supprimer ce brouillon ?': 'Delete this draft?',
  'Supprimer ce commentaire ?': 'Delete this comment?',
  'Supprimer ce produit ?': 'Delete this product?',
  'Supprimer ce projet ?': 'Delete this project?',
  'Supprimer cet élément ?': 'Delete this item?',
  'Supprimer cette entrée ?': 'Delete this entry?',
  'Supprimer cette pièce jointe ?': 'Delete this attachment?',
  'Supprimer cette tâche ?': 'Delete this task?',
  'Supprimer le fichier ?': 'Delete the file?',
  'Supprimer le fichier 3D ?': 'Delete the 3D file?',
  'Supprimer le plan PDF ?': 'Delete the PDF drawing?',
  'Tableau de bord': 'Dashboard',
  'Tâches actives': 'Active tasks',
  'Tâches en retard': 'Overdue tasks',
  'Tâches ouvertes': 'Open tasks',
  'Tâches terminées': 'Completed tasks',
  'Télécharger 3D': 'Download 3D',
  'Tous': 'All',
  'Terminé': 'Completed',
  'Terminée': 'Completed',
  'Terminées': 'Completed',
  'Terminés': 'Completed',
  'Tous les départements': 'All departments',
  'Tous les employés': 'All employees',
  'Tous les entrepôts': 'All warehouses',
  'Tous les journaux': 'All journals',
  'Tous les projets': 'All projects',
  'Tous les statuts': 'All statuses',
  'Tous statuts': 'All statuses',
  'Tous types': 'All types',
  'Tout marquer comme lu': 'Mark all as read',
  'Travailleurs': 'Workers',
  'Type de congé': 'Leave type',
  'Type de contrat': 'Contract type',
  'Type de destination': 'Destination type',
  'Type de véhicule': 'Vehicle type',
  'Une erreur est survenue. Veuillez réessayer.': 'An error occurred. Please try again.',
  'Valeur actuelle': 'Current value',
  'Valeur estimée': 'Estimated value',
  'Valeur gagnée': 'Won value',
  'Valeur initiale': 'Initial value',
  'Valeur totale du stock': 'Total stock value',
  'Véhicule disponible': 'Available vehicle',
  'Véhicule interne': 'Internal vehicle',
  'Véhicules disponibles': 'Available vehicles',
  'Véhicules indisponibles': 'Unavailable vehicles',
  'Vide — aucune broche': 'Empty — no pins',
  'Vide (aucune broche)': 'Empty (no pins)',
  'Voir PDF': 'View PDF',
  'Voir BOM Excel': 'View BOM Excel',
  'Chargement…': 'Loading…',
  'Chargement...': 'Loading...',
  'Démarrer': 'Start',
  'Programmé': 'Programmed',
  'Assemblé': 'Assembled',
  'CNC terminé': 'CNC completed',
  'Connecteurs complets': 'Complete connectors',
  'Ouvrir dans SolidWorks': 'Open in SolidWorks',
  'Ouverture dans SolidWorks…': 'Opening in SolidWorks…',
}

const ADDITIONAL_PHRASES = {
  '✓ Projets approuvés uniquement': '✓ Approved projects only',
  'en attente': 'pending',
  'En congé': 'On leave',
  'renvoyer CNC': 'send back to CNC',
  'renvoyé assembly': 'sent back by assembly',
  'Qté': 'Qty',
  'Date fin': 'Completion date',
  'Date fin prog.': 'Programmer completion date',
  '✓ Programmé': '✓ Programmed',
  '✓ Assemblé': '✓ Assembled',
  '✓ Validé': '✓ Validated',
  'Validés': 'Validated',
  'Vérifiés': 'Verified',
  'Approuvés': 'Approved',
  'échantillons approuvés': 'approved samples',
  '▶ En cours': '▶ In progress',
  '✕ Annuler': '✕ Cancel',
  '✕ Annuler rework': '✕ Cancel rework',
  '↺ Rework designer': '↺ Designer rework',
  '↺ Rework programmateur': '↺ Programmer rework',
  '↺ Rework assembly': '↺ Assembly rework',
  'Rework prog.': 'Programmer rework',
  'Rework asm.': 'Assembly rework',
  'Rework designer': 'Designer rework',
  'Gérer la matrice': 'Manage matrix',
  'NOM DU PROJET': 'PROJECT NAME',
  'ÉCHANTILLONS': 'SAMPLES',
  'STATUT': 'STATUS',
  'DERNIÈRE VÉRIFICATION': 'LAST VERIFICATION',
  "DATE D'APPROBATION": 'APPROVAL DATE',
  'Nouvel utilisateur': 'New user',
  '+ Nouvel utilisateur': '+ New user',
  'Programmateur': 'Programmer',
  'Technicien CNC': 'CNC technician',
  'Administrateur — accès complet': 'Administrator — full access',
  'Designer — Vue Designer uniquement': 'Designer — Designer View only',
  'Programmateur — Vue Programmateur uniquement': 'Programmer — Programmer View only',
  'Technicien CNC — Vue CNC uniquement': 'CNC technician — CNC View only',
  'Assembly — Vue Assembly uniquement': 'Assembly — Assembly View only',
  'Qualité — Vue Qualité uniquement': 'Quality — Quality View only',
  'Stockage - Vue Stockage uniquement': 'Storage — Storage View only',
  'Étude Technique': 'Technical Study',
  'Administrateur': 'Administrator',
  'vous': 'you',
  "Janvier': 'January', 'Février': 'February', 'Mars': 'March', 'Avril": 'April',
  "Mai': 'May', 'Juin': 'June', 'Juillet': 'July', 'Août": 'August',
  "Septembre': 'September', 'Octobre': 'October', 'Novembre': 'November', 'Décembre": 'December',
}

const WORDS = {
  "Absences': 'Absences', 'Absent': 'Absent', 'Accepté': 'Accepted', 'Accepter": 'Accept',
  "Actif': 'Active', 'Actifs': 'Assets', 'Action': 'Action', 'Actions": 'Actions',
  "Actualiser': 'Refresh', 'Adresse': 'Address', 'Affecté': 'Assigned', 'Agence": 'Agency',
  "Ajouter': 'Add', 'Alerte': 'Alert', 'Alertes': 'Alerts', 'Allée": 'Aisle',
  "Amortissement': 'Depreciation', 'Année': 'Year', 'Annulé': 'Cancelled', 'Annulée": 'Cancelled',
  "Annuler': 'Cancel', 'Aperçu': 'Preview', 'Approuvé': 'Approved', 'Approuvée": 'Approved',
  "Approuver': 'Approve', 'Archivé': 'Archived', 'Article': 'Item', 'Articles": 'Items',
  "Auteur': 'Author', 'Autre': 'Other', 'Avancement': 'Progress', 'Avoir": 'Credit note',
  "Bilan': 'Balance sheet', 'Bloqué': 'Blocked', 'Bloquée': 'Blocked', 'Brouillon": 'Draft',
  "Candidats': 'Candidates', 'Capacité': 'Capacity', 'Catégorie': 'Category', 'Catégories": 'Categories',
  "Chauffeur': 'Driver', 'Chauffeurs': 'Drivers', 'Clôture': 'Closing', 'Clôturé": 'Closed',
  "Clôturer': 'Close', 'Code': 'Code', 'Commentaire': 'Comment', 'Commentaires": 'Comments',
  "Commercial': 'Salesperson', 'Complet': 'Full', 'Composant': 'Component', 'Composants": 'Components',
  "Comptabilité': 'Accounting', 'Compte': 'Account', 'Comptes': 'Accounts', 'Confirmer": 'Confirm',
  "Conforme': 'Compliant', 'Conformité': 'Compliance', 'Congé': 'Leave', 'Congés": 'Leave',
  "Contact': 'Contact', 'Contenu': 'Content', 'Contrat': 'Contract', 'Contrats": 'Contracts',
  "Créer': 'Create', 'Création': 'Creation', 'Crédit': 'Credit', 'Date": 'Date',
  "Débit': 'Debit', 'Début': 'Start', 'Décision': 'Decision', 'Délai": 'Deadline',
  "Demande': 'Request', 'Demandé': 'Requested', 'Démissions': 'Resignations', 'Département": 'Department',
  "Départements': 'Departments', 'Description': 'Description', 'Désignation": 'Designation',
  "Détails': 'Details', 'Devis': 'Quote', 'Disponible': 'Available', 'Document": 'Document',
  "Documents': 'Documents', 'Durée': 'Duration', 'Écart': 'Difference', 'Écarts": 'Differences',
  "Échantillon': 'Sample', 'Échantillons': 'Samples', 'Échéance': 'Due date', 'Écriture": 'Entry',
  "Écritures': 'Entries', 'Emplacement': 'Location', 'Employé': 'Employee', 'Employés": 'Employees',
  "Entrée': 'Inbound', 'Entrepôt': 'Warehouse', 'Entrepôts': 'Warehouses', 'Envoi": 'Sending',
  "Envoyé': 'Sent', 'Envoyer': 'Send', 'Épuisé': 'Depleted', 'Erreur": 'Error',
  "Expédié': 'Shipped', 'Expédiée': 'Shipped', 'Expédition': 'Shipment', 'Expéditions": 'Shipments',
  "Expiration': 'Expiry', 'Expiré': 'Expired', 'Exporter': 'Export', 'Facture": 'Invoice',
  "Factures': 'Invoices', 'Fermé': 'Closed', 'Fermer': 'Close', 'Fichier": 'File',
  "Fichiers': 'Files', 'Fournisseur': 'Supplier', 'Fournisseurs': 'Suppliers', 'Gagné": 'Won',
  "Gagnée': 'Won', 'Genre': 'Gender', 'Gérer': 'Manage', 'Gestion": 'Management',
  "Heure': 'Time', 'Heures': 'Hours', 'Historique': 'History', 'Image": 'Image',
  "Immatriculation': 'Registration', 'Importer': 'Import', 'Importé': 'Imported', 'Imprimer": 'Print',
  "Inactif': 'Inactive', 'Inactifs': 'Inactive', 'Incident': 'Incident', 'Indisponible": 'Unavailable',
  "Intitulé': 'Name', 'Journal': 'Journal', 'Jours': 'Days', 'Justificatif": 'Supporting document',
  "Ligne': 'Line', 'Lignes': 'Lines', 'Livraison': 'Delivery', 'Livraisons": 'Deliveries',
  "Livré': 'Delivered', 'Livrée': 'Delivered', 'Lot': 'Batch', 'Lots": 'Batches',
  "Machine': 'Machine', 'Machines': 'Machines', 'Manquant': 'Missing', 'Manuelle": 'Manual',
  "Matrice': 'Matrix', 'Matricule': 'Employee ID', 'Mensuelle': 'Monthly', 'Mois": 'Month',
  "Montant': 'Amount', 'Motif': 'Reason', 'Modifier': 'Edit', 'Négociation": 'Negotiation',
  "Nom': 'Name', 'Notes': 'Notes', 'Notifications': 'Notifications', 'Objectif": 'Target',
  "Objectifs': 'Targets', 'Opportunité': 'Opportunity', 'Opportunités": 'Opportunities',
  "Ordre': 'Order', 'Ouvert': 'Open', 'Ouvrir': 'Open', 'Page": 'Page',
  "Paiement': 'Payment', 'Paiements': 'Payments', 'Par': 'By', 'Payé": 'Paid',
  "Payée': 'Paid', 'Péremption': 'Expiry', 'Performance': 'Performance', 'Périmé": 'Expired',
  "Période': 'Period', 'Permis': 'License', 'Photo': 'Photo', 'Pièce": 'Part',
  "Pièces': 'Parts', 'Placement': 'Placement', 'Plein': 'Full', 'Poste": 'Position',
  "Postes': 'Positions', 'Précédent': 'Previous', 'Préc': 'Prev', 'Préparation": 'Preparation',
  "Présences': 'Attendance', 'Présent': 'Present', 'Prêt': 'Ready', 'Primes": 'Bonuses',
  "Priorité': 'Priority', 'Probabilité': 'Probability', 'Produit': 'Product', 'Produits": 'Products',
  "Profil': 'Profile', 'Projet': 'Project', 'Projets': 'Projects', 'Qualité": 'Quality',
  "Qualifiée': 'Qualified', 'Quantité': 'Quantity', 'Quantités': 'Quantities', 'Rapport": 'Report',
  "Rapports': 'Reports', 'Réalisé': 'Completed', 'Réception': 'Reception', 'Rechercher": 'Search',
  "Reçu': 'Received', 'Référence': 'Reference', 'Refusé': 'Rejected', 'Refuser": 'Reject',
  "Rejeté': 'Rejected', 'Rejetée': 'Rejected', 'Réinitialiser': 'Reset', 'Remise": 'Discount',
  "Renvoyer': 'Send back', 'Réservé': 'Reserved', 'Réserver': 'Reserve', 'Résilié": 'Terminated',
  "Responsable': 'Manager', 'Reste': 'Remaining', 'Résultat': 'Result', 'Résultats": 'Results',
  "Retard': 'Delay', 'Retards': 'Delays', 'Retour': 'Back', 'Retourner": 'Return',
  "Rôle': 'Role', 'Salaire': 'Salary', 'Sauv': 'Save', 'Scanner": 'Scan',
  "Sélectionner': 'Select', 'Service': 'Service', 'Société': 'Company', 'Solde": 'Balance',
  "Sortie': 'Outbound', 'Source': 'Source', 'Statut': 'Status', 'Stockage": 'Storage',
  "Suivant': 'Next', 'Suiv': 'Next', 'Suivi': 'Tracking', 'Supprimer": 'Delete',
  "Système': 'System', 'Tâche': 'Task', 'Tâches': 'Tasks', 'Taux": 'Rate',
  "Télécharger': 'Download', 'Téléphone': 'Phone', 'Temps': 'Time', 'Terminé": 'Completed',
  "Terminée': 'Completed', 'Terminés': 'Completed', 'Titre': 'Title', 'Tous": 'All',
  "Toutes': 'All', 'Total': 'Total', 'Transfert': 'Transfer', 'Transferts": 'Transfers',
  "Transport': 'Transport', 'Trimestrielle': 'Quarterly', 'Type': 'Type', 'Unité": 'Unit',
  "Utilisateur': 'User', 'Utilisateurs': 'Users', 'Validé': 'Validated', 'Validée": 'Validated',
  "Valider': 'Validate', 'Véhicule': 'Vehicle', 'Véhicules': 'Vehicles', 'Ventes": 'Sales',
  "Vérification': 'Verification', 'Vérifié': 'Verified', 'Ville': 'City', 'Voir": 'View',
}

const INFLECTIONS = [
  [/(\d+(?:[.,]\d+)?)% de l['']objectif/giu, '$1% of target'],
  [/(\d+) activités ou opportunités en retard\./giu, '$1 overdue activities or opportunities.'],
  [/(\d+) tâche\(s\) à faire/giu, '$1 task(s) to do'],
  [/(\d+) non lue\(s\)/giu, '$1 unread'],
  [/\bAucun échantillon\b/giu, 'No samples'],
  [/\bAucun ([\p{L}-]+)/giu, 'No $1'],
  [/\bAucune ([\p{L}-]+)/giu, 'No $1'],
  [/\bTous les\b/giu, 'All'],
  [/\bToutes les\b/giu, 'All'],
  [/\bpage courante\b/giu, 'current page'],
  [/\bsur cette page\b/giu, 'on this page'],
  [/\ben attente d'approbation\b/giu, 'awaiting approval'],
  [/\bnon lue\(s\)\b/giu, 'unread'],
  [/\bjour\(s\)\b/giu, 'day(s)'],
  [/\bligne\(s\)\b/giu, 'line(s)'],
  [/\béchantillon\(s\)\b/giu, 'sample(s)'],
  [/\bsélectionné\(s\)\b/giu, 'selected'],
  [/\bcréé\(s\)\b/giu, 'created'],
  [/\bimporté\(s\)\b/giu, 'imported'],
]

const SORTED_WORDS = Object.entries(WORDS).sort((a, b) => b[0].length - a[0].length)
const originalText = new WeakMap()
const originalAttributes = new WeakMap()

function matchCase(source, translated) {
  if (source.toUpperCase() === source) return translated.toUpperCase()
  if (source[0] === source[0]?.toUpperCase()) {
    return translated[0]?.toUpperCase() + translated.slice(1)
  }
  return translated.toLowerCase()
}

export function translateUiText(source, language = i18n.language) {
  if (!source || language !== 'en') return source
  if (ADDITIONAL_PHRASES[source]) return ADDITIONAL_PHRASES[source]
  if (PHRASES[source]) return PHRASES[source]

  let value = source
  for (const [pattern, replacement] of INFLECTIONS) value = value.replace(pattern, replacement)
  for (const [french, english] of SORTED_WORDS) {
    const escaped = french.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    value = value.replace(new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'giu'), (match) => matchCase(match, english))
  }
  return value
}

function translateValue(value) {
  const leading = value.match(/^\s*/)?.[0] || ''
  const trailing = value.match(/\s*$/)?.[0] || ''
  const core = value.slice(leading.length, value.length - trailing.length)
  return `${leading}${translateUiText(core)}${trailing}`
}

function shouldSkip(node) {
  const parent = node.parentElement || node
  return Boolean(parent?.closest?.('script, style, code, pre, [data-no-translate="true"]'))
}

function processTextNode(node) {
  if (shouldSkip(node) || !node.nodeValue?.trim()) return
  const record = originalText.get(node)

  if (i18n.language === 'en') {
    if (record && node.nodeValue === record.translated) return
    const source = node.nodeValue
    const translated = translateValue(source)
    originalText.set(node, { source, translated })
    if (translated !== source) node.nodeValue = translated
    return
  }

  if (record) {
    if (node.nodeValue === record.translated) node.nodeValue = record.source
    originalText.delete(node)
  }
}

function processElement(element) {
  if (shouldSkip(element)) return
  for (const attribute of ['placeholder', 'title', 'aria-label']) {
    if (!element.hasAttribute?.(attribute)) continue
    const current = element.getAttribute(attribute)
    const records = originalAttributes.get(element) || {}
    const record = records[attribute]

    if (i18n.language === 'en') {
      if (record && current === record.translated) continue
      const translated = translateValue(current)
      records[attribute] = { source: current, translated }
      originalAttributes.set(element, records)
      if (translated !== current) element.setAttribute(attribute, translated)
    } else if (record) {
      if (current === record.translated) element.setAttribute(attribute, record.source)
      delete records[attribute]
    }
  }
}

function processTree(root) {
  if (root.nodeType === Node.TEXT_NODE) {
    processTextNode(root)
    return
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return
  processElement(root)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) processTextNode(node)
    else processElement(node)
    node = walker.nextNode()
  }
}

export default function GlobalUiTranslator() {
  useEffect(() => {
    let translating = false
    let scheduled = false

    const translateDocument = () => {
      if (translating) return
      translating = true
      document.documentElement.lang = i18n.language
      processTree(document.body)
      translating = false
    }

    const scheduleTranslation = () => {
      if (scheduled) return
      scheduled = true
      queueMicrotask(() => {
        scheduled = false
        translateDocument()
      })
    }

    const observer = new MutationObserver((mutations) => {
      if (translating) return
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') processTextNode(mutation.target)
        if (mutation.type === 'attributes') processElement(mutation.target)
        mutation.addedNodes.forEach(processTree)
      }
    })

    translateDocument()
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
      subtree: true,
    })
    i18n.on('languageChanged', scheduleTranslation)

    return () => {
      observer.disconnect()
      i18n.off('languageChanged', scheduleTranslation)
    }
  }, [])

  return null
}
