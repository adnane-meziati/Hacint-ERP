from django.urls import path
from . import views

urlpatterns = [
    path('',          views.request_list,    name='procurement-list'),
    path('<int:pk>/', views.request_detail,  name='procurement-detail'),
    path('<int:pk>/approve/', views.request_approve, name='procurement-approve'),
    path('<int:pk>/reject/',  views.request_reject,  name='procurement-reject'),
]
