import os
import sys

# Add backend to path
BACKEND_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "backend"
)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Import app — must be at top level for Vercel to detect
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Try to import the real app
try:
    from app.main import app
except Exception as e:
    import traceback

    # Fallback app — Vercel needs to find 'app' at top level
    app = FastAPI(title="ZORA AI - Fallback")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    _error = str(e)
    _tb = traceback.format_exc()
    _path = sys.path
    _exists = os.path.exists(BACKEND_DIR)

    @app.get("/api/health")
    @app.get("/health")
    async def error_info():
        return {
            "status": "import_failed",
            "error": _error,
            "traceback": _tb,
            "sys_path": _path,
            "backend_dir": BACKEND_DIR,
            "backend_exists": _exists,
        }

# Vercel requires 'app' to exist unconditionally at module level
# app is already defined above in both success and fallback cases