import django_filters

from .models import Article, Client


class ArticleFilter(django_filters.FilterSet):
    family = django_filters.CharFilter(field_name="family__code", lookup_expr="iexact")
    deleted = django_filters.BooleanFilter(field_name="deleted_at", lookup_expr="isnull", exclude=True)

    class Meta:
        model = Article
        fields = ["family", "deleted"]


class ClientFilter(django_filters.FilterSet):
    class Meta:
        model = Client
        fields = ["code"]
