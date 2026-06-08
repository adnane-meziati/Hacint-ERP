from django.contrib import admin

from .models import Attachment


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ["original_name", "kind", "mime", "size_bytes", "content_type", "object_id", "created_at"]
    list_filter = ["kind", "content_type"]
    search_fields = ["original_name", "notes"]
    readonly_fields = ["content_type", "object_id", "size_bytes", "mime", "created_at"]
