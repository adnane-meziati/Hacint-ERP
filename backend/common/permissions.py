from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

# Roles that can perform production-stage actions
STAGE_WORKER_ROLES = {"admin", "planner", "designer", "programmer", "operator", "assembly", "qc"}


class IsAdmin(BasePermission):
    """Only the admin role."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


class IsPlannerOrAbove(BasePermission):
    """Admin or planner."""

    ALLOWED = {"admin", "planner"}

    def has_permission(self, request: Request, view: APIView) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in self.ALLOWED
        )


class IsStageWorker(BasePermission):
    """Any authenticated production role (not client-only)."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in STAGE_WORKER_ROLES
        )


class IsReadOnlyForClient(BasePermission):
    """Allow full access to staff roles; restrict client role to safe methods."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == "client":
            return request.method in ("GET", "HEAD", "OPTIONS")
        return True
