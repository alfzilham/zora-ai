"""
Rate limiting helpers for ZORA AI.
"""

from fastapi import Request

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
except ModuleNotFoundError:
    class Limiter:  # type: ignore[override]
        """No-op fallback for environments without slowapi installed yet."""

        def __init__(self, key_func=None):
            self.key_func = key_func

        def limit(self, *_args, **_kwargs):
            def decorator(func):
                return func

            return decorator

    def get_remote_address(request: Request) -> str:
        if request.client and request.client.host:
            return request.client.host
        return "unknown"

from app.middleware.auth_middleware import verify_token


def user_or_ip_key(request: Request) -> str:
    """Prefer authenticated user id for limits, fall back to client IP."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.removeprefix("Bearer ").strip()
        try:
            return str(verify_token(token))
        except Exception:
            pass
    return get_remote_address(request)


def ip_key(request: Request) -> str:
    """Always rate limit by remote IP address."""
    return get_remote_address(request)


limiter = Limiter(key_func=ip_key)
