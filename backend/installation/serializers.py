from rest_framework import serializers
from .models import (
    InstallationProject,
    InstallationProduct,
    InstallationTask,
    InstallationDocument,
    InstallationReport,
    InstallationNotification,
)


class InstallationProjectSerializer(serializers.ModelSerializer):
    startDate = serializers.DateField(source='start_date', required=False, allow_null=True)
    plannedEndDate = serializers.DateField(source='planned_end_date', required=False, allow_null=True)
    productsCount = serializers.IntegerField(source='products_count', read_only=True)
    tasksCount = serializers.IntegerField(source='tasks_count', read_only=True)
    finishedTasksCount = serializers.IntegerField(source='finished_tasks_count', read_only=True)

    class Meta:
        model = InstallationProject
        fields = [
            'id', 'name', 'client', 'address', 'startDate', 'plannedEndDate',
            'supervisor', 'status', 'description', 'budget', 'progress',
            'productsCount', 'tasksCount', 'finishedTasksCount', 'notes', 'created_at', 'updated_at'
        ]


class InstallationProductSerializer(serializers.ModelSerializer):
    projectLabel = serializers.CharField(source='project.name', read_only=True)
    imageUrl = serializers.SerializerMethodField()
    fileUrl = serializers.SerializerMethodField()

    class Meta:
        model = InstallationProduct
        fields = [
            'id', 'project', 'projectLabel', 'reference', 'name', 'description',
            'date', 'status', 'image', 'file', 'imageUrl', 'fileUrl', 'notes', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'image': {'required': False, 'allow_null': True},
            'file': {'required': False, 'allow_null': True},
        }

    def _url(self, obj, field):
        f = getattr(obj, field, None)
        if not f:
            return ''
        request = self.context.get('request')
        return request.build_absolute_uri(f.url) if request else f.url

    def get_imageUrl(self, obj):
        return self._url(obj, 'image')

    def get_fileUrl(self, obj):
        return self._url(obj, 'file')


class InstallationTaskSerializer(serializers.ModelSerializer):
    projectLabel = serializers.CharField(source='project.name', read_only=True)
    startDate = serializers.DateField(source='start_date', required=False, allow_null=True)
    dueDate = serializers.DateField(source='due_date', required=False, allow_null=True)
    attachmentUrl = serializers.SerializerMethodField()

    class Meta:
        model = InstallationTask
        fields = [
            'id', 'project', 'projectLabel', 'name', 'description', 'status',
            'startDate', 'dueDate', 'priority', 'comment', 'attachment', 'attachmentUrl',
            'notes', 'created_at', 'updated_at'
        ]
        extra_kwargs = {'attachment': {'required': False, 'allow_null': True}}

    def validate(self, attrs):
        start = attrs.get('start_date') or getattr(self.instance, 'start_date', None)
        due = attrs.get('due_date') or getattr(self.instance, 'due_date', None)
        if start and due and due < start:
            raise serializers.ValidationError({'dueDate': "La date d'échéance ne peut pas être antérieure à la date de début."})
        return attrs

    def get_attachmentUrl(self, obj):
        if not obj.attachment:
            return ''
        request = self.context.get('request')
        return request.build_absolute_uri(obj.attachment.url) if request else obj.attachment.url


class InstallationDocumentSerializer(serializers.ModelSerializer):
    projectLabel = serializers.CharField(source='project.name', read_only=True)
    documentType = serializers.CharField(source='document_type', required=False, allow_blank=True)
    fileUrl = serializers.SerializerMethodField()
    uploadedByName = serializers.SerializerMethodField()

    class Meta:
        model = InstallationDocument
        fields = [
            'id', 'project', 'projectLabel', 'title', 'documentType', 'file', 'fileUrl',
            'uploadedByName', 'status', 'notes', 'created_at', 'updated_at'
        ]
        extra_kwargs = {'file': {'required': False, 'allow_null': True}}

    def get_fileUrl(self, obj):
        if not obj.file:
            return ''
        request = self.context.get('request')
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url

    def get_uploadedByName(self, obj):
        return obj.uploaded_by.get_username() if obj.uploaded_by else ''


class InstallationReportSerializer(serializers.ModelSerializer):
    projectLabel = serializers.CharField(source='project.name', read_only=True)
    reportType = serializers.CharField(source='report_type', required=False, allow_blank=True)
    generatedByName = serializers.SerializerMethodField()

    class Meta:
        model = InstallationReport
        fields = [
            'id', 'project', 'projectLabel', 'reference', 'title', 'reportType',
            'summary', 'status', 'generatedByName', 'notes', 'created_at', 'updated_at'
        ]

    def get_generatedByName(self, obj):
        return obj.generated_by.get_username() if obj.generated_by else ''


class InstallationNotificationSerializer(serializers.ModelSerializer):
    projectLabel = serializers.CharField(source='project.name', read_only=True)
    isRead = serializers.BooleanField(source='is_read', required=False)

    class Meta:
        model = InstallationNotification
        fields = [
            'id', 'project', 'projectLabel', 'title', 'message', 'level', 'isRead',
            'notes', 'created_at', 'updated_at'
        ]
