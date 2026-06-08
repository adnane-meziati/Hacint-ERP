from django.urls import path

from .views import ChangePasswordView, LogoutView, MeView, UserDetailView, UserListCreateView

urlpatterns = [
    path("users/me/", MeView.as_view(), name="users-me"),
    path("users/me/password/", ChangePasswordView.as_view(), name="users-me-password"),
    path("users/", UserListCreateView.as_view(), name="users-list"),
    path("users/<uuid:pk>/", UserDetailView.as_view(), name="users-detail"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
]
