from rest_framework import serializers

from .models import BillOfMaterials, BOMLine, EngineeringChangeNotice


class BOMLineSerializer(serializers.ModelSerializer):
    component_ref = serializers.CharField(source="component.ref_client", read_only=True)
    component_name = serializers.CharField(source="component.description", read_only=True)

    class Meta:
        model = BOMLine
        fields = ["id", "component", "component_ref", "component_name", "qty", "unit", "notes"]
        read_only_fields = ["id"]


class BOMSerializer(serializers.ModelSerializer):
    article_ref = serializers.CharField(source="article.ref_client", read_only=True)
    article_name = serializers.CharField(source="article.description", read_only=True)
    lines = BOMLineSerializer(many=True, read_only=True)
    line_count = serializers.IntegerField(source="lines.count", read_only=True)

    class Meta:
        model = BillOfMaterials
        fields = [
            "id", "article", "article_ref", "article_name",
            "revision", "status", "description", "lines", "line_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ECNSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source="requested_by.username", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.username", read_only=True, default=None)
    affected_bom_ref = serializers.SerializerMethodField()

    class Meta:
        model = EngineeringChangeNotice
        fields = [
            "id", "ref", "title", "description", "affected_bom", "affected_bom_ref",
            "status", "priority", "requested_by", "requested_by_name",
            "approved_by", "approved_by_name", "effective_date", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_affected_bom_ref(self, obj: EngineeringChangeNotice) -> str | None:
        if obj.affected_bom:
            return f"{obj.affected_bom.article.ref_client} Rev.{obj.affected_bom.revision}"
        return None
