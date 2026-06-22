from django.conf import settings
from django.db import models
from django.utils import timezone


PROJECT_STATUSES = [
    ('En attente', 'En attente'),
    ('En cours', 'En cours'),
    ('Suspendu', 'Suspendu'),
    ('Terminé', 'Terminé'),
    ('Annulé', 'Annulé'),
]
TASK_STATUSES = [
    ('À faire', 'À faire'),
    ('En cours', 'En cours'),
    ('Bloquée', 'Bloquée'),
    ('Terminée', 'Terminée'),
]
PRIORITIES = [
    ('Critique', 'Critique'),
    ('Haute', 'Haute'),
    ('Moyenne', 'Moyenne'),
    ('Basse', 'Basse'),
]


class InstallationBase(models.Model):
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True, default='')

    class Meta:
        abstract = True


class InstallationProject(InstallationBase):
    name = models.CharField(max_length=180, unique=True)
    client = models.CharField(max_length=160)
    address = models.CharField(max_length=255, blank=True, default='')
    start_date = models.DateField(null=True, blank=True)
    planned_end_date = models.DateField(null=True, blank=True)
    supervisor = models.CharField(max_length=160, blank=True, default='')
    status = models.CharField(max_length=40, choices=PROJECT_STATUSES, default='En attente')
    description = models.TextField(blank=True, default='')
    budget = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    progress = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-id']

    @property
    def products_count(self):
        return self.products.count()

    @property
    def tasks_count(self):
        return self.tasks.count()

    @property
    def finished_tasks_count(self):
        return self.tasks.filter(status='Terminée').count()

    def __str__(self):
        return self.name


class InstallationProduct(InstallationBase):
    project = models.ForeignKey(InstallationProject, on_delete=models.CASCADE, related_name='products')
    reference = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=180, blank=True, default='')
    description = models.TextField()
    date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=60, blank=True, default='Actif')
    image = models.ImageField(upload_to='installation/products/images/', null=True, blank=True)
    file = models.FileField(upload_to='installation/products/files/', null=True, blank=True)

    class Meta:
        ordering = ['-id']

    def __str__(self):
        return self.reference


class InstallationTask(InstallationBase):
    project = models.ForeignKey(InstallationProject, on_delete=models.CASCADE, related_name='tasks')
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True, default='')
    status = models.CharField(max_length=40, choices=TASK_STATUSES, default='À faire')
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=40, choices=PRIORITIES, default='Moyenne')
    comment = models.TextField(blank=True, default='')
    attachment = models.FileField(upload_to='installation/tasks/', null=True, blank=True)

    class Meta:
        ordering = ['due_date', '-id']

    def __str__(self):
        return self.name


class InstallationDocument(InstallationBase):
    project = models.ForeignKey(InstallationProject, null=True, blank=True, on_delete=models.SET_NULL, related_name='documents')
    title = models.CharField(max_length=180)
    document_type = models.CharField(max_length=80, blank=True, default='Document')
    file = models.FileField(upload_to='installation/documents/', null=True, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=60, blank=True, default='Valide')

    class Meta:
        ordering = ['-id']

    def __str__(self):
        return self.title


class InstallationReport(InstallationBase):
    project = models.ForeignKey(InstallationProject, null=True, blank=True, on_delete=models.SET_NULL, related_name='reports')
    reference = models.CharField(max_length=80, unique=True)
    title = models.CharField(max_length=180)
    report_type = models.CharField(max_length=80, blank=True, default='Rapport projet')
    summary = models.TextField(blank=True, default='')
    status = models.CharField(max_length=60, blank=True, default='Généré')
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ['-id']

    def __str__(self):
        return self.reference


class InstallationNotification(InstallationBase):
    project = models.ForeignKey(InstallationProject, null=True, blank=True, on_delete=models.SET_NULL, related_name='notifications')
    title = models.CharField(max_length=180)
    message = models.TextField(blank=True, default='')
    level = models.CharField(max_length=40, blank=True, default='Info')
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-id']

    def __str__(self):
        return self.title
