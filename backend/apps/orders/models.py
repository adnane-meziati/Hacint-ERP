from django.db import models

from apps.catalog.models import Article, Client
from common.models import TimeStampedModel


class OrderStatus(models.TextChoices):
    EN_COURS = "en_cours", "En cours de production"
    LIVREE = "livree", "Livrée"
    STANDBY = "standby", "Stand-by"


class Priority(models.TextChoices):
    URGENT = "urgent", "Urgent"
    NORMAL = "normal", "Normal"
    FAIBLE = "faible", "Faible"


class Order(TimeStampedModel):
    n_ordre = models.PositiveIntegerField(unique=True)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="orders")
    creation_date = models.DateField()
    delivery_date = models.DateField()
    status = models.CharField(
        max_length=16, choices=OrderStatus.choices, default=OrderStatus.EN_COURS
    )
    notes = models.TextField(blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-n_ordre"]

    def __str__(self) -> str:
        return f"OP {self.n_ordre}"


class OrderLine(TimeStampedModel):
    order = models.ForeignKey(Order, related_name="lines", on_delete=models.CASCADE)
    n_serie = models.PositiveIntegerField()
    article = models.ForeignKey(Article, on_delete=models.PROTECT, related_name="order_lines")
    quantity = models.PositiveIntegerField(default=1)
    priority = models.CharField(
        max_length=16, choices=Priority.choices, default=Priority.NORMAL
    )
    status = models.CharField(
        max_length=16, choices=OrderStatus.choices, default=OrderStatus.EN_COURS
    )
    current_stage = models.ForeignKey(
        "production.Stage",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="current_lines",
    )
    comments = models.TextField(blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        unique_together = [("order", "n_serie")]
        ordering = ["sort_order", "order__n_ordre", "n_serie"]

    def __str__(self) -> str:
        return f"OP {self.order.n_ordre} #{self.n_serie} — {self.article.ref_client}"
