from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsHRManager(BasePermission):
    """Full access only for staff / HR managers."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (
            request.user.is_staff or
            request.user.groups.filter(name='HR Manager').exists()
        )


class IsDepartmentManagerOrHR(BasePermission):
    """
    HR Managers and Department Managers have access.
    Regular employees are denied (use IsOwnerOrHR for self-service).
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff:
            return True
        if request.user.groups.filter(name__in=['HR Manager', 'Department Manager']).exists():
            return True
        return False


class IsOwnerOrHR(BasePermission):
    """
    HR / staff have full access.
    Regular employees can only access their own records (checked at object level).
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        if request.user.groups.filter(name__in=['HR Manager', 'Department Manager']).exists():
            return True
        # Check ownership – works for models that have an `employee` FK
        if hasattr(obj, 'employee') and hasattr(request.user, 'employee_profile'):
            return obj.employee == request.user.employee_profile
        # Works for Employee model itself
        if hasattr(request.user, 'employee_profile'):
            return obj == request.user.employee_profile
        return False