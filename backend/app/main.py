"""
ZORA AI - Main FastAPI Application
====================================
Entry point for the FastAPI backend server.
"""

import json
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.models.withdrawal import Withdrawal  # noqa

try:
    from slowapi.errors import RateLimitExceeded
except ModuleNotFoundError:
    class RateLimitExceeded(Exception):
        """Fallback when slowapi is not installed in the current environment."""

from app.config import settings
from app.database import engine, Base
from app.middleware.cors import SecurityHeadersMiddleware
from app.routers import auth, onboarding, chat, labs, dashboard, feedback
from app.routers import settings as settings_router
from app.utils.rate_limit import limiter

STATIC_DIR = Path(__file__).resolve().parents[1] / "static"
GENERATED_DIR = STATIC_DIR / "generated"
LOGS_DIR = Path(__file__).resolve().parents[1] / ".remember" / "logs"


def log_error_to_file(request: Request, status_code: int, message: str, detail=None) -> None:
    """Append structured error information to the daily log file."""
    try:
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        log_path = LOGS_DIR / f"{datetime.utcnow():%Y-%m-%d}.log"
        payload = {
            "timestamp": datetime.utcnow().isoformat(),
            "status_code": status_code,
            "path": str(request.url.path),
            "method": request.method,
            "message": message,
            "detail": detail,
        }
        with log_path.open("a", encoding="utf-8") as file_handle:
            file_handle.write(json.dumps(payload) + "\n")
    except OSError:
        pass  # Read-only filesystem on Vercel — skip logging to file


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    try:
        GENERATED_DIR.mkdir(parents=True, exist_ok=True)
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass  # Read-only filesystem on Vercel serverless — safe to ignore
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


# Initialize FastAPI app
app = FastAPI(
    title="ZORA AI API",
    description="SuperIntelligence Autonomous Platform API",
    version="1.0.0",
    lifespan=lifespan
)
app.state.limiter = limiter

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.middleware("http")
async def normalize_vercel_api_prefix(request: Request, call_next):
    """Allow Vercel /api/* routing to resolve against the root FastAPI app."""
    if request.scope.get("path", "").startswith("/api/"):
        request.scope["path"] = request.scope["path"][4:] or "/"
    return await call_next(request)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(onboarding.router, prefix="/onboarding", tags=["Onboarding"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(settings_router.router, tags=["Settings"])
app.include_router(labs.router, prefix="/labs", tags=["Labs"])
app.include_router(dashboard.router, tags=["Dashboard"])
app.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Return consistent JSON errors for common HTTP exceptions."""
    if exc.status_code == 404:
        log_error_to_file(request, 404, "Endpoint not found", exc.detail)
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Endpoint not found"},
        )

    if exc.status_code == 429:
        log_error_to_file(request, 429, "Rate limit exceeded", exc.detail)
        return JSONResponse(
            status_code=429,
            content={"success": False, "message": "Rate limit exceeded"},
        )

    log_error_to_file(request, exc.status_code, str(exc.detail), exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": str(exc.detail)},
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded):
    """Return a clean JSON response for rate-limit violations."""
    log_error_to_file(request, 429, "Rate limit exceeded", str(exc))
    return JSONResponse(
        status_code=429,
        content={"success": False, "message": "Rate limit exceeded"},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return cleaned validation errors."""
    errors = [
        {
            "field": ".".join(str(part) for part in error.get("loc", [])[1:]),
            "message": error.get("msg", "Invalid value"),
        }
        for error in exc.errors()
    ]
    log_error_to_file(request, 422, "Validation error", errors)
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation error",
            "errors": errors,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch unhandled server errors."""
    log_error_to_file(request, 500, "Internal server error", str(exc))
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error"},
    )


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "success": True,
        "data": {"status": "ZORA AI is running"},
        "message": "Welcome to ZORA AI API"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "env": "production",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENV == "development"
    )