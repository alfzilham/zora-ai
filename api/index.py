import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

try:
    from app.main import app
except Exception:
    from fastapi import FastAPI
    app = FastAPI()

    @app.get("/api/health")
    async def health():
        return {"status": "ok", "message": "ZORA AI is running"}