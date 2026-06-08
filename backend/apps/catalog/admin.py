from django.contrib import admin

from .models import Article, ArticleRevision, Client, Family


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "country", "contact_email"]
    search_fields = ["code", "name"]


@admin.register(Family)
class FamilyAdmin(admin.ModelAdmin):
    list_display = ["code", "name"]


class ArticleRevisionInline(admin.TabularInline):
    model = ArticleRevision
    extra = 0


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ["ref_client", "description", "family", "deleted_at"]
    list_filter = ["family", "deleted_at"]
    search_fields = ["ref_client", "description"]
    inlines = [ArticleRevisionInline]
