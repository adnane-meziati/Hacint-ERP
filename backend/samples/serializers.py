import os
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import AuditLog, BomItem, MatrixEntry, ProjectValidation, ProgrammerFile, Sample, SalesAuditLog, SalesRecord


class BomItemSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BomItem
        fields = ['id', 'sample', 'reference', 'designation', 'quantity', 'unit', 'created_at']
        read_only_fields = ['created_at']


class ProgrammerFileSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    uploadedBy = serializers.SerializerMethodField()

    class Meta:
        model = ProgrammerFile
        fields = ['id', 'file_name', 'url', 'uploaded_at', 'uploadedBy']

    def get_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_uploadedBy(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return None


class UserSerializer(serializers.ModelSerializer):
    fullName = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'fullName']

    def get_fullName(self, obj):
        return obj.get_full_name() or obj.username


class SampleListSerializer(serializers.ModelSerializer):
    createdBy = serializers.SerializerMethodField()
    thumbnailUrl = serializers.SerializerMethodField()
    statusDisplay = serializers.CharField(source='get_status_display', read_only=True)
    clientDisplay = serializers.CharField(source='get_client_display', read_only=True)

    connectorFillDisplay = serializers.CharField(source='get_connector_fill_display', read_only=True)
    doneBy = serializers.SerializerMethodField()
    designerStatusDisplay  = serializers.CharField(source='get_designer_status_display', read_only=True)
    pauseReasonDisplay     = serializers.CharField(source='get_pause_reason_display', read_only=True)
    programmerStatusDisplay  = serializers.CharField(source='get_programmer_status_display', read_only=True)
    programmerPauseReasonDisplay = serializers.CharField(source='get_programmer_pause_reason_display', read_only=True)
    programmerDoneBy     = serializers.SerializerMethodField()
    designerLockedBy     = serializers.SerializerMethodField()
    designerLockedById   = serializers.IntegerField(source='designer_locked_by_id', read_only=True)
    programmerLockedBy   = serializers.SerializerMethodField()
    programmerLockedById = serializers.IntegerField(source='programmer_locked_by_id', read_only=True)
    cncStatusDisplay             = serializers.CharField(source='get_cnc_status_display', read_only=True)
    cncPauseReasonDisplay        = serializers.CharField(source='get_cnc_pause_reason_display', read_only=True)
    cncDoneBy                    = serializers.SerializerMethodField()
    cncLockedBy                  = serializers.SerializerMethodField()
    cncLockedById                = serializers.IntegerField(source='cnc_locked_by_id', read_only=True)
    assemblyStatusDisplay        = serializers.CharField(source='get_assembly_status_display', read_only=True)
    assemblyPauseReasonDisplay   = serializers.CharField(source='get_assembly_pause_reason_display', read_only=True)
    assemblyDoneBy               = serializers.SerializerMethodField()
    assemblyLockedBy             = serializers.SerializerMethodField()
    assemblyLockedById           = serializers.IntegerField(source='assembly_locked_by_id', read_only=True)
    qualityStatusDisplay         = serializers.CharField(source='get_quality_status_display', read_only=True)
    qualityPauseReasonDisplay    = serializers.CharField(source='get_quality_pause_reason_display', read_only=True)
    qualityDoneBy                = serializers.SerializerMethodField()
    designFileUrl    = serializers.SerializerMethodField()
    designPdfUrl     = serializers.SerializerMethodField()
    designFileName   = serializers.SerializerMethodField()
    designPdfName    = serializers.SerializerMethodField()
    designUploadedBy = serializers.SerializerMethodField()
    bomFileUrl       = serializers.SerializerMethodField()
    bomFileName      = serializers.SerializerMethodField()
    gcodeFileUrl     = serializers.SerializerMethodField()
    gcodeFileName    = serializers.SerializerMethodField()
    programmerFiles  = ProgrammerFileSerializer(source='programmer_files', many=True, read_only=True)

    class Meta:
        model = Sample
        fields = [
            'id', 'serial_number', 'apn', 'project', 'placement', 'client', 'clientDisplay',
            'status', 'statusDisplay', 'quantity', 'connector_fill', 'connectorFillDisplay',
            'description', 'commentaire',
            'received_date', 'thumbnailUrl', 'createdBy', 'created_at',
            'is_done', 'done_date', 'doneBy',
            'designer_status', 'designerStatusDisplay', 'time_started', 'time_spent_minutes',
            'pause_reason', 'pauseReasonDisplay', 'is_rework',
            'designerLockedBy', 'designerLockedById',
            'programmer_status', 'programmerStatusDisplay',
            'programmer_time_started', 'programmer_time_spent_minutes',
            'programmer_pause_reason', 'programmerPauseReasonDisplay',
            'programmer_done', 'programmer_done_date', 'programmerDoneBy',
            'programmerLockedBy', 'programmerLockedById',
            'is_cnc_rework',
            'cnc_status', 'cncStatusDisplay', 'cnc_time_started', 'cnc_time_spent_minutes',
            'cnc_pause_reason', 'cncPauseReasonDisplay',
            'cnc_done', 'cnc_done_date', 'cncDoneBy',
            'cncLockedBy', 'cncLockedById',
            'cnc_produced_count',
            'cnc_active_workers',
            'is_assembly_rework',
            'assembly_status', 'assemblyStatusDisplay',
            'assembly_time_started', 'assembly_time_spent_minutes',
            'assembly_pause_reason', 'assemblyPauseReasonDisplay',
            'assembly_done', 'assembly_done_date', 'assemblyDoneBy',
            'assemblyLockedBy', 'assemblyLockedById',
            'assembly_produced_count',
            'assembly_active_workers',
            'is_quality_rework',
            'quality_status', 'qualityStatusDisplay',
            'quality_time_started', 'quality_time_spent_minutes',
            'quality_pause_reason', 'qualityPauseReasonDisplay',
            'quality_done', 'quality_done_date', 'qualityDoneBy',
            'quality_active_workers',
            'designFileUrl', 'designPdfUrl', 'designFileName', 'designPdfName',
            'design_uploaded_at', 'designUploadedBy',
            'bomFileUrl', 'bomFileName', 'bom_uploaded_at',
            'gcodeFileUrl', 'gcodeFileName', 'gcode_uploaded_at',
            'programmerFiles',
        ]

    def get_doneBy(self, obj):
        if obj.done_by:
            return obj.done_by.get_full_name() or obj.done_by.username
        return None

    def get_programmerDoneBy(self, obj):
        if obj.programmer_done_by:
            return obj.programmer_done_by.get_full_name() or obj.programmer_done_by.username
        return None

    def get_designerLockedBy(self, obj):
        if obj.designer_locked_by:
            return obj.designer_locked_by.get_full_name() or obj.designer_locked_by.username
        return None

    def get_programmerLockedBy(self, obj):
        if obj.programmer_locked_by:
            return obj.programmer_locked_by.get_full_name() or obj.programmer_locked_by.username
        return None

    def get_cncDoneBy(self, obj):
        if obj.cnc_done_by:
            return obj.cnc_done_by.get_full_name() or obj.cnc_done_by.username
        return None

    def get_cncLockedBy(self, obj):
        if obj.cnc_locked_by:
            return obj.cnc_locked_by.get_full_name() or obj.cnc_locked_by.username
        return None

    def get_assemblyDoneBy(self, obj):
        if obj.assembly_done_by:
            return obj.assembly_done_by.get_full_name() or obj.assembly_done_by.username
        return None

    def get_assemblyLockedBy(self, obj):
        if obj.assembly_locked_by:
            return obj.assembly_locked_by.get_full_name() or obj.assembly_locked_by.username
        return None

    def get_qualityDoneBy(self, obj):
        if obj.quality_done_by:
            return obj.quality_done_by.get_full_name() or obj.quality_done_by.username
        return None

    def get_createdBy(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_thumbnailUrl(self, obj):
        request = self.context.get('request')
        if obj.thumbnail and request:
            return request.build_absolute_uri(obj.thumbnail.url)
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_designFileUrl(self, obj):
        request = self.context.get('request')
        if obj.design_file and request:
            return request.build_absolute_uri(obj.design_file.url)
        return None

    def get_designPdfUrl(self, obj):
        request = self.context.get('request')
        if obj.design_pdf and request:
            return request.build_absolute_uri(obj.design_pdf.url)
        return None

    def get_designFileName(self, obj):
        return os.path.basename(obj.design_file.name) if obj.design_file else None

    def get_designPdfName(self, obj):
        return os.path.basename(obj.design_pdf.name) if obj.design_pdf else None

    def get_bomFileUrl(self, obj):
        request = self.context.get('request')
        if obj.bom_pdf and request:
            return request.build_absolute_uri(obj.bom_pdf.url)
        return None

    def get_bomFileName(self, obj):
        return os.path.basename(obj.bom_pdf.name) if obj.bom_pdf else None

    def get_designUploadedBy(self, obj):
        if obj.design_uploaded_by:
            return obj.design_uploaded_by.get_full_name() or obj.design_uploaded_by.username
        return None

    def get_gcodeFileUrl(self, obj):
        request = self.context.get('request')
        if obj.gcode_file and request:
            return request.build_absolute_uri(obj.gcode_file.url)
        return None

    def get_gcodeFileName(self, obj):
        return os.path.basename(obj.gcode_file.name) if obj.gcode_file else None


class SampleDetailSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    imageUrl = serializers.SerializerMethodField()
    thumbnailUrl = serializers.SerializerMethodField()
    statusDisplay = serializers.CharField(source='get_status_display', read_only=True)
    clientDisplay = serializers.CharField(source='get_client_display', read_only=True)
    connectorFillDisplay         = serializers.CharField(source='get_connector_fill_display', read_only=True)
    designerStatusDisplay        = serializers.CharField(source='get_designer_status_display', read_only=True)
    pauseReasonDisplay           = serializers.CharField(source='get_pause_reason_display', read_only=True)
    programmerStatusDisplay      = serializers.CharField(source='get_programmer_status_display', read_only=True)
    programmerPauseReasonDisplay = serializers.CharField(source='get_programmer_pause_reason_display', read_only=True)
    programmerDoneBy             = serializers.SerializerMethodField()
    designerLockedBy             = serializers.SerializerMethodField()
    designerLockedById           = serializers.IntegerField(source='designer_locked_by_id', read_only=True)
    programmerLockedBy           = serializers.SerializerMethodField()
    programmerLockedById         = serializers.IntegerField(source='programmer_locked_by_id', read_only=True)
    cncStatusDisplay             = serializers.CharField(source='get_cnc_status_display', read_only=True)
    cncPauseReasonDisplay        = serializers.CharField(source='get_cnc_pause_reason_display', read_only=True)
    cncDoneBy                    = serializers.SerializerMethodField()
    cncLockedBy                  = serializers.SerializerMethodField()
    cncLockedById                = serializers.IntegerField(source='cnc_locked_by_id', read_only=True)
    assemblyStatusDisplay        = serializers.CharField(source='get_assembly_status_display', read_only=True)
    assemblyPauseReasonDisplay   = serializers.CharField(source='get_assembly_pause_reason_display', read_only=True)
    assemblyDoneBy               = serializers.SerializerMethodField()
    assemblyLockedBy             = serializers.SerializerMethodField()
    assemblyLockedById           = serializers.IntegerField(source='assembly_locked_by_id', read_only=True)
    qualityStatusDisplay         = serializers.CharField(source='get_quality_status_display', read_only=True)
    qualityPauseReasonDisplay    = serializers.CharField(source='get_quality_pause_reason_display', read_only=True)
    qualityDoneBy                = serializers.SerializerMethodField()
    designFileUrl    = serializers.SerializerMethodField()
    designPdfUrl     = serializers.SerializerMethodField()
    designFileName   = serializers.SerializerMethodField()
    designPdfName    = serializers.SerializerMethodField()
    designUploadedBy = serializers.SerializerMethodField()
    bomFileUrl       = serializers.SerializerMethodField()
    bomFileName      = serializers.SerializerMethodField()
    gcodeFileUrl     = serializers.SerializerMethodField()
    gcodeFileName    = serializers.SerializerMethodField()
    programmerFiles  = ProgrammerFileSerializer(source='programmer_files', many=True, read_only=True)

    done_by = UserSerializer(read_only=True)

    class Meta:
        model = Sample
        fields = [
            'id', 'serial_number', 'apn', 'project', 'placement',
            'image', 'imageUrl', 'thumbnail', 'thumbnailUrl',
            'received_date', 'client', 'clientDisplay',
            'status', 'statusDisplay',
            'quantity', 'connector_fill', 'connectorFillDisplay',
            'description', 'commentaire',
            'is_done', 'done_date', 'done_by',
            'designer_status', 'designerStatusDisplay', 'time_started', 'time_spent_minutes',
            'pause_reason', 'pauseReasonDisplay', 'is_rework',
            'programmer_status', 'programmerStatusDisplay',
            'programmer_time_started', 'programmer_time_spent_minutes',
            'programmer_pause_reason', 'programmerPauseReasonDisplay',
            'programmer_done', 'programmer_done_date', 'programmerDoneBy',
            'designerLockedBy', 'designerLockedById',
            'programmerLockedBy', 'programmerLockedById',
            'is_cnc_rework',
            'cnc_status', 'cncStatusDisplay', 'cnc_time_started', 'cnc_time_spent_minutes',
            'cnc_pause_reason', 'cncPauseReasonDisplay',
            'cnc_done', 'cnc_done_date', 'cncDoneBy',
            'cncLockedBy', 'cncLockedById',
            'cnc_produced_count',
            'cnc_active_workers',
            'is_assembly_rework',
            'assembly_status', 'assemblyStatusDisplay',
            'assembly_time_started', 'assembly_time_spent_minutes',
            'assembly_pause_reason', 'assemblyPauseReasonDisplay',
            'assembly_done', 'assembly_done_date', 'assemblyDoneBy',
            'assemblyLockedBy', 'assemblyLockedById',
            'assembly_produced_count',
            'assembly_active_workers',
            'is_quality_rework',
            'quality_status', 'qualityStatusDisplay',
            'quality_time_started', 'quality_time_spent_minutes',
            'quality_pause_reason', 'qualityPauseReasonDisplay',
            'quality_done', 'quality_done_date', 'qualityDoneBy',
            'quality_active_workers',
            'designFileUrl', 'designPdfUrl', 'designFileName', 'designPdfName',
            'design_uploaded_at', 'designUploadedBy',
            'bomFileUrl', 'bomFileName', 'bom_uploaded_at',
            'gcodeFileUrl', 'gcodeFileName', 'gcode_uploaded_at',
            'programmerFiles',
            'created_at', 'updated_at', 'created_by', 'updated_by',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'created_by', 'updated_by',
            'thumbnail', 'imageUrl', 'thumbnailUrl',
            'statusDisplay', 'clientDisplay', 'connectorFillDisplay',
            'done_by', 'designerStatusDisplay', 'pauseReasonDisplay',
            'programmerStatusDisplay', 'programmerPauseReasonDisplay', 'programmerDoneBy',
            'cncStatusDisplay', 'cncPauseReasonDisplay', 'cncDoneBy',
            'assemblyStatusDisplay', 'assemblyPauseReasonDisplay', 'assemblyDoneBy',
            'qualityStatusDisplay', 'qualityPauseReasonDisplay', 'qualityDoneBy',
        ]

    def get_programmerDoneBy(self, obj):
        if obj.programmer_done_by:
            return obj.programmer_done_by.get_full_name() or obj.programmer_done_by.username
        return None

    def get_designerLockedBy(self, obj):
        if obj.designer_locked_by:
            return obj.designer_locked_by.get_full_name() or obj.designer_locked_by.username
        return None

    def get_programmerLockedBy(self, obj):
        if obj.programmer_locked_by:
            return obj.programmer_locked_by.get_full_name() or obj.programmer_locked_by.username
        return None

    def get_cncDoneBy(self, obj):
        if obj.cnc_done_by:
            return obj.cnc_done_by.get_full_name() or obj.cnc_done_by.username
        return None

    def get_cncLockedBy(self, obj):
        if obj.cnc_locked_by:
            return obj.cnc_locked_by.get_full_name() or obj.cnc_locked_by.username
        return None

    def get_assemblyDoneBy(self, obj):
        if obj.assembly_done_by:
            return obj.assembly_done_by.get_full_name() or obj.assembly_done_by.username
        return None

    def get_assemblyLockedBy(self, obj):
        if obj.assembly_locked_by:
            return obj.assembly_locked_by.get_full_name() or obj.assembly_locked_by.username
        return None

    def get_qualityDoneBy(self, obj):
        if obj.quality_done_by:
            return obj.quality_done_by.get_full_name() or obj.quality_done_by.username
        return None

    def get_imageUrl(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_thumbnailUrl(self, obj):
        request = self.context.get('request')
        if obj.thumbnail and request:
            return request.build_absolute_uri(obj.thumbnail.url)
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_designFileUrl(self, obj):
        request = self.context.get('request')
        if obj.design_file and request:
            return request.build_absolute_uri(obj.design_file.url)
        return None

    def get_designPdfUrl(self, obj):
        request = self.context.get('request')
        if obj.design_pdf and request:
            return request.build_absolute_uri(obj.design_pdf.url)
        return None

    def get_designFileName(self, obj):
        return os.path.basename(obj.design_file.name) if obj.design_file else None

    def get_designPdfName(self, obj):
        return os.path.basename(obj.design_pdf.name) if obj.design_pdf else None

    def get_bomFileUrl(self, obj):
        request = self.context.get('request')
        if obj.bom_pdf and request:
            return request.build_absolute_uri(obj.bom_pdf.url)
        return None

    def get_bomFileName(self, obj):
        return os.path.basename(obj.bom_pdf.name) if obj.bom_pdf else None

    def get_designUploadedBy(self, obj):
        if obj.design_uploaded_by:
            return obj.design_uploaded_by.get_full_name() or obj.design_uploaded_by.username
        return None

    def get_gcodeFileUrl(self, obj):
        request = self.context.get('request')
        if obj.gcode_file and request:
            return request.build_absolute_uri(obj.gcode_file.url)
        return None

    def get_gcodeFileName(self, obj):
        return os.path.basename(obj.gcode_file.name) if obj.gcode_file else None



class AuditLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    actionDisplay = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'action', 'actionDisplay', 'changes', 'timestamp']


# ── Technical Study Validation ────────────────────────────────────────────────

class MatrixEntrySerializer(serializers.ModelSerializer):
    # Texte libre : full/empty/partial (validation) ou type d'équipement importé
    sample_type = serializers.CharField(
        max_length=100,
        allow_blank=True,
        required=False,
        default='',
    )
    createdBy = serializers.SerializerMethodField()

    class Meta:
        model = MatrixEntry
        fields = [
            'id', 'reference', 'designation', 'quantity',
            'sample_type', 'notes',
            'created_at', 'updated_at', 'createdBy',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'createdBy']

    def get_createdBy(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None


class ProjectValidationSerializer(serializers.ModelSerializer):
    validatedBy = serializers.SerializerMethodField()
    approvedBy  = serializers.SerializerMethodField()

    class Meta:
        model = ProjectValidation
        fields = [
            'id', 'project_name', 'validation_status',
            'validated_at', 'validatedBy',
            'approved_at', 'approvedBy',
            'result', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_validatedBy(self, obj):
        if obj.validated_by:
            return obj.validated_by.get_full_name() or obj.validated_by.username
        return None

    def get_approvedBy(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
        return None


# ── Sales serializers ─────────────────────────────────────────────────────────

class SalesAuditSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model  = SalesAuditLog
        fields = ['id', 'action', 'changes', 'actor_name', 'created_at']

    def get_actor_name(self, obj):
        return obj.actor.get_full_name() or obj.actor.username if obj.actor else None


class SalesRecordSerializer(serializers.ModelSerializer):
    assigned_to_name      = serializers.SerializerMethodField()
    assigned_employee_name = serializers.CharField(source='assigned_employee.full_name', read_only=True)
    client_name           = serializers.CharField(source='accounting_client.raison_sociale', read_only=True)
    project_name          = serializers.CharField(source='project.project_name', read_only=True)
    history               = SalesAuditSerializer(many=True, read_only=True)

    class Meta:
        model  = SalesRecord
        fields = '__all__'
        read_only_fields = ['code', 'created_by', 'updated_by', 'created_at', 'updated_at']

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() or obj.assigned_to.username if obj.assigned_to else None

    def validate_probability(self, value):
        if value > 100:
            raise serializers.ValidationError('Probability cannot exceed 100.')
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        employee = attrs.get('assigned_employee', getattr(self.instance, 'assigned_employee', None))
        if employee and (
            not employee.department
            or employee.department.name.strip().lower() != 'sales'
            or employee.position.strip().lower() != 'sales employee'
        ):
            raise serializers.ValidationError({
                'assigned_employee': (
                    'Seuls les employés du département Sales ayant le rôle '
                    '« Sales Employee » peuvent être affectés.'
                ),
            })
        record_type = attrs.get('record_type', getattr(self.instance, 'record_type', None))
        accounting_client = attrs.get('accounting_client', getattr(self.instance, 'accounting_client', None))
        if record_type == 'opportunity' and not accounting_client:
            raise serializers.ValidationError({'accounting_client': 'Le client Comptabilité est obligatoire.'})
        return attrs
