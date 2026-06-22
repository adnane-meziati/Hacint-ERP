from django.contrib.auth.models import User
from django.db import models


class PurchaseRequest(models.Model):
    class ItemType(models.TextChoices):
        PRODUCT = 'product', 'Produit'
        SERVICE = 'service', 'Service'

    class Priority(models.TextChoices):
        LOW    = 'low',    'Faible'
        MEDIUM = 'medium', 'Moyenne'
        HIGH   = 'high',   'Haute'
        URGENT = 'urgent', 'Urgent'

    class Status(models.TextChoices):
        PENDING  = 'pending',  'En attente'
        APPROVED = 'approved', 'Approuvé'
        REJECTED = 'rejected', 'Rejeté'
        ORDERED  = 'ordered',  'Commandé'
        RECEIVED = 'received', 'Reçu'

    class Module(models.TextChoices):
        PRODUCTION   = 'production',   'Production'
        STORAGE      = 'storage',      'Stockage'
        ACCOUNTING   = 'accounting',   'Comptabilité'
        HR           = 'hr',           'RH'
        LOGISTICS    = 'logistics',    'Logistique'
        INSTALLATION = 'installation', 'Installation'
        SALES        = 'sales',        'Ventes'

    title            = models.CharField(max_length=255)
    item_type        = models.CharField(max_length=10, choices=ItemType.choices, default=ItemType.PRODUCT)
    quantity         = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit             = models.CharField(max_length=30, blank=True, default='pcs')
    priority         = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    module           = models.CharField(max_length=20, choices=Module.choices)
    description      = models.TextField(blank=True)
    invoice          = models.FileField(upload_to='procurement/invoices/', null=True, blank=True)
    estimated_cost   = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status           = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    requested_by     = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchase_requests')
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)
    reviewed_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_purchase_requests')
    reviewed_at      = models.DateTimeField(null=True, blank=True)
    accounting_notes = models.TextField(blank=True)
    po_number        = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.module} — {self.title} ({self.get_status_display()})"
