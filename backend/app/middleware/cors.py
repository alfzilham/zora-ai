"""
ZORA AI - CORS Configuration
============================
Cross-Origin Resource Sharing middleware setup.
"""

from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# CORS configuration is applied in main.py
# The following origins are allowed:
# - Production frontend URL (from APP_URL env var)
# - Local development servers (localhost:3000, localhost:5500)
# - HTTPS variants for secure local testing

DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5500",
    "https://localhost:3000",
    "https://localhost:5500",
]


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach baseline security headers to every response."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


def setup_cors_middleware(app, origins: list = None):
    """
    Configure CORS middleware for FastAPI app.

    Args:
        app: FastAPI application instance
        origins: List of allowed origins (defaults to DEFAULT_ORIGINS)
    """
    allowed_origins = origins or DEFAULT_ORIGINS

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
