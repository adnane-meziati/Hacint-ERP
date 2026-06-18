from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DepartmentViewSet,
    EmployeeViewSet,
    EmployeeDocumentViewSet,
    ContractViewSet,
    ResignationViewSet,
    LeaveRequestViewSet,
    AttendanceViewSet,
    PayrollRecordViewSet,
    JobPositionViewSet,
    CandidateViewSet,
    ApplicationViewSet,
    InterviewViewSet,
    HRDashboardView,
)

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'employee-documents', EmployeeDocumentViewSet, basename='employeedocument')
router.register(r'contracts', ContractViewSet, basename='contract')
router.register(r'resignations', ResignationViewSet, basename='resignation')
router.register(r'leave-requests', LeaveRequestViewSet, basename='leaverequest')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'payroll', PayrollRecordViewSet, basename='payroll')
router.register(r'job-positions', JobPositionViewSet, basename='jobposition')
router.register(r'candidates', CandidateViewSet, basename='candidate')
router.register(r'applications', ApplicationViewSet, basename='application')
router.register(r'interviews', InterviewViewSet, basename='interview')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', HRDashboardView.as_view({'get': 'dashboard'}), name='hr-dashboard'),
]