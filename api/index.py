import os
import sys

BACKEND_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "backend"
)

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

try:
    from app.main import app
except Exception as e:
    import traceback
    from fastapi import FastAPI

    app = FastAPI()

    @app.get("/api/health")
    @app.get("/health")
    async def error_info():
        return {
            "status": "import_failed",
            "error": str(e),
            "traceback": traceback.format_exc(),
            "sys_path": sys.path,
            "backend_dir": BACKEND_DIR,
            "backend_exists": os.path.exists(BACKEND_DIR),
        }