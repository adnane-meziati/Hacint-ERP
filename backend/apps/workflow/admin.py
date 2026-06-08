from django.contrib import admin

from .models import Apn, ApnAttachment, ApnStageHistory, Project, WorkflowOrder


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["code", "name"]
    readonly_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]


@admin.register(WorkflowOrder)
class WorkflowOrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "project", "order_date", "status"]
    list_filter = ["status", "project"]
    search_fields = ["order_number"]
    readonly_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]


@admin.register(Apn)
class ApnAdmin(admin.ModelAdmin):
    list_display = ["apn_code", "work_order", "priority", "current_stage", "assigned_user", "has_sample"]
    list_filter = ["current_stage", "priority", "has_sample"]
    search_fields = ["apn_code"]
    readonly_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]


@admin.register(ApnStageHistory)
class ApnStageHistoryAdmin(admin.ModelAdmin):
    list_display = ["apn", "from_stage", "to_stage", "transitioned_by", "created_at"]
    readonly_fields = ["id", "apn", "from_stage", "to_stage", "transitioned_by", "created_at"]
    list_filter = ["to_stage"]


@admin.register(ApnAttachment)
class ApnAttachmentAdmin(admin.ModelAdmin):
    list_display = ["original_name", "attachment_type", "apn", "stage_at_upload", "size_bytes", "created_at"]
    list_filter = ["attachment_type", "stage_at_upload"]
    search_fields = ["original_name"]
    readonly_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]
