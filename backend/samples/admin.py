from django.contrib import admin
from .models import Sample, AuditLog, ProjectDocument, SalesRecord, SalesAuditLog, SalesProjectHistory, SalesTarget


@admin.register(Sample)
class SampleAdmin(admin.ModelAdmin):
    list_display = ['apn', 'project', 'placement', 'client', 'status', 'received_date', 'is_deleted', 'created_by']
    list_filter = ['client', 'status', 'is_deleted', 'received_date']
    search_fields = ['apn', 'project', 'placement']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'thumbnail']
    date_hierarchy = 'received_date'

    def get_queryset(self, request):
        return Sample.all_objects.all()


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'user', 'action', 'sample']
    list_filter = ['action']
    readonly_fields = ['timestamp', 'user', 'action', 'sample', 'changes']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(ProjectDocument)
class ProjectDocumentAdmin(admin.ModelAdmin):
    list_display = ['project', 'file_name', 'uploaded_by', 'uploaded_at']
    list_filter  = ['uploaded_at']
    search_fields = ['file_name', 'project__project_name']
    readonly_fields = ['uploaded_at']


@admin.register(SalesRecord)
class SalesRecordAdmin(admin.ModelAdmin):
    list_display   = ['code', 'record_type', 'title', 'status', 'assigned_employee', 'value', 'due_date', 'created_at']
    list_filter    = ['record_type', 'status', 'industry']
    search_fields  = ['code', 'title', 'company_name', 'contact_person']
    readonly_fields = ['code', 'created_at', 'updated_at', 'created_by', 'updated_by']


@admin.register(SalesAuditLog)
class SalesAuditLogAdmin(admin.ModelAdmin):
    list_display = ['record', 'actor', 'action', 'created_at']
    list_filter  = ['action']
    readonly_fields = ['record', 'actor', 'action', 'changes', 'created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SalesProjectHistory)
class SalesProjectHistoryAdmin(admin.ModelAdmin):
    list_display = ['project', 'old_status', 'new_status', 'actor', 'created_at']
    list_filter  = ['new_status']
    readonly_fields = ['project', 'old_status', 'new_status', 'actor', 'created_at']

    def has_add_permission(self, request):
        return False


@admin.register(SalesTarget)
class SalesTargetAdmin(admin.ModelAdmin):
    list_display  = ['employee', 'period_type', 'year', 'month', 'quarter', 'target_amount']
    list_filter   = ['period_type', 'year']
    search_fields = ['employee__first_name', 'employee__last_name']
    readonly_fields = ['created_by', 'updated_by']


