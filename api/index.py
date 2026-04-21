"""
ZORA AI  Vercel Native Entry Point
Vercel automatically detects and serves Python files inside the api/ folder.
requirements.txt at the repo root is automatically installed.
"""
import os
import sys

# Add backend/ to sys.path so `app` package resolves correctly
BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app  # noqa: E402
