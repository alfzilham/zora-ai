# ── Base image ─────────────────────────────────────────────
FROM python:3.11-slim

# ── System dependencies ────────────────────────────────────
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Working directory ──────────────────────────────────────
WORKDIR /app

# ── Copy requirements first (layer caching) ───────────────
COPY requirements.txt .

# ── Install Python dependencies ────────────────────────────
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Copy application code ──────────────────────────────────
COPY . .

# ── Create necessary directories ──────────────────────────
RUN mkdir -p static/generated && \
    mkdir -p .remember/logs/autonomous && \
    mkdir -p prompts/system && \
    mkdir -p prompts/routing && \
    mkdir -p prompts/labs

# ── Expose port ────────────────────────────────────────────
EXPOSE 8000

# ── Start server ───────────────────────────────────────────
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]