from django.urls import path

from .views import ExportOPView, ImportOPView

urlpatterns = [
    path("exports/op.xlsx", ExportOPView.as_view(), name="export-op"),
    path("imports/op/", ImportOPView.as_view(), name="import-op"),
]
