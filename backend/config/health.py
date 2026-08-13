from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def health_check(request):
    """Return a minimal response for deployment health monitoring."""
    return JsonResponse(
        {
            "status": "ok",
            "service": "tracenet-api",
        }
    )
