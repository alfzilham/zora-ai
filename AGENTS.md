Codex CLI **secara otomatis membaca AGENTS.md** setiap kali dijalankan dari folder tersebut. Ini adalah "system prompt permanen" untuk seluruh proyek.

```markdown
# ZORA AI — Codex Agent Instructions

## Project Identity
Nama proyek: ZORA AI
Tipe: SuperIntelligence Autonomous AI Platform
Status: Solo project, dibangun dari nol per fase

## Tech Stack
- Frontend: HTML, CSS, JavaScript (Vanilla — NO frameworks)
- Backend: Python + FastAPI
- Database: PostgreSQL (Neon)
- Deploy: Vercel
- Auth: JWT + Google OAuth
- Payment: Xendit
- AI Models: NVIDIA NIM, Gemini, Groq, Nano Banana

## Folder Structure
zora-ai/
├── frontend/
│   ├── public/           ← index.html, favicon.ico
│   └── src/
│       ├── pages/        ← auth/, onboarding/, chat/, labs/, dashboard/, settings/
│       ├── css/          ← global.css, variables.css, per-page CSS
│       └── js/           ← per-page JS, utils/
├── backend/
│   └── app/
│       ├── routers/      ← auth.py, chat.py, onboarding.py, labs.py, dll
│       ├── services/     ← orchestrator.py, nvidia.py, gemini.py, groq_service.py
│       ├── models/       ← user.py, chat.py, memory.py
│       ├── middleware/   ← auth_middleware.py, cors.py
│       ├── utils/        ← prompt_builder.py, token_counter.py
│       ├── main.py
│       ├── config.py
│       └── database.py
├── backend/prompts/
│   ├── system/           ← zora_main.txt, zora_personality.txt
│   ├── routing/          ← intent_classifier.txt
│   └── labs/             ← code.txt, design.txt, image.txt, vid.txt, research.txt
├── database/
│   └── schema.sql
└── docs/
    ├── ROADMAP.md
    ├── ARCHITECTURE.md
    ├── PROMPTS.md
    └── CODEX_SKILL.md    ← file ini

## Design System
- Background utama: #0a0a0f (hitam gelap)
- Primary color: #00D4FF (cyan elektrik)
- Secondary: #0066FF (biru)
- Text: #FFFFFF, #A0A0B0 (abu-abu untuk subtitle)
- Font: Inter atau system-ui
- Border radius: 12px (card), 8px (button), 24px (pill)
- Semua halaman dark theme

## Coding Rules
1. Backend Python: selalu gunakan async/await di FastAPI
2. Semua endpoint yang butuh login harus pakai JWT middleware
3. Frontend JS: vanilla only, tidak boleh import React/Vue/dll
4. CSS: gunakan CSS variables dari variables.css
5. Jangan pernah hardcode API key — selalu dari os.getenv()
6. Setiap response API harus format: {"status": "success/error", "data": ..., "message": ...}
7. Error handling wajib ada di setiap endpoint
8. CORS sudah dikonfigurasi di middleware/cors.py — jangan duplikasi

## AI Model Reference
| ENV Variable              | Model ID                    | Tugas                    |
|---------------------------|----------------------------|--------------------------|
| NVIDIA_API_KEY_NEMOTRON   | nemotron-3-super-120b-a12b | General chat             |
| NVIDIA_API_KEY_DEEPSEEK   | deepseek-v3.2              | Math & logic             |
| NVIDIA_API_KEY_QWEN       | qwen3.5-122b-a10b          | Coding                   |
| NVIDIA_API_KEY_KIMI       | kimi-k2.5                  | Dokumen panjang          |
| NVIDIA_API_KEY_MINIMAX    | minimax-m2.7               | Creative writing         |
| NVIDIA_API_KEY_GLM        | glm-5.1                    | Multilingual             |
| NVIDIA_API_KEY_GEMMA      | gemma-4-31b-it             | Instruction following    |
| NVIDIA_API_KEY_MISTRAL    | mistral-small-4-119b-2603  | Fast multilingual        |
| GEMINI_API_KEY            | gemini-2.0-flash           | Research & image         |
| GROQ_API_KEY              | llama-3.3-70b-versatile    | Pre-thinking layer       |
| NANO_BANANA_API_KEY       | -                          | Image & video generation |
| NVIDIA_API_KEY_FALLBACK   | (semua model)              | Fallback jika rate limit |

## NVIDIA API Base URL
https://integrate.api.nvidia.com/v1
Format request: OpenAI-compatible (gunakan openai Python SDK dengan base_url override)

## Database Models
- users: id, name, email, password_hash, google_id, created_at
- user_profiles: user_id, display_name, topics (JSONB), language, onboarding_done
- conversations: id, user_id, title, is_incognito, created_at
- messages: id, conversation_id, role, content, model_used, created_at
- memory: id, user_id, key, value, updated_at
- feedback: id, user_id, message, created_at

## Jangan Lakukan Ini
- Jangan install dependencies baru tanpa menambahkannya ke requirements.txt
- Jangan buat file di luar struktur folder yang sudah ada
- Jangan gunakan SQLite — selalu PostgreSQL via DATABASE_URL
- Jangan gunakan framework CSS (Bootstrap, Tailwind) — pure CSS
- Jangan hapus atau overwrite file yang sudah ada tanpa instruksi eksplisit
```