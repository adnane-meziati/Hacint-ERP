from django.urls import path

from .views import GanttDataView, LoadDashboardView, OPDashboardView, WeeklyCapacityView

urlpatterns = [
    path("dashboards/op/", OPDashboardView.as_view(), name="dashboard-op"),
    path("dashboards/load/", LoadDashboardView.as_view(), name="dashboard-load"),
    path("planning/weekly/", WeeklyCapacityView.as_view(), name="planning-weekly"),
    path("planning/gantt/", GanttDataView.as_view(), name="planning-gantt"),
]
