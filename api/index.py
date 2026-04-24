"""
Vercel serverless entry point.
Re-exports the fully configured FastAPI application from the backend package.
"""

import os
import sys

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app  # noqa: E402, F401 — re-export for Vercel