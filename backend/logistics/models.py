from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class Vehicle(models.Model):
    class VehicleStatus(models.TextChoices):
        AVAILABLE = 'available', 'Disponible'
        IN_USE = 'in_use', 'En utilisation'
        MAINTENANCE = 'maintenance', 'Maintenance'
        INACTIVE = 'inactive', 'Inactif'

    registration = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Immatriculation',
    )
    vehicle_type = models.CharField(max_length=100, verbose_name='Type')
    capacity = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Capacité',
    )
    status = models.CharField(
        max_length=20,
        choices=VehicleStatus.choices,
        default=VehicleStatus.AVAILABLE,
    )
    service_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Date de mise en service',
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['registration']

    def __str__(self):
        return f'{self.registration} - {self.vehicle_type}'


class Driver(models.Model):
    class DriverStatus(models.TextChoices):
        AVAILABLE = 'available', 'Disponible'
        ASSIGNED = 'assigned', 'Affecté'
        ON_LEAVE = 'on_leave', 'En congé'
        INACTIVE = 'inactive', 'Inactif'

    employee = models.OneToOneField(
        'hr.Employee',
        on_delete=models.CASCADE,
        related_name='logistics_driver_profile',
    )
    license_number = models.CharField(
        max_length=100,
        verbose_name='Numéro de permis',
    )
    license_expiry_date = models.DateField(
        verbose_name="Date d'expiration du permis",
    )
    status = models.CharField(
        max_length=20,
        choices=DriverStatus.choices,
        default=DriverStatus.AVAILABLE,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['employee__last_name', 'employee__first_name']

    def __str__(self):
        return f'{self.employee.full_name} - {self.license_number}'


class DeliveryOrder(models.Model):
    class DeliveryStatus(models.TextChoices):
        DRAFT = 'draft', 'Brouillon'
        PENDING = 'pending', 'En attente'
        PREPARATION = 'preparation', 'Préparation'
        READY = 'ready', 'Prêt'
        SHIPPED = 'shipped', 'Expédié'
        DELIVERED = 'delivered', 'Livré'
        CANCELLED = 'cancelled', 'Annulé'

    delivery_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Numéro de livraison',
    )
    delivery_date = models.DateField(verbose_name='Date')
    customer = models.CharField(max_length=200, verbose_name='Client')
    delivery_address = models.TextField(
        verbose_name='Adresse de livraison',
    )
    status = models.CharField(
        max_length=20,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.PENDING,
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='created_delivery_orders',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-delivery_date', '-id']

    def __str__(self):
        return f'{self.delivery_number} - {self.customer}'


class DeliveryOrderLine(models.Model):
    delivery_order = models.ForeignKey(
        DeliveryOrder,
        on_delete=models.CASCADE,
        related_name='lines',
    )
    article = models.ForeignKey(
        'storage.Article',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='delivery_order_lines',
    )
    product_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='Produit',
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Quantité',
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        name = self.article.name if self.article else self.product_name
        return f'{name} x {self.quantity}'


class Shipment(models.Model):
    class ShipmentStatus(models.TextChoices):
        PENDING = 'pending', 'En attente'
        PREPARATION = 'preparation', 'Préparation'
        SHIPPED = 'shipped', 'Expédiée'
        IN_DELIVERY = 'in_delivery', 'En cours de livraison'
        DELIVERED = 'delivered', 'Livrée'
        RETURNED = 'returned', 'Retournée'
        CANCELLED = 'cancelled', 'Annulée'

    tracking_number = models.CharField(
        max_length=80,
        unique=True,
        verbose_name='Numéro de suivi',
    )
    delivery_order = models.ForeignKey(
        DeliveryOrder,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='shipments',
    )
    shipment_date = models.DateField(verbose_name="Date d'expédition")
    vehicle = models.ForeignKey(
        Vehicle,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='shipments',
    )
    driver = models.ForeignKey(
        Driver,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='shipments',
    )
    status = models.CharField(
        max_length=20,
        choices=ShipmentStatus.choices,
        default=ShipmentStatus.PENDING,
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='created_shipments',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-shipment_date', '-id']

    def __str__(self):
        return self.tracking_number


class ShipmentLine(models.Model):
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name='lines',
    )
    article = models.ForeignKey(
        'storage.Article',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='shipment_lines',
    )
    product_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='Produit',
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Quantité',
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        name = self.article.name if self.article else self.product_name
        return f'{name} x {self.quantity}'


class WarehouseTransfer(models.Model):
    class TransportType(models.TextChoices):
        OWN_VEHICLE = 'own_vehicle', 'Véhicule interne'
        SERVICE = 'service', 'Service externe'

    class DestinationType(models.TextChoices):
        WAREHOUSE = 'warehouse', 'Entrepôt'
        EXTERNAL = 'external', 'Destination externe'

    class TransferStatus(models.TextChoices):
        DRAFT = 'draft', 'Brouillon'
        PENDING_APPROVAL = 'pending_approval', "En attente d'approbation"
        APPROVED = 'approved', 'Approuvé'
        IN_TRANSIT = 'in_transit', 'En transit'
        RECEIVED = 'received', 'Reçu'
        CANCELLED = 'cancelled', 'Annulé'
        REJECTED = 'rejected', 'Refusé'

    transfer_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Numéro de transfert',
    )
    source_warehouse = models.ForeignKey(
        'storage.Entrepot',
        on_delete=models.PROTECT,
        related_name='outgoing_logistics_transfers',
        verbose_name='Entrepôt source',
    )
    destination_warehouse = models.ForeignKey(
        'storage.Entrepot',
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='incoming_logistics_transfers',
        verbose_name='Entrepôt destination',
    )
    destination_type = models.CharField(
        max_length=20,
        choices=DestinationType.choices,
        default=DestinationType.WAREHOUSE,
    )
    external_destination = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Destination externe',
    )
    external_client = models.CharField(max_length=200, blank=True, verbose_name='Client externe')
    external_site = models.CharField(max_length=200, blank=True, verbose_name='Chantier')
    external_agency = models.CharField(max_length=200, blank=True, verbose_name='Agence')
    external_address = models.TextField(blank=True, verbose_name='Adresse externe')
    transport_type = models.CharField(
        max_length=20,
        choices=TransportType.choices,
        default=TransportType.OWN_VEHICLE,
    )
    vehicle = models.ForeignKey(
        Vehicle,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='warehouse_transfers',
    )
    driver = models.ForeignKey(
        Driver,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='warehouse_transfers',
    )
    service_company = models.CharField(max_length=200, blank=True)
    service_name = models.CharField(max_length=200, blank=True)
    service_contact = models.CharField(max_length=200, blank=True)
    service_phone = models.CharField(max_length=50, blank=True)
    service_reference = models.CharField(max_length=100, blank=True)
    service_details = models.CharField(max_length=255, blank=True)
    requested_date = models.DateField(verbose_name='Date de demande')
    status = models.CharField(
        max_length=30,
        choices=TransferStatus.choices,
        default=TransferStatus.DRAFT,
    )
    notes = models.TextField(blank=True)
    requested_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='requested_logistics_transfers',
    )
    approved_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='approved_logistics_transfers',
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-requested_date', '-id']

    def __str__(self):
        return self.transfer_number


class WarehouseTransferLine(models.Model):
    transfer = models.ForeignKey(
        WarehouseTransfer,
        on_delete=models.CASCADE,
        related_name='lines',
    )
    article = models.ForeignKey(
        'storage.Article',
        on_delete=models.PROTECT,
        related_name='logistics_transfer_lines',
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Quantité',
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.article} x {self.quantity}'


class LogisticsTask(models.Model):
    class Priority(models.TextChoices):
        LOW = 'low', 'Faible'
        MEDIUM = 'medium', 'Moyenne'
        HIGH = 'high', 'Haute'
        CRITICAL = 'critical', 'Critique'

    class TaskStatus(models.TextChoices):
        TODO = 'todo', 'À faire'
        IN_PROGRESS = 'in_progress', 'En cours'
        WAITING = 'waiting', 'En attente'
        DONE = 'done', 'Terminée'
        CANCELLED = 'cancelled', 'Annulée'

    class AssignedRole(models.TextChoices):
        DRIVER = 'driver', 'Chauffeur'
        WAREHOUSE_OPERATOR = 'warehouse_operator', 'Magasinier'
        LOGISTICS_MANAGER = (
            'logistics_manager',
            'Responsable Logistique',
        )
        ORDER_PREPARER = (
            'order_preparer',
            'Préparateur de Commande',
        )
        SHIPPING_COORDINATOR = (
            'shipping_coordinator',
            "Coordinateur d'Expédition",
        )
        QUALITY_CONTROLLER = (
            'quality_controller',
            'Contrôleur Qualité',
        )
        OTHER = 'other', 'Autre'

    title = models.CharField(max_length=200, verbose_name='Titre')
    description = models.TextField(blank=True)
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    due_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date d'échéance",
    )
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.TODO,
    )
    assigned_employees = models.ManyToManyField(
        'hr.Employee',
        blank=True,
        related_name='logistics_tasks',
        verbose_name='Employés assignés',
    )
    vehicle = models.ForeignKey(
        Vehicle,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='logistics_tasks',
    )
    assigned_role = models.CharField(
        max_length=40,
        choices=AssignedRole.choices,
        default=AssignedRole.WAREHOUSE_OPERATOR,
    )
    other_role_description = models.CharField(
        max_length=255,
        blank=True,
    )
    delivery_order = models.ForeignKey(
        DeliveryOrder,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='tasks',
    )
    shipment = models.ForeignKey(
        Shipment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='tasks',
    )
    transfer = models.ForeignKey(
        WarehouseTransfer,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='tasks',
    )
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='created_logistics_tasks',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['status', 'due_date', '-created_at']

    def __str__(self):
        return self.title


class LogisticsTaskComment(models.Model):
    task = models.ForeignKey(
        LogisticsTask,
        on_delete=models.CASCADE,
        related_name='comments',
    )
    author = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    comment = models.TextField(verbose_name='Commentaire')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Commentaire - {self.task}'


class LogisticsTaskAttachment(models.Model):
    task = models.ForeignKey(
        LogisticsTask,
        on_delete=models.CASCADE,
        related_name='attachments',
    )
    file = models.FileField(upload_to='logistics/tasks/%Y/%m/')
    uploaded_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.file.name


class LogisticsTaskHistory(models.Model):
    task = models.ForeignKey(
        LogisticsTask,
        on_delete=models.CASCADE,
        related_name='history',
    )
    actor = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    action = models.CharField(max_length=100)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Historique de tâche'
        verbose_name_plural = 'Historiques des tâches'

    def __str__(self):
        return f'{self.task} - {self.action}'


class LogisticsNotification(models.Model):
    class NotificationType(models.TextChoices):
        ASSIGNMENT = 'assignment', 'Affectation'
        MODIFICATION = 'modification', 'Modification'
        DEADLINE = 'deadline', "Échéance proche"
        COMPLETED = 'completed', 'Tâche terminée'
        CANCELLED = 'cancelled', 'Tâche annulée'
        COMMENT = 'comment', 'Nouveau commentaire'
        ATTACHMENT = 'attachment', 'Nouvelle pièce jointe'

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='logistics_notifications',
    )
    employee = models.ForeignKey(
        'hr.Employee',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='logistics_notifications',
    )
    task = models.ForeignKey(
        LogisticsTask,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.MODIFICATION,
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['employee', 'is_read']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Notification logistique'
        verbose_name_plural = 'Notifications logistiques'

    def __str__(self):
        return f'{self.title} - {self.recipient.username}'

    def mark_as_read(self):
        if not self.is_read:
            from django.utils import timezone

            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class LogisticsReport(models.Model):
    class ReportType(models.TextChoices):
        DELIVERY = 'delivery', 'Livraison'
        SHIPMENT = 'shipment', 'Expédition'
        TRANSFER = 'transfer', 'Transfert'
        VEHICLE = 'vehicle', 'Véhicule'
        TASK = 'task', 'Tâche'
        INCIDENT = 'incident', 'Incident'
        OTHER = 'other', 'Autre'

    title = models.CharField(max_length=200, verbose_name='Titre')
    report_type = models.CharField(
        max_length=20,
        choices=ReportType.choices,
        default=ReportType.OTHER,
    )
    report_date = models.DateField(default=timezone.now)
    content = models.TextField(verbose_name='Contenu')
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='logistics_reports',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-report_date', '-created_at']

    def __str__(self):
        return self.title
