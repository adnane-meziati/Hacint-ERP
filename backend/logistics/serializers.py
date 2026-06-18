from rest_framework import serializers

from .models import (
    Vehicle,
    Driver,
    DeliveryOrder,
    DeliveryOrderLine,
    Shipment,
    ShipmentLine,
    WarehouseTransfer,
    WarehouseTransferLine,
    LogisticsTask,
    LogisticsTaskComment,
    LogisticsTaskAttachment,
    LogisticsTaskHistory,
    LogisticsNotification,
    LogisticsReport,
)


class VehicleSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True,
    )

    class Meta:
        model = Vehicle
        fields = [
            'id',
            'registration',
            'vehicle_type',
            'capacity',
            'status',
            'status_display',
            'service_date',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class DriverSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source='employee.full_name',
        read_only=True,
    )
    employee_number = serializers.CharField(
        source='employee.employee_number',
        read_only=True,
    )
    department_name = serializers.CharField(
        source='employee.department.name',
        read_only=True,
        default=None,
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True,
    )

    class Meta:
        model = Driver
        fields = [
            'id',
            'employee',
            'employee_name',
            'employee_number',
            'department_name',
            'license_number',
            'license_expiry_date',
            'status',
            'status_display',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_employee(self, employee):
        department_name = (
            employee.department.name.strip().lower()
            if employee.department
            else ''
        )

        if department_name != 'transport services':
            raise serializers.ValidationError(
                "Seuls les employés du département Transport Services "
                "peuvent être enregistrés comme chauffeurs."
            )

        return employee


class DeliveryOrderLineSerializer(serializers.ModelSerializer):
    article_name = serializers.CharField(
        source='article.name',
        read_only=True,
    )

    class Meta:
        model = DeliveryOrderLine
        fields = [
            'id',
            'delivery_order',
            'article',
            'article_name',
            'product_name',
            'quantity',
            'notes',
        ]
        read_only_fields = ['delivery_order']


class DeliveryOrderSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True,
    )
    lines = DeliveryOrderLineSerializer(many=True, required=False)

    class Meta:
        model = DeliveryOrder
        fields = [
            'id',
            'delivery_number',
            'delivery_date',
            'customer',
            'delivery_address',
            'status',
            'status_display',
            'notes',
            'created_by',
            'created_at',
            'updated_at',
            'lines',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def validate(self, data):
        vehicle = data.get('vehicle', getattr(self.instance, 'vehicle', None))
        driver = data.get('driver', getattr(self.instance, 'driver', None))
        active_statuses = ['preparation', 'shipped', 'in_delivery']

        if vehicle:
            shipments = vehicle.shipments.filter(status__in=active_statuses)
            transfers = vehicle.warehouse_transfers.filter(
                status__in=['draft', 'pending_approval', 'approved', 'in_transit'],
            )
            tasks = vehicle.logistics_tasks.filter(
                status__in=['todo', 'in_progress', 'waiting'],
            )
            if self.instance:
                shipments = shipments.exclude(pk=self.instance.pk)
            if shipments.exists() or transfers.exists() or tasks.exists():
                raise serializers.ValidationError({
                    'vehicle': 'Ce véhicule est déjà indisponible.',
                })

        if driver:
            shipments = driver.shipments.filter(status__in=active_statuses)
            if self.instance:
                shipments = shipments.exclude(pk=self.instance.pk)
            if shipments.exists():
                raise serializers.ValidationError({
                    'driver': 'Ce chauffeur est déjà affecté.',
                })

        return data

    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])
        delivery_order = DeliveryOrder.objects.create(**validated_data)

        for line_data in lines_data:
            DeliveryOrderLine.objects.create(
                delivery_order=delivery_order,
                **line_data,
            )

        return delivery_order

    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)

        for attribute, value in validated_data.items():
            setattr(instance, attribute, value)

        instance.save()

        if lines_data is not None:
            instance.lines.all().delete()

            for line_data in lines_data:
                DeliveryOrderLine.objects.create(
                    delivery_order=instance,
                    **line_data,
                )

        return instance


class ShipmentLineSerializer(serializers.ModelSerializer):
    article_name = serializers.CharField(
        source='article.name',
        read_only=True,
    )

    class Meta:
        model = ShipmentLine
        fields = [
            'id',
            'shipment',
            'article',
            'article_name',
            'product_name',
            'quantity',
            'notes',
        ]
        read_only_fields = ['shipment']


class ShipmentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True,
    )
    delivery_number = serializers.CharField(
        source='delivery_order.delivery_number',
        read_only=True,
        default=None,
    )
    vehicle_registration = serializers.CharField(
        source='vehicle.registration',
        read_only=True,
        default=None,
    )
    driver_name = serializers.CharField(
        source='driver.employee.full_name',
        read_only=True,
        default=None,
    )
    lines = ShipmentLineSerializer(many=True, required=False)

    class Meta:
        model = Shipment
        fields = [
            'id',
            'tracking_number',
            'delivery_order',
            'delivery_number',
            'shipment_date',
            'vehicle',
            'vehicle_registration',
            'driver',
            'driver_name',
            'status',
            'status_display',
            'notes',
            'created_by',
            'created_at',
            'updated_at',
            'lines',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])
        shipment = Shipment.objects.create(**validated_data)

        for line_data in lines_data:
            ShipmentLine.objects.create(
                shipment=shipment,
                **line_data,
            )

        return shipment

    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)

        for attribute, value in validated_data.items():
            setattr(instance, attribute, value)

        instance.save()

        if lines_data is not None:
            instance.lines.all().delete()

            for line_data in lines_data:
                ShipmentLine.objects.create(
                    shipment=instance,
                    **line_data,
                )

        return instance


class WarehouseTransferLineSerializer(serializers.ModelSerializer):
    article_name = serializers.CharField(
        source='article.name',
        read_only=True,
    )

    class Meta:
        model = WarehouseTransferLine
        fields = [
            'id',
            'transfer',
            'article',
            'article_name',
            'quantity',
            'notes',
        ]
        read_only_fields = ['transfer']


class WarehouseTransferSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True,
    )
    source_warehouse_name = serializers.CharField(
        source='source_warehouse.nom',
        read_only=True,
    )
    destination_warehouse_name = serializers.CharField(
        source='destination_warehouse.nom',
        read_only=True,
        default=None,
    )
    requested_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    transport_type_display = serializers.CharField(
        source='get_transport_type_display',
        read_only=True,
    )
    vehicle_registration = serializers.CharField(
        source='vehicle.registration',
        read_only=True,
        default=None,
    )
    driver_name = serializers.CharField(
        source='driver.employee.full_name',
        read_only=True,
        default=None,
    )
    lines = WarehouseTransferLineSerializer(
        many=True,
        required=False,
    )

    class Meta:
        model = WarehouseTransfer
        fields = [
            'id',
            'transfer_number',
            'source_warehouse',
            'source_warehouse_name',
            'destination_warehouse',
            'destination_warehouse_name',
            'destination_type',
            'external_destination',
            'external_client',
            'external_site',
            'external_agency',
            'external_address',
            'transport_type',
            'transport_type_display',
            'vehicle',
            'vehicle_registration',
            'driver',
            'driver_name',
            'service_company',
            'service_name',
            'service_contact',
            'service_phone',
            'service_reference',
            'service_details',
            'requested_date',
            'status',
            'status_display',
            'notes',
            'requested_by',
            'requested_by_name',
            'approved_by',
            'approved_by_name',
            'approved_at',
            'created_at',
            'updated_at',
            'lines',
        ]
        read_only_fields = [
            'requested_by',
            'approved_by',
            'approved_at',
            'created_at',
            'updated_at',
        ]

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return (
                obj.requested_by.get_full_name()
                or obj.requested_by.username
            )
        return None

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return (
                obj.approved_by.get_full_name()
                or obj.approved_by.username
            )
        return None

    def validate(self, data):
        source = data.get(
            'source_warehouse',
            getattr(self.instance, 'source_warehouse', None),
        )
        destination = data.get(
            'destination_warehouse',
            getattr(self.instance, 'destination_warehouse', None),
        )
        destination_type = data.get(
            'destination_type',
            getattr(
                self.instance,
                'destination_type',
                WarehouseTransfer.DestinationType.WAREHOUSE,
            ),
        )
        transport_type = data.get(
            'transport_type',
            getattr(
                self.instance,
                'transport_type',
                WarehouseTransfer.TransportType.OWN_VEHICLE,
            ),
        )
        vehicle = data.get('vehicle', getattr(self.instance, 'vehicle', None))
        driver = data.get('driver', getattr(self.instance, 'driver', None))
        if (
            destination_type == WarehouseTransfer.DestinationType.WAREHOUSE
            and not destination
        ):
            raise serializers.ValidationError({
                'destination_warehouse': 'Sélectionnez un entrepôt de destination.',
            })

        if destination_type == WarehouseTransfer.DestinationType.EXTERNAL:
            required_fields = {
                'external_client': 'Le client est obligatoire.',
                'external_site': 'Le chantier est obligatoire.',
                'external_agency': "L'agence est obligatoire.",
                'external_address': "L'adresse est obligatoire.",
            }
            errors = {}
            values = {}
            for field, message in required_fields.items():
                value = data.get(field, getattr(self.instance, field, ''))
                values[field] = str(value).strip()
                if not values[field]:
                    errors[field] = message

            if errors:
                raise serializers.ValidationError(errors)

            data['destination_warehouse'] = None
            data['external_destination'] = (
                f"{values['external_client']} - {values['external_site']} - "
                f"{values['external_agency']} - {values['external_address']}"
            )
        else:
            data['external_destination'] = ''
            data['external_client'] = ''
            data['external_site'] = ''
            data['external_agency'] = ''
            data['external_address'] = ''

        if transport_type == WarehouseTransfer.TransportType.OWN_VEHICLE:
            if not vehicle:
                raise serializers.ValidationError({
                    'vehicle': 'Sélectionnez un véhicule disponible.',
                })
            if not driver:
                raise serializers.ValidationError({
                    'driver': 'Sélectionnez un chauffeur disponible.',
                })
            busy = vehicle.shipments.filter(
                status__in=['preparation', 'shipped', 'in_delivery'],
            )
            busy_transfers = vehicle.warehouse_transfers.filter(
                status__in=['draft', 'pending_approval', 'approved', 'in_transit'],
            )
            busy_tasks = vehicle.logistics_tasks.filter(
                status__in=['todo', 'in_progress', 'waiting'],
            )
            if self.instance:
                busy_transfers = busy_transfers.exclude(pk=self.instance.pk)
            if busy.exists() or busy_transfers.exists() or busy_tasks.exists():
                raise serializers.ValidationError({
                    'vehicle': 'Ce véhicule est déjà indisponible.',
                })
            busy_driver_shipments = driver.shipments.filter(
                status__in=['preparation', 'shipped', 'in_delivery'],
            )
            busy_driver_transfers = driver.warehouse_transfers.filter(
                status__in=['draft', 'pending_approval', 'approved', 'in_transit'],
            )
            if self.instance:
                busy_driver_transfers = busy_driver_transfers.exclude(
                    pk=self.instance.pk,
                )
            if (
                busy_driver_shipments.exists()
                or busy_driver_transfers.exists()
                or driver.employee.logistics_tasks.filter(
                    status__in=['todo', 'in_progress', 'waiting'],
                ).exists()
            ):
                raise serializers.ValidationError({
                    'driver': 'Ce chauffeur est déjà indisponible.',
                })
            data['service_company'] = ''
            data['service_name'] = ''
            data['service_contact'] = ''
            data['service_phone'] = ''
            data['service_reference'] = ''
            data['service_details'] = ''
        else:
            required_service_fields = {
                'service_company': 'La société de transport est obligatoire.',
                'service_name': 'Le service est obligatoire.',
                'service_contact': 'Le contact est obligatoire.',
                'service_phone': 'Le téléphone est obligatoire.',
                'service_reference': 'La référence est obligatoire.',
            }
            errors = {}
            values = {}
            for field, message in required_service_fields.items():
                value = data.get(field, getattr(self.instance, field, ''))
                values[field] = str(value).strip()
                if not values[field]:
                    errors[field] = message
            if errors:
                raise serializers.ValidationError(errors)
            data['vehicle'] = None
            data['driver'] = None
            data['service_details'] = (
                f"{values['service_name']} - {values['service_contact']} - "
                f"{values['service_phone']} - {values['service_reference']}"
            )

        if source and destination and source == destination:
            raise serializers.ValidationError(
                "L'entrepôt source et l'entrepôt destination "
                "doivent être différents."
            )

        return data

    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])
        transfer = WarehouseTransfer.objects.create(**validated_data)

        for line_data in lines_data:
            WarehouseTransferLine.objects.create(
                transfer=transfer,
                **line_data,
            )

        return transfer

    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)

        for attribute, value in validated_data.items():
            setattr(instance, attribute, value)

        instance.save()

        if lines_data is not None:
            instance.lines.all().delete()

            for line_data in lines_data:
                WarehouseTransferLine.objects.create(
                    transfer=instance,
                    **line_data,
                )

        return instance


class LogisticsTaskCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = LogisticsTaskComment
        fields = [
            'id',
            'task',
            'author',
            'author_name',
            'comment',
            'created_at',
        ]
        read_only_fields = ['author', 'created_at']

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.username
        return 'Utilisateur supprimé'


class LogisticsTaskAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = LogisticsTaskAttachment
        fields = [
            'id',
            'task',
            'file',
            'file_name',
            'file_url',
            'uploaded_by',
            'uploaded_by_name',
            'uploaded_at',
        ]
        read_only_fields = ['uploaded_by', 'uploaded_at']

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return (
                obj.uploaded_by.get_full_name()
                or obj.uploaded_by.username
            )
        return 'Utilisateur supprimé'

    def get_file_name(self, obj):
        if not obj.file:
            return None
        return obj.file.name.rsplit('/', 1)[-1]

    def get_file_url(self, obj):
        if not obj.file:
            return None

        request = self.context.get('request')
        url = obj.file.url

        if request:
            return request.build_absolute_uri(url)

        return url


class LogisticsTaskHistorySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = LogisticsTaskHistory
        fields = [
            'id',
            'task',
            'actor',
            'actor_name',
            'action',
            'old_value',
            'new_value',
            'created_at',
        ]
        read_only_fields = [
            'task',
            'actor',
            'action',
            'old_value',
            'new_value',
            'created_at',
        ]

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name() or obj.actor.username
        return 'Système'


class LogisticsTaskSerializer(serializers.ModelSerializer):
    priority_display = serializers.CharField(
        source='get_priority_display',
        read_only=True,
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True,
    )
    assigned_role_display = serializers.CharField(
        source='get_assigned_role_display',
        read_only=True,
    )
    assigned_employee_names = serializers.SerializerMethodField()
    assigned_employee_details = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    delivery_number = serializers.CharField(
        source='delivery_order.delivery_number',
        read_only=True,
        default=None,
    )
    shipment_tracking_number = serializers.CharField(
        source='shipment.tracking_number',
        read_only=True,
        default=None,
    )
    transfer_number = serializers.CharField(
        source='transfer.transfer_number',
        read_only=True,
        default=None,
    )
    comments = LogisticsTaskCommentSerializer(
        many=True,
        read_only=True,
    )
    attachments = LogisticsTaskAttachmentSerializer(
        many=True,
        read_only=True,
    )
    history = LogisticsTaskHistorySerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = LogisticsTask
        fields = [
            'id',
            'title',
            'description',
            'priority',
            'priority_display',
            'due_date',
            'status',
            'status_display',
            'assigned_employees',
            'assigned_employee_names',
            'assigned_employee_details',
            'vehicle',
            'assigned_role',
            'assigned_role_display',
            'other_role_description',
            'delivery_order',
            'delivery_number',
            'shipment',
            'shipment_tracking_number',
            'transfer',
            'transfer_number',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            'comments',
            'attachments',
            'history',
        ]
        read_only_fields = [
            'created_by',
            'created_at',
            'updated_at',
        ]

    def get_assigned_employee_names(self, obj):
        return [
            employee.full_name
            for employee in obj.assigned_employees.all()
        ]

    def get_assigned_employee_details(self, obj):
        return [
            {
                'id': employee.id,
                'name': employee.full_name,
                'employee_number': employee.employee_number,
                'department': (
                    employee.department.name
                    if employee.department
                    else 'Sans département'
                ),
                'user_id': employee.user_id,
            }
            for employee in obj.assigned_employees.select_related(
                'department',
                'user',
            ).all()
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return 'Utilisateur supprimé'

    def validate(self, data):
        assigned_role = data.get(
            'assigned_role',
            getattr(self.instance, 'assigned_role', None),
        )
        other_role_description = data.get(
            'other_role_description',
            getattr(self.instance, 'other_role_description', ''),
        )

        if (
            assigned_role == LogisticsTask.AssignedRole.OTHER
            and not str(other_role_description).strip()
        ):
            raise serializers.ValidationError({
                'other_role_description': (
                    "La description du rôle est obligatoire "
                    "lorsque le rôle est Autre."
                ),
            })

        if assigned_role != LogisticsTask.AssignedRole.OTHER:
            data['other_role_description'] = ''

        assigned_employees = data.get('assigned_employees')
        if assigned_employees is not None:
            invalid = [
                employee.full_name
                for employee in assigned_employees
                if not employee.department
                or not any(
                    keyword in employee.department.name.strip().lower()
                    for keyword in ('logistique', 'logistics', 'transport services')
                )
            ]
            if invalid:
                raise serializers.ValidationError({
                    'assigned_employees': (
                        'Seuls les employés des départements Logistique '
                        'ou Transport Services peuvent être assignés. '
                        f"Employés invalides : {', '.join(invalid)}"
                    ),
                })

            active_statuses = ['todo', 'in_progress', 'waiting']
            unavailable = []
            for employee in assigned_employees:
                tasks = employee.logistics_tasks.filter(status__in=active_statuses)
                if self.instance:
                    tasks = tasks.exclude(pk=self.instance.pk)
                driver = getattr(employee, 'logistics_driver_profile', None)
                driver_busy = False
                if driver:
                    driver_busy = (
                        driver.shipments.filter(
                            status__in=['preparation', 'shipped', 'in_delivery'],
                        ).exists()
                        or driver.warehouse_transfers.filter(
                            status__in=[
                                'draft',
                                'pending_approval',
                                'approved',
                                'in_transit',
                            ],
                        ).exists()
                    )

                if tasks.exists() or driver_busy:
                    unavailable.append(employee.full_name)
            if unavailable:
                raise serializers.ValidationError({
                    'assigned_employees': (
                        'Employés déjà affectés à une tâche active : '
                        + ', '.join(unavailable)
                    ),
                })

        vehicle = data.get('vehicle', getattr(self.instance, 'vehicle', None))
        if vehicle:
            tasks = vehicle.logistics_tasks.filter(
                status__in=['todo', 'in_progress', 'waiting'],
            )
            transfers = vehicle.warehouse_transfers.filter(
                status__in=['draft', 'pending_approval', 'approved', 'in_transit'],
            )
            shipments = vehicle.shipments.filter(
                status__in=['preparation', 'shipped', 'in_delivery'],
            )
            if self.instance:
                tasks = tasks.exclude(pk=self.instance.pk)
            if tasks.exists() or transfers.exists() or shipments.exists():
                raise serializers.ValidationError({
                    'vehicle': 'Ce véhicule est déjà indisponible.',
                })

        return data


class LogisticsReportSerializer(serializers.ModelSerializer):
    report_type_display = serializers.CharField(
        source='get_report_type_display',
        read_only=True,
    )
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LogisticsReport
        fields = [
            'id',
            'title',
            'report_type',
            'report_type_display',
            'report_date',
            'content',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        return obj.created_by.get_full_name() or obj.created_by.username


class LogisticsNotificationSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.CharField(
        source='get_notification_type_display',
        read_only=True,
    )
    recipient_name = serializers.SerializerMethodField()
    employee_name = serializers.CharField(
        source='employee.full_name',
        read_only=True,
        default=None,
    )
    task_title = serializers.CharField(
        source='task.title',
        read_only=True,
        default=None,
    )

    class Meta:
        model = LogisticsNotification
        fields = [
            'id',
            'recipient',
            'recipient_name',
            'employee',
            'employee_name',
            'task',
            'task_title',
            'notification_type',
            'notification_type_display',
            'title',
            'message',
            'is_read',
            'created_at',
            'read_at',
        ]
        read_only_fields = [
            'recipient',
            'employee',
            'task',
            'notification_type',
            'title',
            'message',
            'created_at',
            'read_at',
        ]

    def get_recipient_name(self, obj):
        return (
            obj.recipient.get_full_name()
            or obj.recipient.username
        )
