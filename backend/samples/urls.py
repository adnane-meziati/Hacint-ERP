from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    BomItemViewSet, JimideDxfViewSet, MatrixEntryViewSet, SampleViewSet,
    project_approve_apn, project_create, project_import_excel,
    project_sample_delete, project_samples, project_update_status,
    validation_approve, validation_list, validation_run,
    project_flow,
    # Sales
    SalesRecordViewSet,
    sales_opportunities_export, sales_project_document_delete,
    sales_project_update, sales_projects, sales_projects_export,
    sales_targets, sales_targets_export, salespeople,
)

router = DefaultRouter()
router.register(r'samples',   SampleViewSet,    basename='sample')
router.register(r'bom-items', BomItemViewSet,   basename='bom-item')
router.register(r'jimide',    JimideDxfViewSet, basename='jimide')
router.register(r'matrix',    MatrixEntryViewSet, basename='matrix')
router.register(r'sales/records', SalesRecordViewSet, basename='sales-record')

urlpatterns = [
    path('samples/project-flow/', project_flow, name='project-flow'),
    path('', include(router.urls)),
    path('validation/',         validation_list,    name='validation-list'),
    path('validation/run/',     validation_run,     name='validation-run'),
    path('validation/approve/', validation_approve, name='validation-approve'),
    path('projects/import-excel/', project_import_excel, name='project-import-excel'),
    path('validation/projects/', project_create, name='project-create'),
    path('validation/projects/<str:project_name>/samples/', project_samples, name='project-samples'),
    path('validation/projects/<str:project_name>/samples/<int:sample_id>/', project_sample_delete, name='project-sample-delete'),
    path('validation/projects/<str:project_name>/status/', project_update_status, name='project-update-status'),
    path('validation/projects/<str:project_name>/approve-apn/', project_approve_apn, name='project-approve-apn'),
    # Sales
    path('sales/projects/',                                       sales_projects,              name='sales-projects'),
    path('sales/projects/<int:pk>/',                              sales_project_update,        name='sales-project-update'),
    path('sales/projects/<int:pk>/documents/<int:document_id>/',  sales_project_document_delete, name='sales-project-document-delete'),
    path('sales/people/',                                         salespeople,                 name='sales-people'),
    path('sales/targets/',                                        sales_targets,               name='sales-targets'),
    path('sales/targets/export/',                                 sales_targets_export,        name='sales-targets-export'),
    path('sales/projects/export/',                                sales_projects_export,       name='sales-projects-export'),
    path('sales/opportunities/export/',                           sales_opportunities_export,  name='sales-opportunities-export'),
]
