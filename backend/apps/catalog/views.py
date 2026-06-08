from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response

from common.permissions import IsAdmin, IsPlannerOrAbove

from .filters import ArticleFilter, ClientFilter
from .models import Article, ArticleRevision, Client, Family
from .serializers import (
    ArticleDetailSerializer,
    ArticleRevisionSerializer,
    ArticleSerializer,
    ClientSerializer,
    FamilySerializer,
)


class ClientListCreateView(generics.ListCreateAPIView):
    """GET /api/clients/  POST /api/clients/ (admin only)"""

    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    filterset_class = ClientFilter
    search_fields = ["code", "name"]

    def get_permissions(self) -> list:
        if self.request.method == "POST":
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


class FamilyListView(generics.ListAPIView):
    """GET /api/families/"""

    queryset = Family.objects.all()
    serializer_class = FamilySerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["code", "name"]


class ArticleListCreateView(generics.ListCreateAPIView):
    """GET /api/articles/  POST /api/articles/ (planner+)"""

    serializer_class = ArticleSerializer
    filterset_class = ArticleFilter
    search_fields = ["ref_client", "description", "family__code"]

    def get_queryset(self):  # type: ignore[override]
        return Article.objects.select_related("family").filter(deleted_at__isnull=True)

    def get_permissions(self) -> list:
        if self.request.method == "POST":
            return [IsPlannerOrAbove()]
        return [permissions.IsAuthenticated()]


class ArticleDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/articles/{id}/"""

    serializer_class = ArticleDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        return Article.objects.select_related("family").prefetch_related("revisions")


class ArticleRevisionCreateView(generics.CreateAPIView):
    """POST /api/articles/{article_id}/revisions/  multipart"""

    serializer_class = ArticleRevisionSerializer
    permission_classes = [IsPlannerOrAbove]
    parser_classes = [MultiPartParser]

    def perform_create(self, serializer: ArticleRevisionSerializer) -> None:  # type: ignore[override]
        article = generics.get_object_or_404(Article, pk=self.kwargs["article_id"])
        serializer.save(article=article, created_by=self.request.user)
