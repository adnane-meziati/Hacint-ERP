from rest_framework.routers import DefaultRouter

from .views import DepartmentViewSet, EmployeeViewSet, PayrollRecordViewSet, TimeOffRequestViewSet

router = DefaultRouter()
router.register("v1/hr/departments", DepartmentViewSet, basename="hr-departments")
router.register("v1/hr/employees", EmployeeViewSet, basename="hr-employees")
router.register("v1/hr/time-off", TimeOffRequestViewSet, basename="hr-time-off")
router.register("v1/hr/payroll", PayrollRecordViewSet, basename="hr-payroll")

urlpatterns = router.urls
