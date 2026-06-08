import uuid
import threading
import logging

_local = threading.local()
logger = logging.getLogger("apps.requests")


def get_request_id() -> str:
    return getattr(_local, "request_id", "-")


class RequestIdMiddleware:
    """Attach a UUID request-id to every request for log correlation."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _local.request_id = request.META.get("HTTP_X_REQUEST_ID") or str(uuid.uuid4())
        response = self.get_response(request)
        response["X-Request-Id"] = _local.request_id
        return response
