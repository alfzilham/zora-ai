# ZORA AI — Codex CLI Skill Guide
> Panduan lengkap menggunakan OpenAI Codex CLI untuk membangun ZORA AI secara optimal.
> Simpan file ini di: `zora-ai/docs/CODEX_SKILL.md`

---

## BAGIAN 1 — INSTALASI CODEX CLI

### Persyaratan Sistem
- Node.js versi 22 atau lebih baru
- npm atau yarn
- OS: Windows (PowerShell), macOS, atau Linux
- OpenAI API Key (dari platform.openai.com)

### Langkah Instalasi

```powershell
# 1. Cek versi Node.js (harus 22+)
node --version

# 2. Install Codex CLI secara global
npm install -g @openai/codex

# 3. Verifikasi instalasi berhasil
codex --version
```

### Setup API Key

```powershell
# Windows PowerShell — set untuk sesi ini
$env:OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxx"

# Windows — set permanen (environment variable)
[System.Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-xxxx", "User")

# Verifikasi
echo $env:OPENAI_API_KEY
```

---

## BAGIAN 2 — KONFIGURASI CODEX UNTUK ZORA AI

### File Konfigurasi Utama
Buat file ini di root project: `zora-ai/AGENTS.md`

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

---

## BAGIAN 3 — CARA MENJALANKAN CODEX

### Mode Dasar

```powershell
# Masuk ke folder proyek dulu
cd zora-ai

# Mode interaktif (rekomendasi untuk development)
codex

# Kirim task langsung via argumen
codex "buat endpoint POST /auth/login di backend/app/routers/auth.py"

# Mode full-auto (Codex kerjakan tanpa konfirmasi)
codex --approval-mode full-auto "kerjakan semua endpoint di routers/chat.py"
```

### Mode Approval (Penting!)

| Mode | Perintah | Keterangan |
|------|----------|------------|
| **suggest** | `codex` (default) | Codex sarankan perubahan, kamu approve tiap langkah |
| **auto-edit** | `codex --approval-mode auto-edit` | Edit file otomatis, tapi tanya sebelum jalankan command |
| **full-auto** | `codex --approval-mode full-auto` | Semua otomatis tanpa konfirmasi |

> **Rekomendasi untuk ZORA AI:** Gunakan `auto-edit` untuk fase-fase awal agar kamu tetap kontrol. Gunakan `full-auto` hanya untuk task yang sudah jelas scope-nya.

---

## BAGIAN 4 — TEMPLATE PROMPT PER FASE

### 🔵 FASE 1 — Auth & Foundation
```
Baca docs/ARCHITECTURE.md dan docs/ROADMAP.md terlebih dahulu.

Kerjakan FASE 1 — AUTH dari ZORA AI.

Backend tasks:
1. Setup FastAPI di backend/app/main.py dengan CORS, router registration
2. Konfigurasi database connection di backend/app/database.py (SQLAlchemy async + PostgreSQL)
3. Buat config.py yang load semua env variables
4. Buat model User di backend/app/models/user.py (SQLAlchemy ORM)
5. Buat backend/app/routers/auth.py dengan endpoint:
   - POST /auth/register (email, password, name)
   - POST /auth/login (return JWT access token)
   - POST /auth/logout
   - POST /auth/google (Google OAuth token verification)
6. Buat JWT middleware di backend/app/middleware/auth_middleware.py
7. Update requirements.txt dengan semua dependencies yang dipakai

Frontend tasks:
1. Buat frontend/src/css/variables.css (semua CSS variables warna & spacing)
2. Buat frontend/src/css/global.css (reset, typography, utility classes)
3. Buat frontend/src/css/auth.css
4. Buat frontend/src/pages/auth/login.html (dark theme, logo ZORA, form email+password, tombol Google)
5. Buat frontend/src/pages/auth/signup.html
6. Buat frontend/src/js/auth.js (handle login, signup, Google OAuth, JWT storage di localStorage)

Database tasks:
1. Update database/schema.sql dengan CREATE TABLE users dan user_profiles

Deploy:
1. Buat vercel.json yang routing /api/* ke FastAPI backend

Mulai dari backend, lalu frontend. Pastikan semua file masuk ke folder yang benar.
```

### 🟢 FASE 2 — Onboarding
```
Baca docs/ARCHITECTURE.md dan docs/ROADMAP.md.
Phase 1 sudah selesai — auth dan JWT sudah berjalan.

Kerjakan FASE 2 — ONBOARDING dari ZORA AI.

Backend tasks:
1. Tambahkan model UserProfile ke backend/app/models/user.py
   Fields: user_id (FK), display_name, topics (JSONB), language (default 'id'), onboarding_done (bool)
2. Tambahkan model Memory ke backend/app/models/memory.py
   Fields: id, user_id, key, value, updated_at
3. Buat backend/app/routers/onboarding.py:
   - POST /onboarding/name → simpan display_name
   - POST /onboarding/topics → simpan topics array (min 2 items), set onboarding_done=true
   - GET /onboarding/status → return {onboarding_done: bool}
4. Setelah onboarding selesai, simpan ke tabel memory:
   key="user_name" value=display_name
   key="user_topics" value=JSON string dari topics
5. Daftarkan router di main.py

Frontend tasks:
1. Buat frontend/src/css/onboarding.css
2. Buat frontend/src/pages/onboarding/name.html
   - Sambutan "Halo! Saya ZORA. Siapa namamu?"
   - Input nama, tombol Lanjutkan
   - Dark theme dengan animasi fade-in
3. Buat frontend/src/pages/onboarding/topics.html
   - Grid 12 topik (Technology, Science, Business, Arts & Design, Health, Education, 
     Entertainment, Sports, Travel, Food, Finance, Gaming)
   - Pilih minimal 2 — counter "X/12 dipilih"
   - Tombol Lanjutkan aktif hanya jika >=2 terpilih
4. Buat frontend/src/pages/onboarding/hello.html
   - Sambutan personal: "Halo [nama]! Selamat datang di ZORA AI"
   - Tampilkan 5 fitur Labs dengan ikon
   - Tombol "Mulai Chat" → redirect ke /src/pages/chat/index.html
5. Buat frontend/src/js/onboarding.js

Redirect logic di auth.js:
- Setelah login sukses, hit GET /onboarding/status
- onboarding_done = false → redirect onboarding/name.html
- onboarding_done = true → redirect chat/index.html
```

### 🟡 FASE 3 — Chat UI & AI Orchestrator
```
Baca docs/ARCHITECTURE.md, docs/ROADMAP.md, dan docs/PROMPTS.md.
Phase 1 & 2 sudah selesai.

Kerjakan FASE 3 — CHAT UI & AI ORCHESTRATOR dari ZORA AI.

Backend — AI Orchestrator (paling penting):
1. Buat backend/app/services/intent_detector.py
   - Kirim pesan user ke Groq (llama-3.3-70b-versatile)
   - Gunakan prompt dari backend/prompts/routing/intent_classifier.txt
   - Parse response JSON: {primary_model, pre_think, confidence, reason}
   
2. Buat backend/app/services/nvidia.py
   - Fungsi call_nvidia_model(model_id, api_key, messages, stream=True)
   - Base URL: https://integrate.api.nvidia.com/v1
   - Gunakan openai Python library dengan base_url override
   - Load API key dari env berdasarkan model yang dipilih
   - Fallback otomatis ke NVIDIA_API_KEY_FALLBACK jika rate limited (429)

3. Buat backend/app/services/gemini.py
   - Fungsi call_gemini(messages, stream=True)
   - Gunakan google-generativeai library

4. Buat backend/app/services/groq_service.py
   - Fungsi call_groq(messages) untuk pre-thinking layer
   - Gunakan groq Python library

5. Buat backend/app/services/orchestrator.py
   - Fungsi utama: async def orchestrate(user_message, user_context, stream=True)
   - Flow: detect_intent → (optional groq pre-think) → call primary model → stream response
   - Inject memory ke system prompt: nama user, topik, bahasa, history
   - Load system prompt dari backend/prompts/system/zora_main.txt
   - ZORA selalu menjawab sebagai "ZORA" — tidak pernah sebut nama model

6. Buat backend/app/services/memory.py
   - get_user_memory(user_id) → return dict {key: value}
   - set_memory(user_id, key, value)

7. Buat backend/app/models/chat.py
   - Model Conversation: id, user_id, title, is_incognito, created_at
   - Model Message: id, conversation_id, role, content, model_used, created_at

8. Buat backend/app/routers/chat.py dengan endpoint:
   - POST /chat/send → trigger orchestrator, return Server-Sent Events (SSE) stream
   - GET /chat/history → list semua conversation user
   - GET /chat/{id}/messages → pesan dalam satu conversation
   - POST /chat/new → buat conversation baru
   - DELETE /chat/{id} → hapus conversation
   - POST /chat/title → auto-generate title dari pesan pertama

Backend — Incognito Mode:
- Jika is_incognito=true: jangan simpan ke DB, jangan inject memory, jangan tampilkan di history

Frontend:
1. Buat frontend/src/css/chat.css
2. Buat frontend/src/pages/chat/index.html dengan layout:
   LEFT SIDEBAR (260px):
   - Logo ZORA + nama
   - Tombol "+ New Chat"  
   - Search bar history
   - List chat (title + tanggal)
   - Di bawah: icon AI Logs, icon Incognito
   - Avatar user + email di paling bawah
   
   MAIN AREA:
   - Header: Chat title + tombol rename
   - Chat bubbles (user kanan, ZORA kiri dengan avatar)
   - Streaming indicator (animated dots saat ZORA mengetik)
   - Markdown rendering untuk response ZORA
   
   BOTTOM BAR:
   - Tombol Extended Thinking toggle
   - Input textarea (auto-resize)
   - Tombol Voice Note (mic icon)
   - Tombol Send

3. Buat frontend/src/js/chat.js:
   - Koneksi SSE ke POST /chat/send
   - Render markdown (gunakan marked.js dari CDN)
   - Auto-scroll ke bawah saat ada pesan baru
   - Simpan JWT di header setiap request
   - Handle incognito mode (sembunyikan sidebar history)
   - Voice note: Web Speech API → transcript → kirim sebagai teks
   - Auto-title setelah pesan pertama dikirim

Update database/schema.sql dengan tabel conversations dan messages.
```

### 🟠 FASE 4 — Settings & FAQ
```
Phase 1, 2, 3 sudah selesai.
Kerjakan FASE 4 — SETTINGS, BAHASA & FAQ dari ZORA AI.

Backend:
1. Buat backend/app/routers/settings.py:
   - PUT /settings/language → update bahasa di user_profiles
   - PUT /settings/preferences → update preferensi lain
   - GET /faq → return list FAQ (bisa hardcode di Python)
2. Buat backend/app/models/feedback.py: id, user_id, message, rating (1-5), created_at
3. Tambahkan ke routers/settings.py:
   - POST /feedback → simpan feedback user
   - GET /admin/feedback → protected, hanya admin (cek role di JWT)

Frontend:
1. Buat frontend/src/css/settings.css
2. Settings sebagai LIGHTBOX/MODAL yang muncul dari tombol di chat sidebar
3. Isi lightbox:
   - Tab: Umum | Bahasa | Bantuan | Tentang
   - Bahasa: dropdown 11 bahasa (EN, FR, DE, JA, ID, IT, KO, PT-BR, ES-419, ES, ZH)
   - FAQ: accordion expand/collapse
   - Feedback: textarea + rating bintang + tombol Kirim
   - Tombol Logout (merah, di paling bawah)
4. Tambahkan trigger tombol settings di chat sidebar
5. Update frontend/src/js/settings.js
```

### 🔴 FASE 5 — Zora Labs
```
Phase 1-4 sudah selesai.
Kerjakan FASE 5 — ZORA LABS dari ZORA AI.
Baca docs/PROMPTS.md untuk system prompt tiap lab.

Backend:
1. Buat backend/app/routers/labs.py dengan endpoint:
   - POST /labs/code → panggil Qwen via nvidia.py, return SSE stream
   - POST /labs/design → panggil Minimax via nvidia.py, return SSE stream
   - POST /labs/image → panggil Nano Banana API, return image URL
   - POST /labs/vid → panggil Nano Banana API, return video URL
   - POST /labs/research → panggil Gemini dengan mode deep research, return SSE stream
   
2. Buat backend/app/services/nano_banana.py:
   - generate_image(prompt: str) → return image_url
   - generate_video(prompt: str) → return video_url
   - Load NANO_BANANA_API_KEY dari env

3. Setiap lab endpoint harus load system prompt dari backend/prompts/labs/ yang sesuai

Frontend — buat halaman untuk tiap lab:
1. labs/code.html — code editor (textarea monospace) + output panel + syntax highlight
2. labs/design.html — input brief, output: Concept/Colors/Typography/Copy sections
3. labs/image.html — input prompt, style selector, tombol Generate, image preview + download
4. labs/vid.html — input prompt, tombol Generate, video player + progress bar (30-120s wait)
5. labs/research.html — input query, depth selector (Quick/Standard/Deep), output terstruktur

6. Tambahkan navigasi ke Labs dari chat sidebar (ikon Labs sudah ada di sidebar)
7. Buat frontend/src/css/labs.css
8. Buat frontend/src/js/labs.js (handler untuk semua lab pages)
```

### 🟣 FASE 6 — Dashboard & Monetisasi
```
Phase 1-5 sudah selesai.
Kerjakan FASE 6 — DASHBOARD & MONETISASI dari ZORA AI.

Backend:
1. Buat backend/app/routers/dashboard.py:
   - GET /dashboard/stats → total users, users per bulan, users per negara, total earnings
   - Kalkulasi: total_earnings = total_users × 1000000 (dalam Rupiah)
   - POST /dashboard/withdraw → trigger Xendit disbursement API
   - GET /dashboard/withdraw/status → cek status penarikan

2. Buat backend/app/services/xendit.py:
   - create_disbursement(amount, bank_code, account_number, description)
   - get_disbursement_status(disbursement_id)
   - verify_webhook(token) → validasi Xendit webhook
   - Load XENDIT_SECRET_KEY dan XENDIT_WEBHOOK_TOKEN dari env

3. Tambahkan kolom country di tabel users (detect dari IP saat register)
4. Buat route POST /xendit/webhook untuk konfirmasi pembayaran dari Xendit

Frontend:
1. Buat frontend/src/css/dashboard.css
2. Buat frontend/src/pages/dashboard/index.html (HANYA untuk developer/admin):
   - Header: "ZORA AI Dashboard" + tanggal hari ini
   - Card stats: Total Users | Bulan Ini | Total Earnings (Rp)
   - Chart: Line chart pengguna per bulan (gunakan Chart.js dari CDN)
   - Tabel: Top 10 negara pengguna terbanyak
   - Section withdraw: input nominal, pilih bank, tombol "Tarik Dana"
   - Status riwayat penarikan
3. Dashboard hanya bisa diakses jika role=admin di JWT
4. Buat frontend/src/js/dashboard.js
```

---

## BAGIAN 5 — BEST PRACTICES PROMPTING CODEX

### Formula Prompt yang Optimal

```
[Konteks] + [Baca file ini] + [Task spesifik] + [Aturan] + [Output yang diharapkan]
```

### Tips Penting

**1. Selalu sebut file path yang spesifik**
```
# ❌ Kurang spesifik
"buat auth endpoint"

# ✅ Lebih baik
"buat POST /auth/login di backend/app/routers/auth.py, 
gunakan model User dari backend/app/models/user.py,
return JWT token yang di-generate di backend/app/utils/token.py"
```

**2. Berikan contoh response format**
```
"Semua endpoint harus return format:
{
  'status': 'success' atau 'error',
  'data': {...} atau null,
  'message': 'deskripsi singkat'
}"
```

**3. Batasi scope per sesi**
```
# Jangan minta terlalu banyak sekaligus
# Per sesi idealnya: 1 router + 1 service + halaman frontend yang terkait
```

**4. Gunakan referensi ke file yang sudah ada**
```
"Ikuti pola yang sama dengan backend/app/routers/auth.py 
untuk membuat backend/app/routers/chat.py"
```

**5. Minta konfirmasi dependencies**
```
"Setelah selesai, tampilkan daftar library Python baru 
yang perlu ditambahkan ke requirements.txt"
```

---

## BAGIAN 6 — TROUBLESHOOTING UMUM

### Codex berhenti di tengah task besar
```powershell
# Lanjutkan dengan prompt
codex "lanjutkan task sebelumnya — berhenti di [nama file]. selesaikan sampai tuntas"
```

### File yang digenerate tidak sesuai struktur
```powershell
# Reset dengan konteks eksplisit
codex "baca AGENTS.md dulu. lalu perbaiki [nama file] agar sesuai struktur folder di AGENTS.md"
```

### Codex menginstall library yang tidak perlu
```powershell
codex "jangan install library baru. gunakan hanya yang sudah ada di requirements.txt. 
implementasikan [task] menggunakan: fastapi, sqlalchemy, python-jose, passlib"
```

### Error saat testing endpoint
```powershell
codex "endpoint POST /auth/login return error: [paste error]. 
debug dan perbaiki di backend/app/routers/auth.py"
```

---

## BAGIAN 7 — WORKFLOW HARIAN YANG DISARANKAN

```powershell
# 1. Masuk ke folder proyek
cd zora-ai

# 2. Jalankan Codex
codex

# 3. Di dalam Codex, mulai dengan konteks
> Baca AGENTS.md dan docs/ROADMAP.md. 
  Kita sekarang mengerjakan [FASE X]. 
  Yang sudah selesai: [list yang sudah done].
  Mulai dari [task spesifik].

# 4. Setelah Codex selesai, test dulu sebelum lanjut
# Jalankan backend:
cd backend && uvicorn app.main:app --reload

# Test endpoint dengan curl atau Postman

# 5. Kalau OK, lanjut task berikutnya
```

---

## BAGIAN 8 — CHECKLIST PER FASE

### Fase 1 ✅ (Sudah Selesai)
- [x] FastAPI setup
- [x] PostgreSQL connection
- [x] User model
- [x] Auth endpoints (register, login, logout, google)
- [x] JWT middleware
- [x] Login & Signup HTML

### Fase 2 — Onboarding
- [ ] UserProfile model
- [ ] Memory model
- [ ] Onboarding endpoints (name, topics, status)
- [ ] Memory tersimpan ke tabel memory
- [ ] name.html, topics.html, hello.html
- [ ] Redirect logic dari login → onboarding → chat

### Fase 3 — Chat UI
- [ ] Intent detector (Groq)
- [ ] NVIDIA service (semua model + fallback)
- [ ] Gemini service
- [ ] Groq service
- [ ] Orchestrator (routing + memory injection)
- [ ] Chat endpoints (send/SSE, history, new, delete)
- [ ] Chat UI HTML (sidebar + main + bottom bar)
- [ ] Streaming response di frontend
- [ ] Incognito mode
- [ ] Voice note

### Fase 4 — Settings
- [ ] Settings endpoints (language, preferences)
- [ ] Feedback model + endpoints
- [ ] Settings lightbox HTML
- [ ] 11 bahasa di dropdown
- [ ] FAQ accordion
- [ ] Feedback form

### Fase 5 — Labs
- [ ] Labs endpoints (code, design, image, vid, research)
- [ ] Nano Banana service
- [ ] 5 halaman lab HTML
- [ ] Navigasi dari sidebar

### Fase 6 — Dashboard
- [ ] Stats endpoints
- [ ] Xendit service (disbursement)
- [ ] Dashboard HTML + Chart.js
- [ ] Withdraw flow
- [ ] Admin-only access

---

## BAGIAN 9 — REFERENSI CEPAT

### Jalankan Backend Lokal
```powershell
cd zora-ai/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Akses API Docs
```
http://localhost:8000/docs     ← Swagger UI
http://localhost:8000/redoc    ← ReDoc
```

### Test Auth Flow
```powershell
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"test123"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

### Deploy ke Vercel
```powershell
# Install Vercel CLI
npm install -g vercel

# Deploy dari root folder
cd zora-ai
vercel --prod
```

---

*ZORA AI Codex Skill — dibuat untuk solo development workflow*
*Update file ini setiap ada perubahan arsitektur besar*