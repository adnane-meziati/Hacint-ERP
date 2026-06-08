from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


class AuthThrottle(AnonRateThrottle):
    rate = "20/min"
    scope = "auth"


class ThrottledTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [AuthThrottle]


class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = [AuthThrottle]


urlpatterns = [
    path("admin/", admin.site.urls),
    # JWT auth (rate-limited)
    path("api/auth/login", ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh", ThrottledTokenRefreshView.as_view(), name="token_refresh"),
    # App routes
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.catalog.urls")),
    path("api/", include("apps.orders.urls")),
    path("api/", include("apps.production.urls")),
    path("api/", include("apps.documents.urls")),
    path("api/", include("apps.audit.urls")),
    path("api/", include("apps.notifications.urls")),
    path("api/", include("apps.dashboards.urls")),
    path("api/", include("apps.exports.urls")),
    path("api/", include("apps.workflow.urls")),
    # ERP module routes
    path("api/", include("apps.sales.urls")),
    path("api/", include("apps.purchase.urls")),
    path("api/", include("apps.inventory.urls")),
    path("api/", include("apps.quality.urls")),
    path("api/", include("apps.plm.urls")),
    path("api/", include("apps.hr.urls")),
    path("api/", include("apps.finance.urls")),
    path("api/", include("apps.reporting.urls")),
    # OpenAPI schema
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/schema/swagger-ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/schema/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
