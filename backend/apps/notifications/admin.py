from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["user", "level", "message", "read_at", "created_at"]
    list_filter = ["level"]
    search_fields = ["user__username", "message"]
    raw_id_fields = ["user"]
