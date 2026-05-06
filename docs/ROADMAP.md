# Both AI — Master Roadmap
## Superintelligence Autonomous Platform | FastAPI + React/Vite | Vercel

---

## Phase 0 — Foundation Extraction
**Goal:** Establish the clean codebase baseline: auth, database, deployment pipeline, and project scaffold.

| # | Deliverable | Components | Complexity | Success Criteria |
|---|---|---|---|---|
| 0.1 | FastAPI project scaffold | `backend/app/main.py`, `config.py`, `database.py` | Low | Server starts, `/health` returns 200 |
| 0.2 | PostgreSQL connection | `database.py`, SQLAlchemy models | Low | Connection pool established, schema migrations run |
| 0.3 | User auth — register + login | `routers/auth.py`, `models/user.py` | Low | JWT returned on login; protected route returns 401 without token |
| 0.4 | Google OAuth 2.0 | `routers/auth.py`, Google OAuth flow | Medium | Google login redirects → callback → JWT issued |
| 0.5 | GitHub OAuth 2.0 | `routers/auth.py`, GitHub OAuth flow | Medium | GitHub login redirects → callback → JWT issued |
| 0.6 | JWT middleware | `middleware/auth_middleware.py` | Low | All protected routes reject expired/invalid tokens |
| 0.7 | React + Vite frontend scaffold | `frontend/src/`, Vite config | Low | `npm run dev` serves app at localhost:3000 |
| 0.8 | Auth pages | `pages/Login`, `pages/Register`, `pages/Callback` | Low | User can register and log in via UI |
| 0.9 | Vercel deployment | `vercel.json`, GitHub Actions CI | Medium | Production deploy succeeds; `/api/*` routes to FastAPI |
| 0.10 | Environment config | `.env`, `config.py` | Low | All API keys loaded; missing key raises startup error |

**Dependencies:** None
**Milestone:** User can register, log in via Google/GitHub, and reach the chat interface in production.

---

## Phase 1 — Supervisor Core
**Goal:** Build the Supervisor Orchestration Layer with intent routing, goal persistence, and confidence evaluation.

| # | Deliverable | Components | Complexity | Success Criteria |
|---|---|---|---|---|
| 1.1 | Intent Classifier | `supervisor/intent_classifier.py`, Groq | Medium | Returns valid JSON routing decision in < 800ms |
| 1.2 | Model Router | `supervisor/orchestrator.py`, NVIDIA API | Medium | Message reaches correct model based on routing rules |
| 1.3 | Groq Pre-thinking Layer | `backend/app/services/groq_service.py` | Medium | Complex queries receive pre-reasoning before final model call |
| 1.4 | Onboarding flow | `routers/onboarding.py`, `models/user.py` | Low | 3-step onboarding completes and saves to DB |
| 1.5 | Episodic Memory | `shared/memory/manager.py` | Medium | User name/topics injected into every system prompt |
| 1.6 | SSE Streaming | `routers/chat.py` | Medium | Tokens stream to frontend in real-time via `text/event-stream` |
| 1.7 | Goal Manager *(GAP-03)* | `supervisor/goal_manager.py` | High | Goals persisted to `goals` table; sub-task status tracked across sessions |
| 1.8 | Goal state injection | `utils/prompt_builder.py` | Medium | Active goals + long-horizon plan injected into supervisor prompt at session start |
| 1.9 | Confidence Engine *(GAP-04)* | `supervisor/confidence_engine.py` | High | Confidence score computed; requests below 0.55 trigger clarification ask |
| 1.10 | Auto-conversation title | `routers/chat.py` | Low | First user message generates conversation title via LLM |

**Dependencies:** Phase 0
**Milestone:** User can chat with Both; routing is correct ≥90% of the time; goals persist between browser sessions.

---

## Phase 2 — Sub-Agent Integration
**Goal:** Integrate all NVIDIA models, connect WebSocket for real-time updates, and close the feedback loop.

| # | Deliverable | Components | Complexity | Success Criteria |
|---|---|---|---|---|
| 2.1 | NVIDIA multi-model client | `services/nvidia.py` | Medium | All 8 NVIDIA models respond correctly; API key rotation works |
| 2.2 | Gemini Research integration | `services/gemini.py` | Medium | Research queries use Gemini Flash; image analysis works |
| 2.3 | Nano Banana image generation | `services/nano_banana.py` | Medium | Image prompt → URL returned in < 30s |
| 2.4 | Model fallback chain | `supervisor/recovery_manager.py` *(GAP-07)* | High | Rate-limited model triggers automatic fallback; user sees no error |
| 2.5 | WebSocket router *(GAP-08)* | `api/routers/ws.py` | High | WS connection established; agent step events stream in real-time |
| 2.6 | AgentStatusBar frontend | `frontend/src/components/AgentStatusBar` | Medium | ReAct phases (Perceive/Reason/Act/Observe) visible in UI during tasks |
| 2.7 | Feedback collection | `routers/feedback.py`, `models/feedback.py` | Low | 👍/👎 buttons record signal to `feedback` table |
| 2.8 | Feedback Processor *(GAP-05)* | `shared/learning/feedback_processor.py` | High | Negative feedback extracts a lesson and stores to vector memory |
| 2.9 | Error Analyzer *(GAP-05)* | `shared/learning/error_analyzer.py` | High | Agent error triggers post-hoc analysis; heuristic stored in `error_logs` |
| 2.10 | Task Progress Panel | `frontend/src/components/TaskProgressPanel` | Medium | Multi-step task progress visible in real-time via WebSocket |

**Dependencies:** Phase 1
**Milestone:** All AI models respond; WebSocket delivers live agent status; feedback is captured and lessons stored.

---

## Phase 3 — Hybrid Capabilities
**Goal:** Add web agent capabilities, autonomous mode, and advanced chat features.

| # | Deliverable | Components | Complexity | Success Criteria |
|---|---|---|---|---|
| 3.1 | Settings API | `routers/settings.py` | Low | Language, preferences, profile saved and persisted |
| 3.2 | Multi-language enforcement | All system prompts, `i18n` | Medium | Both responds in user's detected language for entire session |
| 3.3 | Incognito chat mode | `routers/chat.py`, `pages/Incognito` | Medium | Incognito session writes nothing to DB; memory not injected |
| 3.4 | File attachments | `routers/chat.py`, FormData upload | Medium | User attaches PDF/image; content injected into LLM context |
| 3.5 | Voice input | `hooks/useVoiceInput`, Web Speech API | Medium | Voice transcription works in user's selected language |
| 3.6 | pgvector extension setup *(GAP-02)* | `database/migrations/add_pgvector.sql` | Medium | `CREATE EXTENSION vector;` succeeds; cosine search runs in < 50ms |
| 3.7 | Vector Store *(GAP-02)* | `shared/memory/vector_store.py` | High | `semantic_search(query, top_k=5)` returns relevant past lessons |
| 3.8 | Semantic memory injection | `utils/prompt_builder.py` | Medium | Top-3 relevant memories injected into every request context |
| 3.9 | Dashboard & monetization | `routers/dashboard.py`, Xendit | Medium | Stats display correctly; withdrawal triggers Xendit API |
| 3.10 | Failure scenario testing | `tests/test_recovery.py` | Medium | Simulated agent timeout triggers correct fallback; user notified |

**Dependencies:** Phase 2
**Milestone:** All hybrid features functional; semantic memory improves response relevance measurably.

---

## Phase 4 — Superintelligence Features
**Goal:** Add meta-cognition, self-improvement, long-horizon planning, and confidence calibration.

| # | Deliverable | Components | Complexity | Success Criteria |
|---|---|---|---|---|
| 4.1 | Meta-Cognition engine *(GAP-01)* | `supervisor/meta_cognition.py` | High | Every response is self-scored; responses below threshold 0.72 trigger re-generation |
| 4.2 | Meta-Cognitive Evaluator prompt | `prompts/system/meta_cognition.txt` | Medium | Prompt reliably detects contradictions and low-confidence claims |
| 4.3 | Confidence propagation *(GAP-04)* | `supervisor/confidence_engine.py` | High | Uncertainty signals from sub-agents aggregated; final score exposed via API |
| 4.4 | Confidence Badge frontend | `frontend/src/components/ConfidenceBadge` | Low | Confidence score visible on assistant messages in developer mode |
| 4.5 | Long-horizon planning *(GAP-06)* | `supervisor/goal_manager.py` | High | Multi-session task chains re-hydrate correctly at session start |
| 4.6 | Plan re-hydration at session start | `utils/prompt_builder.py` | Medium | Incomplete goals from previous sessions injected into supervisor prompt |
| 4.7 | Lesson Extractor | `shared/learning/lesson_extractor.py` | High | Lessons extracted with ≥85% relevance score (validated by human review) |
| 4.8 | Self-improvement metrics | `routers/dashboard.py` | Medium | Dashboard shows: lessons learned, re-generation rate, confidence trend |
| 4.9 | Recovery Manager *(GAP-07)* | `supervisor/recovery_manager.py` | High | 3-tier recovery: retry → fallback model → graceful degrade with user message |
| 4.10 | Goal auto-replan | `supervisor/goal_manager.py` | High | Failed sub-task triggers automatic replan with alternative approach |
| 4.11 | Memory Panel frontend | `frontend/src/components/MemoryPanel` | Medium | Developer mode shows active memories injected into current context |
| 4.12 | Autonomy Control | `frontend/src/components/AutonomyControl` | Medium | User can set autonomy level (Supervised / Balanced / Autonomous) |

**Dependencies:** Phase 3
**Milestone:** System self-corrects output quality; learns from errors; long-horizon plans survive session boundaries.

---

## Phase 5 — Production Hardening
**Goal:** Observability, scaling, security audit, cost optimization, and full production readiness.

| # | Deliverable | Components | Complexity | Success Criteria |
|---|---|---|---|---|
| 5.1 | Structured logging | `utils/logger.py`, JSON logs | Low | Every request produces structured log with trace ID |
| 5.2 | OpenTelemetry tracing | FastAPI middleware | Medium | Distributed traces visible in Grafana/Jaeger |
| 5.3 | Rate limiting | `middleware/rate_limit.py` | Low | Abuse patterns blocked; 429 returned with retry-after header |
| 5.4 | Load testing | `tests/load/k6_scenarios.js` | Medium | System handles 100 concurrent users with p95 latency < 2s |
| 5.5 | Security audit | OWASP checklist, JWT hardening | High | 0 critical, 0 high severity findings |
| 5.6 | Cost optimization | Token budget, model tier routing | Medium | Cost per request reduced ≥20% vs baseline via smarter routing |
| 5.7 | WCAG 2.1 AA compliance | Frontend a11y audit | Medium | Lighthouse accessibility score ≥ 90 on all pages |
| 5.8 | SEO meta tags + OG images | `index.html`, page templates | Low | All public pages have title, description, og:image |
| 5.9 | PWA manifest + service worker | `public/manifest.json`, `sw.ts` | Low | App installable on Chrome/Edge; offline shell loads |
| 5.10 | Error monitoring | Sentry or custom error tracker | Medium | All unhandled exceptions captured with stack trace + context |
| 5.11 | CI/CD pipeline | GitHub Actions | Medium | Every PR runs tests; main branch auto-deploys to Vercel |
| 5.12 | Domain + SSL | Vercel custom domain | Low | Production accessible at custom domain with valid TLS certificate |

**Dependencies:** Phase 4
**Milestone:** Lighthouse ≥90 across all categories; 0 critical security findings; system stable under load test.

---

## Summary Table

| Phase | Title | Key New Modules | Timeline |
|---|---|---|---|
| 0 | Foundation Extraction | auth, DB, Vite scaffold | Week 1–2 |
| 1 | Supervisor Core | orchestrator, goal_manager, confidence_engine | Week 3–5 |
| 2 | Sub-Agent Integration | nvidia, ws.py, feedback_processor | Week 6–8 |
| 3 | Hybrid Capabilities | vector_store, web agent, incognito | Week 9–11 |
| 4 | Superintelligence Features | meta_cognition, recovery_manager, lesson_extractor | Week 12–16 |
| 5 | Production Hardening | observability, security, load test | Week 17–19 |