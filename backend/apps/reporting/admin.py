from django.contrib import admin

from .models import SavedReport, ScheduledReport


class ScheduleInline(admin.TabularInline):
    model = ScheduledReport
    extra = 0


@admin.register(SavedReport)
class SavedReportAdmin(admin.ModelAdmin):
    list_display = ["name", "module", "is_public", "created_at"]
    list_filter = ["module", "is_public"]
    search_fields = ["name", "description"]
    inlines = [ScheduleInline]


@admin.register(ScheduledReport)
class ScheduledReportAdmin(admin.ModelAdmin):
    list_display = ["saved_report", "schedule_cron", "is_active", "last_run", "next_run"]
    list_filter = ["is_active"]
