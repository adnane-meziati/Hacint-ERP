"""Generic audit signals — connected in AuditConfig.ready()."""
from __future__ import annotations

import json
from typing import Any

from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from django.db.models import Model
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver


def _serialize(instance: Model) -> dict[str, Any] | None:
    try:
        data = json.loads(serializers.serialize("json", [instance]))
        return data[0]["fields"] if data else None
    except Exception:
        return None


TRACKED_MODELS: list[str] = []  # filled in ready()


def _connect_audit(model_class: type[Model]) -> None:
    from apps.audit.models import AuditLog

    @receiver(post_save, sender=model_class, weak=False)
    def on_save(sender: type, instance: Model, created: bool, **kwargs: object) -> None:
        try:
            from threading import local

            _thread_locals = local()
            user = getattr(_thread_locals, "current_user", None)
            ct = ContentType.objects.get_for_model(instance)
            AuditLog.objects.create(
                user=user,
                action="create" if created else "update",
                content_type=ct,
                object_id=str(instance.pk),
                after_json=_serialize(instance),
            )
        except Exception:
            pass

    @receiver(post_delete, sender=model_class, weak=False)
    def on_delete(sender: type, instance: Model, **kwargs: object) -> None:
        try:
            from threading import local

            _thread_locals = local()
            user = getattr(_thread_locals, "current_user", None)
            ct = ContentType.objects.get_for_model(instance)
            AuditLog.objects.create(
                user=user,
                action="delete",
                content_type=ct,
                object_id=str(instance.pk),
                before_json=_serialize(instance),
            )
        except Exception:
            pass
