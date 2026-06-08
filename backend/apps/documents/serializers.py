from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from .models import Attachment


class AttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = [
            "id", "kind", "original_name", "size_bytes", "mime",
            "notes", "url", "created_at",
        ]
        read_only_fields = fields

    def get_url(self, obj: Attachment) -> str:
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url


class AttachmentCreateSerializer(serializers.Serializer):
    file = serializers.FileField()
    kind = serializers.ChoiceField(choices=Attachment._meta.get_field("kind").choices)
    notes = serializers.CharField(max_length=255, required=False, allow_blank=True)
    content_type_app = serializers.CharField(help_text="App label, e.g. 'orders'")
    content_type_model = serializers.CharField(help_text="Model name, e.g. 'order'")
    object_id = serializers.UUIDField()

    def validate(self, attrs: dict) -> dict:
        try:
            ct = ContentType.objects.get(
                app_label=attrs["content_type_app"],
                model=attrs["content_type_model"].lower(),
            )
        except ContentType.DoesNotExist:
            raise serializers.ValidationError("Invalid content_type_app/content_type_model.")
        attrs["content_type"] = ct
        return attrs

    def create(self, validated_data: dict) -> Attachment:
        file = validated_data["file"]
        return Attachment.objects.create(
            content_type=validated_data["content_type"],
            object_id=validated_data["object_id"],
            kind=validated_data["kind"],
            file=file,
            original_name=file.name,
            size_bytes=file.size,
            mime=getattr(file, "content_type", "application/octet-stream"),
            notes=validated_data.get("notes", ""),
        )
