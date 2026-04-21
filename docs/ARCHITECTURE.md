# ZORA AI — Architecture

## Overview
ZORA AI is a SuperIntelligence Autonomous platform that orchestrates
multiple AI models to handle user requests. Users interact with a
single unified identity (ZORA), while internally the system routes
each request to the most capable model available.

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | HTML, CSS, JavaScript (Vanilla)   |
| Backend    | Python, FastAPI                   |
| Database   | PostgreSQL (Neon)                 |
| Deploy     | Vercel                            |
| Auth       | JWT + Google OAuth                |
| Payment    | Xendit                            |

---

## AI Models & Duties

| Model                        | Provider | Exact Model ID                    | Primary Duty                          |
|------------------------------|----------|-----------------------------------|---------------------------------------|
| Nemotron                     | NVIDIA   | nemotron-3-super-120b-a12b        | General chat, Q&A, everyday tasks     |
| Deepseek                     | NVIDIA   | deepseek-v3.2                     | Math, logic, analytical reasoning     |
| Qwen                         | NVIDIA   | qwen3.5-122b-a10b                 | Coding, debugging, code explanation   |
| Kimi                         | NVIDIA   | kimi-k2.5                         | Long documents, PDF analysis          |
| Minimax                      | NVIDIA   | minimax-m2.7                      | Creative writing, copywriting         |
| GLM                          | NVIDIA   | glm-5.1                           | Multilingual, Chinese language        |
| Gemma                        | NVIDIA   | gemma-4-31b-it                    | Instruction following, backup general |
| Mistral                      | NVIDIA   | mistral-small-4-119b-2603         | Multilingual support, fast response   |
| Gemini                       | Google   | gemini-2.0-flash                  | Research, web-aware, image analysis   |
| Groq                         | Groq     | llama-3.3-70b-versatile           | Pre-thinking layer, complex reasoning |
| Nano Banana                  | External | -                                 | Image & video generation              |

---

## Routing Flow

```
User Message
     ↓
Intent Detector (intent_classifier prompt via Groq)
     ↓
Returns JSON: { primary_model, pre_think, confidence }
     ↓
[if pre_think = true]
     → Groq reasons first → result passed to primary model
[if pre_think = false]
     → Direct call to primary model
     ↓
[if primary model fails / rate limited]
     → Fallback key triggered automatically
     ↓
Response returned to user as "ZORA"
```

---

## Routing Rules

| Condition                                      | Model Assigned     |
|------------------------------------------------|--------------------|
| Code, programming, debug                       | Qwen               |
| Math, logic, data analysis                     | Deepseek           |
| Long document, PDF, summarize large text       | Kimi               |
| Creative writing, story, ads, copywriting      | Minimax            |
| Research, news, facts, citations               | Gemini             |
| Chinese language, multilingual output          | GLM                |
| Fast multilingual, secondary multilingual      | Mistral            |
| Simple instruction, quick Q&A backup          | Gemma              |
| Complex multi-step, needs pre-reasoning        | Groq → best model  |
| General chat, everyday conversation            | Nemotron           |
| Any model rate limited                         | Fallback key retry |

---

## Zora Labs — Model Mapping

| Lab Feature   | Model Used                              | Status      |
|---------------|-----------------------------------------|-------------|
| Zora Code     | Qwen (qwen3.5-122b-a10b) via NVIDIA     | ✅ Active   |
| Zora Design   | Minimax (minimax-m2.7) via NVIDIA       | ✅ Active   |
| Zora Image    | Gemini Flash Image (Nano Banana)        | ✅ Active   |
| Zora Vid      | Coming Soon                             | 🚧 Disabled |
| Zora Research | Gemini (gemini-2.0-flash)               | ✅ Active   |

---

## Database Schema (Summary)

- **users** — id, name, email, password_hash, created_at
- **user_profiles** — user_id, display_name, topics, language, onboarding_done
- **conversations** — id, user_id, title, is_incognito, created_at
- **messages** — id, conversation_id, role, content, model_used, created_at
- **memory** — id, user_id, key, value, updated_at
- **feedback** — id, user_id, message, created_at

---

## API Structure (Summary)

```
/auth         → register, login, logout, google
/onboarding   → name, topics, status
/chat         → send, history, new, delete
/settings     → language, preferences
/feedback     → submit, admin view
/labs         → code, design, image, vid, research
/dashboard    → stats, withdraw
```

---

## Environment Variables

```env
# Database
DATABASE_URL=

# JWT
JWT_SECRET=
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# NVIDIA — per model
NVIDIA_API_KEY_NEMOTRON=
NVIDIA_API_KEY_DEEPSEEK=
NVIDIA_API_KEY_QWEN=
NVIDIA_API_KEY_KIMI=
NVIDIA_API_KEY_MINIMAX=
NVIDIA_API_KEY_GLM=
NVIDIA_API_KEY_GEMMA=
NVIDIA_API_KEY_MISTRAL=
NVIDIA_API_KEY_FALLBACK=

# Groq
GROQ_API_KEY=

# Gemini (covers both chat/research AND Zora Image via Nano Banana)
GEMINI_API_KEY=

# Zora Vid — disabled until video API is integrated
VIDEO_API_ENABLED=false

# Payment
XENDIT_SECRET_KEY=
XENDIT_WEBHOOK_TOKEN=

# App
APP_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
ENV=development
```

---

## Deployment

- Platform: Vercel
- Backend: FastAPI as Vercel Serverless Functions
- Config: vercel.json routes /api/* to FastAPI
- Environment variables: stored in Vercel dashboard

---

## Monetization Logic

```
Every new user who signs up
         ↓
Counted in dashboard as Rp1.000.000
         ↓
Developer can withdraw via Xendit Payment Gateway
```