"""
ZORA AI  Vercel Serverless Entry Point
Vercel runs this file from the repo root, not from backend/.
We fix sys.path so that `from app.main import app` resolves correctly.
"""
import os
import sys

# Add backend/ to sys.path so the `app` package can be imported
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Safe to import now
from app.main import app  # noqa: E402

# Vercel looks for an object named `app` in this module  it is available above
