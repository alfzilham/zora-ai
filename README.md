# ZORA AI 🤖

<div align="center">
  <img src="frontend/public/assets/images/logo/logo.png" alt="ZORA AI Logo" width="120" />
  
  <h3>SuperIntelligence Autonomous AI Platform</h3>
  
  ![Version](https://img.shields.io/badge/version-1.0.0-00D4FF?style=flat-square)
  ![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
  ![Deploy](https://img.shields.io/badge/deploy-Vercel-black?style=flat-square&logo=vercel)
  ![Backend](https://img.shields.io/badge/backend-FastAPI-009688?style=flat-square&logo=fastapi)
  ![Database](https://img.shields.io/badge/database-PostgreSQL-336791?style=flat-square&logo=postgresql)
</div>

---

## Overview

ZORA AI adalah platform AI SuperIntelligence Autonomous yang mengorkestrasikan berbagai model AI secara otomatis berdasarkan intent dari pesan pengguna. Pengguna berinteraksi dengan satu identitas terpadu — **ZORA** — sementara sistem di baliknya mendelegasikan setiap permintaan ke model AI yang paling optimal.

---

## ✨ Fitur Utama

- 🧠 **AI Orchestration** — ZORA otomatis memilih model terbaik untuk setiap tugas
- 💬 **Multi-turn Chat** — Percakapan dengan memori konteks pengguna
- 🔒 **Incognito Mode** — Chat tanpa menyimpan riwayat atau data
- ⚡ **Extended Thinking Mode** — Reasoning mendalam sebelum menjawab
- 🌐 **11 Bahasa** — EN, ID, FR, DE, JA, IT, KO, PT, ES, ZH
- 🔍 **Search History** — Cari riwayat percakapan dengan cepat

### 🔬 Zora Labs
| Lab | Model | Fungsi |
|-----|-------|--------|
| Zora Code | Qwen (NVIDIA) | Generate & debug kode |
| Zora Design | Minimax (NVIDIA) | Brief desain & copywriting |
| Zora Image | Gemini Flash Image | Generate gambar AI |
| Zora Vid | Coming Soon | Generate video AI |
| Zora Research | Gemini | Riset mendalam dengan sumber |

---

## 🤖 AI Models

| Model | Provider | Tugas |
|-------|----------|-------|
| Nemotron | NVIDIA | General chat & Q&A |
| Deepseek | NVIDIA | Math & logical reasoning |
| Qwen | NVIDIA | Coding & debugging |
| Kimi | NVIDIA | Dokumen & PDF panjang |
| Minimax | NVIDIA | Creative writing & copywriting |
| GLM | NVIDIA | Multilingual & Chinese |
| Gemma | NVIDIA | Instruction following |
| Mistral | NVIDIA | Fast multilingual |
| Gemini | Google | Research & image analysis |
| Groq | Groq | Pre-thinking layer |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript (Vanilla) |
| Backend | Python + FastAPI |
| Database | PostgreSQL (Neon) |
| Deploy | Vercel |
| Auth | JWT + Google OAuth |
| Payment | Xendit |

---

## 📁 Project Structure

```
zora-ai/
├── frontend/
│   ├── public/              ← Deployable files (Vercel)
│   └── src/
│       ├── pages/           ← Source HTML pages
│       ├── css/             ← Stylesheets
│       └── js/              ← JavaScript files
├── backend/
│   └── app/
│       ├── routers/         ← API endpoints
│       ├── services/        ← AI model integrations
│       ├── models/          ← Database models
│       ├── middleware/       ← Auth & CORS
│       └── utils/           ← Helpers & utilities
├── backend/prompts/
│   ├── system/              ← ZORA main & personality prompts
│   ├── routing/             ← Intent classifier prompt
│   └── labs/                ← Lab-specific prompts
├── database/
│   └── schema.sql           ← Database schema
├── docs/
│   ├── ROADMAP.md
│   ├── ARCHITECTURE.md
│   ├── PROMPTS.md
│   └── CODEX_SKILL.md
├── AGENTS.md                ← Codex CLI instructions
├── vercel.json              ← Vercel deployment config
└── .env.example             ← Environment variables template
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (via Neon)

### 1. Clone Repository
```bash
git clone https://github.com/USERNAME/zora-ai.git
cd zora-ai
```

### 2. Setup Environment Variables
```bash
cp .env.example backend/.env
```

Edit `backend/.env` dan isi semua variable yang diperlukan.

### 3. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 4. Run Backend
```bash
uvicorn app.main:app --reload --port 8000
```

### 5. Open Frontend
```bash
# Install live-server jika belum ada
npm install -g live-server

cd frontend
live-server --port=3000
```

Buka: `http://localhost:3000/src/pages/auth/login.html`

### 6. Verify API
```
http://127.0.0.1:8000/docs     ← Swagger UI
http://127.0.0.1:8000/health   ← Health check
```

---

## 🔑 Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# NVIDIA AI Models (per model)
NVIDIA_API_KEY_NEMOTRON=
NVIDIA_API_KEY_DEEPSEEK=
NVIDIA_API_KEY_QWEN=
NVIDIA_API_KEY_KIMI=
NVIDIA_API_KEY_MINIMAX=
NVIDIA_API_KEY_GLM=
NVIDIA_API_KEY_GEMMA=
NVIDIA_API_KEY_MISTRAL=
NVIDIA_API_KEY_FALLBACK=

# AI Services
GROQ_API_KEY=
GEMINI_API_KEY=

# Zora Labs
VIDEO_API_ENABLED=false

# Payment
XENDIT_SECRET_KEY=
XENDIT_WEBHOOK_TOKEN=

# App
DEVELOPER_EMAIL=
APP_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
ENV=development
```

---

## 📡 API Endpoints

```
GET  /health                    → Health check
POST /auth/register             → Register user
POST /auth/login                → Login user
POST /auth/google               → Google OAuth
POST /onboarding/name           → Save display name
POST /onboarding/topics         → Save topic preferences
GET  /onboarding/status         → Check onboarding status
POST /chat/send                 → Send message (SSE streaming)
GET  /chat/history              → Get chat history
POST /chat/new                  → New conversation
GET  /settings                  → Get user settings
PUT  /settings/language         → Update language
POST /feedback                  → Submit feedback
POST /labs/code                 → Zora Code
POST /labs/design               → Zora Design
POST /labs/image                → Zora Image
POST /labs/research             → Zora Research
GET  /dashboard/stats           → Developer stats
POST /dashboard/withdraw        → Xendit withdrawal
```

---

## 🚢 Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Tambahkan semua environment variables di **Vercel Dashboard → Settings → Environment Variables**.

---

## 💰 Monetization

Setiap user yang mendaftar dihitung sebagai **Rp1.000.000** dalam dashboard developer. Developer dapat menarik penghasilan via **Xendit Payment Gateway** langsung dari dashboard.

---

## 📄 License

MIT License — © 2026 ZORA AI

---

<div align="center">
  Built with ❤️ using FastAPI, PostgreSQL, and multiple AI models
</div>