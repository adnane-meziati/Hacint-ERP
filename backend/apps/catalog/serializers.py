from rest_framework import serializers

from .models import Article, ArticleRevision, Client, Family


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ["id", "code", "name", "country", "contact_email", "logo", "created_at"]
        read_only_fields = ["id", "created_at"]


class FamilySerializer(serializers.ModelSerializer):
    class Meta:
        model = Family
        fields = ["id", "code", "name"]
        read_only_fields = ["id"]


class ArticleRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleRevision
        fields = [
            "id", "article", "revision_no", "effective_date",
            "drawing_pdf", "cam_archive", "notes", "created_at",
        ]
        read_only_fields = ["id", "article", "created_at"]


class ArticleSerializer(serializers.ModelSerializer):
    family_code = serializers.CharField(source="family.code", read_only=True)
    latest_revision = serializers.SerializerMethodField()
    revision_count = serializers.IntegerField(source="revisions.count", read_only=True)

    class Meta:
        model = Article
        fields = [
            "id", "ref_client", "description", "family", "family_code",
            "notes", "latest_revision", "revision_count", "created_at", "deleted_at",
        ]
        read_only_fields = ["id", "created_at", "deleted_at"]

    def get_latest_revision(self, obj: Article) -> dict | None:  # type: ignore[type-arg]
        rev = obj.revisions.order_by("-effective_date").first()
        if rev:
            return ArticleRevisionSerializer(rev).data
        return None


class ArticleDetailSerializer(ArticleSerializer):
    revisions = ArticleRevisionSerializer(many=True, read_only=True)

    class Meta(ArticleSerializer.Meta):
        fields = ArticleSerializer.Meta.fields + ["revisions"]  # type: ignore[operator]
