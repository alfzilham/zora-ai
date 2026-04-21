================================================
  ZORA AI — MASTER ROADMAP
  Solo Project | FastAPI + HTML/CSS/JS | Vercel
================================================

FASE 1 — FONDASI & AUTH
━━━━━━━━━━━━━━━━━━━━━━━
Goal: User bisa register, login, dan logout.

Backend:
  - Setup FastAPI project structure
  - Koneksi PostgreSQL via SQLAlchemy
  - Model: User (id, name, email, password_hash, created_at)
  - Endpoint: POST /auth/register
  - Endpoint: POST /auth/login (return JWT token)
  - Endpoint: POST /auth/logout
  - Endpoint: POST /auth/google (OAuth Google)
  - JWT middleware untuk protected routes

Frontend:
  - login.html + auth.css + auth.js
  - signup.html
  - Google OAuth button
  - Redirect logic: sudah login → chat, belum → login

Database:
  - schema.sql: tabel users
  - Migration awal

Deploy:
  - vercel.json config (FastAPI as serverless)
  - .env setup (DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 2 — ONBOARDING
━━━━━━━━━━━━━━━━━━━
Goal: User baru diarahkan ke onboarding 3 langkah.

Backend:
  - Model: UserProfile (user_id, display_name, topics, onboarding_done)
  - Endpoint: POST /onboarding/name
  - Endpoint: POST /onboarding/topics
  - Endpoint: GET /onboarding/status
  - Simpan nama & topik ke AI Memory (database)

Frontend:
  - name.html → input nama
  - topics.html → pilih min. 2 topik (grid checkbox)
  - hello.html → sambutan ZORA + pengenalan fitur
  - Auto-redirect ke /chat setelah selesai

Topics tersedia:
  Technology, Science, Business, Arts & Design,
  Health, Education, Entertainment, Sports,
  Travel, Food, Finance, Gaming

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 3 — CHAT UI (INTI)
━━━━━━━━━━━━━━━━━━━━━━━
Goal: User bisa chat dengan ZORA AI.

Backend:
  - Model: Conversation (id, user_id, title, created_at)
  - Model: Message (id, conversation_id, role, content, model_used, created_at)
  - Endpoint: POST /chat/send (trigger orchestrator)
  - Endpoint: GET /chat/history
  - Endpoint: POST /chat/new
  - Endpoint: DELETE /chat/{id}
  - Streaming response (Server-Sent Events)
  - Orchestrator: intent detection → route ke model
  - Groq pre-thinking layer
  - AI Memory injection ke system prompt

Frontend:
  - chat/index.html (layout utama)
  - Left sidebar: search history, list chat, AI Logs icon
  - Main area: chat bubble UI, streaming response
  - Bottom bar: input, voice note, send button
  - Extended thinking mode toggle
  - Model AI droplist (nama tetap ZORA, bukan nama model)
  - New chat button
  - Incognito chat mode
  - Auto-title dari pesan pertama

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 4 — SETTINGS, BAHASA & FAQ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Goal: User bisa ubah preferensi dan lihat bantuan.

Backend:
  - Endpoint: PUT /settings/language
  - Endpoint: PUT /settings/preferences
  - Endpoint: GET /faq

Frontend:
  - Settings lightbox (dropdown dari navbar)
  - Pilihan bahasa (11 bahasa)
  - FAQ accordion
  - Feedback form (kirim ke backend)
  - Logout button

Backend:
  - Model: Feedback (id, user_id, message, created_at)
  - Endpoint: POST /feedback
  - Admin endpoint: GET /admin/feedback (protected)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 5 — ZORA LABS
━━━━━━━━━━━━━━━━━━
Goal: Fitur-fitur khusus Labs aktif.

Backend:
  - Endpoint: POST /labs/code
  - Endpoint: POST /labs/design
  - Endpoint: POST /labs/image (Nano Banana API)
  - Endpoint: POST /labs/vid (Nano Banana API)
  - Endpoint: POST /labs/research (Gemini Deep Research)

Frontend:
  - labs/code.html — code editor UI + output
  - labs/design.html — brief generator UI
  - labs/image.html — prompt input + image preview
  - labs/vid.html — prompt input + video player
  - labs/research.html — research query + structured output

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 6 — DASHBOARD & MONETISASI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Goal: Developer bisa lihat statistik dan tarik uang.

Backend:
  - Endpoint: GET /dashboard/stats
    (total user, user per bulan, user per negara)
  - Endpoint: POST /dashboard/withdraw (Xendit API)
  - Xendit webhook: konfirmasi pembayaran
  - Kalkulasi: total_users × Rp1.000.000

Frontend:
  - dashboard/index.html
  - Grafik: user per bulan, per tahun
  - Peta: user per negara
  - Tombol "Tarik Dana" → Xendit
  - Total earnings display

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL — POLISH & DEPLOY
━━━━━━━━━━━━━━━━━━━━━━━
  - SEO meta tags + Open Graph
  - Performance optimization
  - Error handling global
  - Rate limiting
  - Security audit
  - Full Vercel production deploy
  - Domain setup
================================================