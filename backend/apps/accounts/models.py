import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    ADMIN = "admin", "Admin"
    PLANNER = "planner", "Planner"
    DESIGNER = "designer", "Designer (Dessin)"
    PROGRAMMER = "programmer", "Programmer (CAM)"
    OPERATOR = "operator", "CNC Operator"
    ASSEMBLY = "assembly", "Assembly (Montage)"
    QC = "qc", "Quality"
    CLIENT = "client", "Client (read-only)"


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.OPERATOR)
    phone = models.CharField(max_length=32, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True)

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["username"]

    def __str__(self) -> str:
        return f"{self.username} ({self.get_role_display()})"
