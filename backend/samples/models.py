import os
import random
import re
from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


DESIGNER_STATUS_CHOICES = [
    ('ongoing',  'En cours'),
    ('standby',  'En pause'),
    ('done',     'Terminé'),
]

PAUSE_REASON_CHOICES = [
    ('manque_detail', 'Manque de détail'),
    ('rework',        'Rework'),
    ('technical',     'Problème technique'),
    ('lunch',         'Lunch'),
    ('clock_out',     'Clock out'),
]

CONNECTOR_FILL_CHOICES = [
    ('full',    'Complet (toutes broches)'),
    ('empty',   'Vide (aucune broche)'),
    ('partial', 'Partiel (broches partielles)'),
]

CLIENT_CHOICES = [
    ('Aptiv', 'Aptiv'),
    ('Yazaki', 'Yazaki'),
    ('Lear', 'Lear'),
    ('Renault', 'Renault'),
    ('Stellantis', 'Stellantis'),
    ('Sumitomo', 'Sumitomo'),
    ('Other', 'Autre'),
]

STATUS_CHOICES = [
    ('pending', 'En attente'),
    ('approved', 'Approuvé'),
    ('rejected', 'Rejeté'),
    ('archived', 'Archivé'),
]

PLACEMENT_RE = re.compile(r'^[A-Z][0-9]{1,2}$')


def validate_placement(value):
    if not PLACEMENT_RE.match(value):
        raise ValidationError(
            'Le format du placement doit être une lettre majuscule suivie de 1 ou 2 chiffres (ex: A1, B6, C12).'
        )


class SampleManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class Sample(models.Model):
    apn = models.CharField(max_length=50, db_index=True)
    project = models.CharField(max_length=100, db_index=True)
    placement = models.CharField(max_length=10, validators=[validate_placement])
    image = models.ImageField(upload_to='samples/%Y/%m/', blank=True, null=True)
    thumbnail = models.ImageField(upload_to='thumbnails/%Y/%m/', blank=True, null=True)
    received_date = models.DateField(default=timezone.now)
    client = models.CharField(max_length=20, choices=CLIENT_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    quantity = models.PositiveIntegerField(default=1)
    connector_fill = models.CharField(
        max_length=10, choices=CONNECTOR_FILL_CHOICES, default='empty'
    )
    description = models.TextField(blank=True)
    # Commentaire libre (rempli depuis « Description / Comments » à l'import Excel)
    commentaire = models.TextField(blank=True)
    # ── Designer done tracking ────────────────────────────────────────────────
    is_done   = models.BooleanField(default=False, db_index=True)
    done_date = models.DateField(null=True, blank=True)
    done_by   = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='samples_done'
    )
    # ── Designer status & chronometer ─────────────────────────────────────────
    designer_status    = models.CharField(
        max_length=10, choices=DESIGNER_STATUS_CHOICES,
        null=True, blank=True, db_index=True
    )
    time_started       = models.DateTimeField(null=True, blank=True)
    time_spent_minutes = models.PositiveIntegerField(default=0)
    pause_reason       = models.CharField(
        max_length=20, choices=PAUSE_REASON_CHOICES, null=True, blank=True
    )
    designer_locked_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='samples_designer_lock'
    )
    is_rework          = models.BooleanField(default=False, db_index=True)
    # ── Programmer status & chronometer ───────────────────────────────────────
    programmer_status            = models.CharField(
        max_length=10, choices=DESIGNER_STATUS_CHOICES,
        null=True, blank=True, db_index=True
    )
    programmer_time_started       = models.DateTimeField(null=True, blank=True)
    programmer_time_spent_minutes = models.PositiveIntegerField(default=0)
    programmer_pause_reason       = models.CharField(
        max_length=20, choices=PAUSE_REASON_CHOICES, null=True, blank=True
    )
    programmer_locked_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='samples_programmer_lock'
    )
    programmer_done      = models.BooleanField(default=False, db_index=True)
    programmer_done_date = models.DateField(null=True, blank=True)
    programmer_done_by   = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='samples_programmer_done'
    )
    # ── CNC Technician status & chronometer ───────────────────────────────────
    is_cnc_rework           = models.BooleanField(default=False, db_index=True)
    cnc_status              = models.CharField(
        max_length=10, choices=DESIGNER_STATUS_CHOICES,
        null=True, blank=True, db_index=True
    )
    cnc_time_started        = models.DateTimeField(null=True, blank=True)
    cnc_time_spent_minutes  = models.PositiveIntegerField(default=0)
    cnc_pause_reason        = models.CharField(
        max_length=20, choices=PAUSE_REASON_CHOICES, null=True, blank=True
    )
    cnc_locked_by           = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='samples_cnc_lock'
    )
    cnc_done                = models.BooleanField(default=False, db_index=True)
    cnc_done_date           = models.DateField(null=True, blank=True)
    cnc_done_by             = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='samples_cnc_done'
    )
    cnc_produced_count      = models.PositiveIntegerField(default=0)
    # Multiple workers can be active simultaneously on CNC/Assembly
    # Format: [{"id": 1, "name": "Alice"}, ...]
    cnc_active_workers      = models.JSONField(default=list, blank=True)
    # ── Assembly status & chronometer ──────────────────────────────────────────
    is_assembly_rework          = models.BooleanField(default=False, db_index=True)
    assembly_status             = models.CharField(
        max_length=10, choices=DESIGNER_STATUS_CHOICES,
        null=True, blank=True, db_index=True
    )
    assembly_time_started       = models.DateTimeField(null=True, blank=True)
    assembly_time_spent_minutes = models.PositiveIntegerField(default=0)
    assembly_pause_reason       = models.CharField(
        max_length=20, choices=PAUSE_REASON_CHOICES, null=True, blank=True
    )
    assembly_locked_by          = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='samples_assembly_lock'
    )
    assembly_done               = models.BooleanField(default=False, db_index=True)
    assembly_done_date          = models.DateField(null=True, blank=True)
    assembly_done_by            = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='samples_assembly_done'
    )
    assembly_produced_count     = models.PositiveIntegerField(default=0)
    assembly_active_workers     = models.JSONField(default=list, blank=True)
    # ── Quality Control status & chronometer ──────────────────────────────────
    is_quality_rework           = models.BooleanField(default=False, db_index=True)
    quality_status              = models.CharField(
        max_length=10, choices=DESIGNER_STATUS_CHOICES,
        null=True, blank=True, db_index=True
    )
    quality_time_started        = models.DateTimeField(null=True, blank=True)
    quality_time_spent_minutes  = models.PositiveIntegerField(default=0)
    quality_pause_reason        = models.CharField(
        max_length=20, choices=PAUSE_REASON_CHOICES, null=True, blank=True
    )
    quality_done                = models.BooleanField(default=False, db_index=True)
    quality_done_date           = models.DateField(null=True, blank=True)
    quality_done_by             = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='samples_quality_done'
    )
    quality_active_workers      = models.JSONField(default=list, blank=True)
    # ── Design files (CAD + PDF) ──────────────────────────────────────────────
    design_file        = models.FileField(upload_to='designer/', null=True, blank=True)
    design_pdf         = models.FileField(upload_to='designer/', null=True, blank=True)
    design_uploaded_at = models.DateTimeField(null=True, blank=True)
    design_uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='samples_design_upload'
    )
    # ── BOM PDF (Bill of Materials) ───────────────────────────────────────────
    bom_pdf         = models.FileField(upload_to='bom/', null=True, blank=True)
    bom_uploaded_at = models.DateTimeField(null=True, blank=True)
    # ── G-code file (Programmer upload → CNC) ────────────────────────────────────
    gcode_file        = models.FileField(upload_to='gcode/', null=True, blank=True)
    gcode_uploaded_at = models.DateTimeField(null=True, blank=True)
    gcode_uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='samples_gcode_upload'
    )
    # ── Unique serial number (auto-assigned, 1-1000) ───────────────────────────
    serial_number = models.IntegerField(unique=True, null=True, blank=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    # ── Technical Study per-sample approval ───────────────────────────────────
    study_approved = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='samples_created'
    )
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='samples_updated'
    )

    objects = SampleManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.apn} — {self.project} ({self.placement})"

    def _generate_serial(self):
        """Return a unique random serial number (1-1000, fallback to larger range)."""
        for _ in range(60):
            sn = random.randint(1, 1000)
            if not Sample.all_objects.filter(serial_number=sn).exists():
                return sn
        for _ in range(60):
            sn = random.randint(1001, 9999)
            if not Sample.all_objects.filter(serial_number=sn).exists():
                return sn
        return random.randint(10000, 99999)

    def save(self, *args, **kwargs):
        is_new = self.pk is None

        # Auto-assign serial number on first save
        if is_new and self.serial_number is None:
            self.serial_number = self._generate_serial()

        image_changed = False

        if not is_new:
            try:
                old = Sample.all_objects.get(pk=self.pk)
                image_changed = old.image != self.image
            except Sample.DoesNotExist:
                image_changed = bool(self.image)
        else:
            image_changed = bool(self.image)

        super().save(*args, **kwargs)

        if image_changed and self.image:
            self._generate_thumbnail()

    def _generate_thumbnail(self):
        try:
            from PIL import Image as PILImage
            img = PILImage.open(self.image.path)
            img.thumbnail((200, 200), PILImage.LANCZOS)

            # Derive thumbnail path from image path
            img_name = self.image.name  # e.g. samples/2024/01/photo.jpg
            parts = img_name.rsplit('.', 1)
            thumb_name = (
                parts[0].replace('samples/', 'thumbnails/', 1) + '_thumb.' + parts[1]
                if len(parts) == 2
                else parts[0].replace('samples/', 'thumbnails/', 1) + '_thumb.jpg'
            )

            thumb_full = os.path.join(settings.MEDIA_ROOT, thumb_name)
            os.makedirs(os.path.dirname(thumb_full), exist_ok=True)
            img.save(thumb_full)

            # Use update() to avoid recursive save
            Sample.all_objects.filter(pk=self.pk).update(thumbnail=thumb_name)
            self.thumbnail.name = thumb_name
        except Exception:
            pass

    def soft_delete(self, user=None):
        self.is_deleted = True
        self.updated_by = user
        self.save(update_fields=['is_deleted', 'updated_by', 'updated_at'])


class ProgrammerFile(models.Model):
    sample     = models.ForeignKey(Sample, on_delete=models.CASCADE, related_name='programmer_files')
    file       = models.FileField(upload_to='gcode/')
    file_name  = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='programmer_files_uploaded'
    )

    class Meta:
        ordering = ['uploaded_at']

    def __str__(self):
        return f"{self.sample.apn} — {self.file_name}"


class JimideDxfFile(models.Model):
    file = models.FileField(upload_to='jimide_dxf/')
    file_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='jimide_dxf_files'
    )

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.file_name



class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Créé'),
        ('update', 'Modifié'),
        ('delete', 'Supprimé'),
        ('import', 'Importé'),
        ('export', 'Exporté'),
    ]

    sample = models.ForeignKey(
        Sample, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='audit_logs'
    )
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    changes = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user} — {self.action} — {self.timestamp:%Y-%m-%d %H:%M}"


# ── Technical Study Validation ────────────────────────────────────────────────

VALIDATION_STATUS_CHOICES = [
    ('pending',  'En attente'),
    ('approved', 'Validé'),
    ('rejected', 'Rejeté'),
]


class MatrixEntry(models.Model):
    """One expected sample in the reference matrix (master list).

    La même référence peut apparaître plusieurs fois : chaque ligne représente
    une variante du même holder (import Excel client) — les détails distinctifs
    sont portés par `notes`.
    """
    reference   = models.CharField(max_length=50, db_index=True)  # maps to Sample.apn
    designation = models.CharField(max_length=200, blank=True)
    quantity    = models.PositiveIntegerField(default=1)
    # Type attendu : full/empty/partial (validation) ou texte libre (Equipment)
    sample_type = models.CharField(max_length=100, blank=True)
    notes      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='+',
    )

    class Meta:
        ordering = ['reference']

    def __str__(self):
        return f'{self.reference} (x{self.quantity})'


SALES_STAGE_CHOICES = [
    ('prospect',        'Prospect'),
    ('opportunity',     'Opportunité'),
    ('quotation_sent',  'Devis envoyé'),
    ('negotiation',     'Négociation'),
    ('contract_signed', 'Contrat signé'),
    ('invoice_issued',  'Facture émise'),
    ('won',             'Gagné'),
    ('lost',            'Perdu'),
]

SALES_PRIORITY_CHOICES = [
    ('low',      'Faible'),
    ('medium',   'Normale'),
    ('high',     'Haute'),
    ('critical', 'Critique'),
]


class ProjectValidation(models.Model):
    """Persisted validation result for a project name."""
    project_name      = models.CharField(max_length=100, unique=True)
    validation_status = models.CharField(
        max_length=16, choices=VALIDATION_STATUS_CHOICES, default='pending', db_index=True,
    )
    validated_at  = models.DateTimeField(null=True, blank=True)
    validated_by  = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='+',
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='+',
    )
    result     = models.JSONField(default=dict)
    # ── Sales fields ──────────────────────────────────────────────────────────
    sales_reference    = models.CharField(max_length=40, unique=True, null=True, blank=True)
    accounting_client  = models.ForeignKey(
        'accounting.Tiers', null=True, blank=True, on_delete=models.PROTECT,
        related_name='sales_projects',
    )
    customer_name    = models.CharField(max_length=200, blank=True)
    customer_contact = models.CharField(max_length=200, blank=True)
    customer_email   = models.EmailField(blank=True)
    customer_phone   = models.CharField(max_length=50, blank=True)
    sales_stage      = models.CharField(max_length=20, choices=SALES_STAGE_CHOICES, default='prospect', db_index=True)
    sales_priority   = models.CharField(max_length=20, choices=SALES_PRIORITY_CHOICES, default='medium')
    sales_owner      = models.ForeignKey(
        'hr.Employee', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='sales_projects',
    )
    estimated_value      = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    probability          = models.PositiveSmallIntegerField(default=0)
    expected_close_date  = models.DateField(null=True, blank=True)
    actual_close_date    = models.DateField(null=True, blank=True)
    delivery_target_date = models.DateField(null=True, blank=True)
    next_action          = models.CharField(max_length=255, blank=True)
    next_action_date     = models.DateField(null=True, blank=True)
    sales_notes          = models.TextField(blank=True)
    # ─────────────────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'Validation {self.project_name}: {self.validation_status}'


# ── BOM Items (Bill of Materials lines) ───────────────────────────────────────

BOM_UNIT_CHOICES = [
    ('pcs', 'Pièces'),
    ('m',   'Mètre'),
    ('m2',  'Mètre²'),
    ('kg',  'Kilogramme'),
    ('g',   'Gramme'),
    ('l',   'Litre'),
    ('mm',  'Millimètre'),
]


class BomItem(models.Model):
    """Ligne de nomenclature (BOM) rattachée à un échantillon."""
    sample      = models.ForeignKey(Sample, on_delete=models.CASCADE, related_name='bom_items')
    reference   = models.CharField(max_length=100)
    designation = models.CharField(max_length=200, blank=True)
    quantity    = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    unit        = models.CharField(max_length=10, choices=BOM_UNIT_CHOICES, default='pcs')
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['reference']

    def __str__(self):
        return f"{self.sample.apn} — {self.reference} ×{self.quantity}"


# ── Sales models ──────────────────────────────────────────────────────────────

class ProjectDocument(models.Model):
    project     = models.ForeignKey(ProjectValidation, on_delete=models.CASCADE, related_name='documents')
    file        = models.FileField(upload_to='sales/documents/%Y/%m/')
    file_name   = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.file_name


class SalesRecord(models.Model):
    RECORD_TYPES = [
        ('lead',        'Lead'),
        ('opportunity', 'Opportunity'),
        ('activity',    'Activity'),
        ('document',    'Document'),
    ]
    record_type       = models.CharField(max_length=20, choices=RECORD_TYPES, db_index=True)
    code              = models.CharField(max_length=50, unique=True)
    title             = models.CharField(max_length=255)
    company_name      = models.CharField(max_length=200, blank=True)
    contact_person    = models.CharField(max_length=200, blank=True)
    email             = models.EmailField(blank=True)
    phone             = models.CharField(max_length=50, blank=True)
    industry          = models.CharField(max_length=100, blank=True, db_index=True)
    source            = models.CharField(max_length=50, blank=True)
    status            = models.CharField(max_length=40, default='new', db_index=True)
    value             = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    probability       = models.PositiveSmallIntegerField(default=0)
    assigned_to       = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_sales_records')
    assigned_employee = models.ForeignKey(
        'hr.Employee', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='assigned_sales_records',
    )
    accounting_client = models.ForeignKey(
        'accounting.Tiers', null=True, blank=True, on_delete=models.PROTECT,
        related_name='sales_records',
    )
    lead        = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='converted_records')
    opportunity = models.ForeignKey('self', null=True, blank=True, on_delete=models.PROTECT, related_name='downstream_records')
    project     = models.ForeignKey(ProjectValidation, null=True, blank=True, on_delete=models.PROTECT, related_name='sales_records')
    due_date              = models.DateField(null=True, blank=True)
    start_date            = models.DateField(null=True, blank=True)
    end_date              = models.DateField(null=True, blank=True)
    last_interaction_at   = models.DateTimeField(null=True, blank=True)
    completed_at          = models.DateTimeField(null=True, blank=True)
    priority              = models.CharField(max_length=20, default='medium')
    metadata              = models.JSONField(default=dict, blank=True)
    notes                 = models.TextField(blank=True)
    attachment            = models.FileField(upload_to='sales/%Y/%m/', null=True, blank=True)
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='created_sales_records')
    updated_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='updated_sales_records')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes  = [models.Index(fields=['record_type', 'status'])]


class SalesAuditLog(models.Model):
    record     = models.ForeignKey(SalesRecord, on_delete=models.CASCADE, related_name='history')
    actor      = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    action     = models.CharField(max_length=50)
    changes    = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class SalesProjectHistory(models.Model):
    project    = models.ForeignKey(ProjectValidation, on_delete=models.CASCADE, related_name='sales_history')
    actor      = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    old_status = models.CharField(max_length=30, blank=True)
    new_status = models.CharField(max_length=30)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class SalesTarget(models.Model):
    PERIOD_MONTH   = 'month'
    PERIOD_QUARTER = 'quarter'
    PERIOD_YEAR    = 'year'
    PERIOD_CUSTOM  = 'custom'
    PERIOD_CHOICES = [
        (PERIOD_MONTH,   'Month'),
        (PERIOD_QUARTER, 'Quarter'),
        (PERIOD_YEAR,    'Year'),
        (PERIOD_CUSTOM,  'Custom'),
    ]

    employee    = models.ForeignKey('hr.Employee', on_delete=models.CASCADE, related_name='sales_targets')
    period_type = models.CharField(max_length=20, choices=PERIOD_CHOICES, default=PERIOD_MONTH)
    year        = models.PositiveSmallIntegerField(default=2026)
    month       = models.PositiveSmallIntegerField(null=True, blank=True)
    quarter     = models.PositiveSmallIntegerField(null=True, blank=True)
    start_date  = models.DateField(null=True, blank=True)
    end_date    = models.DateField(null=True, blank=True)
    target_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales_targets_created')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales_targets_updated')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', 'month', 'quarter', 'employee__last_name', 'employee__first_name']
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'period_type', 'year', 'month', 'quarter', 'start_date', 'end_date'],
                name='unique_sales_target_period_per_employee',
            ),
        ]
