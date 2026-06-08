from django.urls import path

from .views import (
    ArticleDetailView,
    ArticleListCreateView,
    ArticleRevisionCreateView,
    ClientListCreateView,
    FamilyListView,
)
from .views_settings import ClientAdminDetailView, FamilyCreateView, FamilyDetailView

urlpatterns = [
    path("clients/", ClientListCreateView.as_view(), name="clients-list"),
    path("clients/<uuid:pk>/", ClientAdminDetailView.as_view(), name="clients-detail"),
    path("families/", FamilyListView.as_view(), name="families-list"),
    path("families/create/", FamilyCreateView.as_view(), name="families-create"),
    path("families/<uuid:pk>/", FamilyDetailView.as_view(), name="families-detail"),
    path("articles/", ArticleListCreateView.as_view(), name="articles-list"),
    path("articles/<uuid:pk>/", ArticleDetailView.as_view(), name="articles-detail"),
    path("articles/<uuid:article_id>/revisions/", ArticleRevisionCreateView.as_view(), name="articles-revisions"),
]
