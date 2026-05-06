# File Structure: both-ai

**Updated:** 2026-05-02
**Root Path:** `d:\2026\Workspace\Website\.AI\both-ai`

```
both-ai/
│
├── api/                                      # Vercel serverless entry point
│   ├── index.py                              # FastAPI app mount for Vercel
│   └── requirements.txt                      # Vercel-scoped dependencies
│
├── backend/                                  # Core application server
│   ├── app/
│   │   ├── middleware/
│   │   │   ├── auth_middleware.py            # JWT validation on protected routes
│   │   │   ├── cors.py                       # CORS policy configuration
│   │   │   └── rate_limit.py                 # Per-user request throttle + 429 response
│   │   │
│   │   ├── models/                           # SQLAlchemy ORM models
│   │   │   ├── chat.py                       # Conversation + Message models
│   │   │   ├── feedback.py                   # User feedback signal model
│   │   │   ├── goal.py                       # Goal + sub-task models [GAP-03]
│   │   │   ├── memory.py                     # Episodic memory key-value model
│   │   │   ├── memory_vector.py              # pgvector embedding record model [GAP-02]
│   │   │   ├── session.py                    # Session state model
│   │   │   ├── user.py                       # User + UserProfile models
│   │   │   └── withdrawal.py                 # Payment withdrawal model
│   │   │
│   │   ├── routers/                          # FastAPI route handlers
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                       # Register, login, logout, Google/GitHub OAuth
│   │   │   ├── chat.py                       # Send, history, new, delete; SSE streaming
│   │   │   ├── dashboard.py                  # Stats, withdraw, admin endpoints
│   │   │   ├── feedback.py                   # Submit feedback; admin view
│   │   │   ├── goals.py                      # Create, list, update, complete goals [GAP-03]
│   │   │   ├── onboarding.py                 # Name, topics, language, status
│   │   │   ├── settings.py                   # Language, preferences, profile
│   │   │   └── ws.py                         # WebSocket endpoint: agent status, task progress, abort [GAP-08]
│   │   │
│   │   ├── services/                         # External API integrations
│   │   │   ├── gemini.py                     # Google Gemini Flash — research + image analysis
│   │   │   ├── groq_service.py               # Groq LLaMA — pre-thinking reasoning layer
│   │   │   ├── intent_detector.py            # Groq-based intent classification → routing JSON
│   │   │   ├── memory.py                     # Episodic memory read/write service
│   │   │   ├── nano_banana.py                # Nano Banana API — image + video generation
│   │   │   ├── nvidia.py                     # Unified NVIDIA API client (8 models + fallback)
│   │   │   ├── orchestrator.py               # Main routing + delegation + SSE streaming logic
│   │   │   └── xendit.py                     # Xendit payment gateway — withdraw + webhook
│   │   │
│   │   ├── utils/
│   │   │   ├── logger.py                     # Structured JSON logging with trace IDs
│   │   │   ├── prompt_builder.py             # Assembles system prompts: memory + goals + plan injection
│   │   │   ├── rate_limit.py                 # Rate limiter utilities
│   │   │   └── token_counter.py              # Token budget tracking per request
│   │   │
│   │   ├── __init__.py
│   │   ├── config.py                         # Environment variable loading + validation
│   │   ├── database.py                       # SQLAlchemy engine, session, pgvector setup
│   │   └── main.py                           # FastAPI app init, middleware registration, router mount
│   │
│   ├── prompts/                              # LLM prompt text files
│   │   ├── routing/
│   │   │   └── intent_classifier.txt         # Intent classification prompt → JSON routing decision
│   │   └── system/
│   │       ├── meta_cognition.txt            # Meta-Cognitive Evaluator prompt [GAP-01]
│   │       ├── supervisor.txt                # Supervisor Orchestrator main prompt
│   │       ├── both_general.txt              # Both General Assistant prompt
│   │       ├── both_coding.txt               # Both Coding Agent prompt
│   │       └── feedback_processor.txt        # Feedback Processor learning prompt [GAP-05]
│   │
│   ├── static/                               # Served static assets (if any)
│   │
│   ├── tests/                                # Backend test suite
│   │   ├── test_auth.py                      # Auth endpoints: register, login, OAuth flows
│   │   ├── test_chat.py                      # Chat send, history, streaming SSE
│   │   ├── test_confidence.py                # Confidence engine unit tests [GAP-04]
│   │   ├── test_dashboard.py                 # Dashboard stats + withdrawal
│   │   ├── test_feedback.py                  # Feedback signal capture + lesson extraction
│   │   ├── test_goals.py                     # Goal CRUD + sub-task tracking [GAP-03]
│   │   ├── test_memory.py                    # Episodic + semantic memory R/W
│   │   ├── test_meta_cognition.py            # Self-evaluation scoring logic [GAP-01]
│   │   ├── test_onboarding.py                # 3-step onboarding flow
│   │   ├── test_recovery.py                  # Failure simulation + fallback behavior [GAP-07]
│   │   ├── test_routing.py                   # Intent classifier routing accuracy
│   │   ├── test_settings.py                  # Settings endpoints
│   │   └── test_websocket.py                 # WebSocket connection + message protocol [GAP-08]
│   │
│   └── requirements.txt                      # Backend Python dependencies
│
├── supervisor/                               # Supervisor Orchestration Layer
│   ├── __init__.py
│   ├── orchestrator.py                       # Main supervisor: routes, delegates, manages lifecycle
│   ├── intent_classifier.py                  # Classifies intent → { primary_model, pre_think, confidence }
│   ├── task_planner.py                       # Decomposes complex requests into ordered sub-tasks
│   ├── goal_manager.py                       # Persists goals across sessions; tracks sub-task status; replans on failure [GAP-03/06]
│   ├── confidence_engine.py                  # Aggregates sub-agent uncertainty; computes final confidence score; decides clarify vs proceed [GAP-04]
│   ├── meta_cognition.py                     # Self-evaluation engine: scores output quality, detects hallucination signals, triggers re-generation [GAP-01]
│   └── recovery_manager.py                   # Failure recovery: retry, fallback agent selection, graceful degradation with user notification [GAP-07]
│
├── shared/                                   # Shared infrastructure used by all agents
│   ├── memory/
│   │   ├── __init__.py
│   │   ├── manager.py                        # Memory interface: episodic R/W + semantic_search(query, top_k) method
│   │   └── vector_store.py                   # pgvector embedding store: embed → upsert → cosine similarity search [GAP-02]
│   │
│   └── learning/                             # Self-improvement pipeline [GAP-05]
│       ├── __init__.py
│       ├── feedback_processor.py             # Processes 👍/👎/correction signals; extracts lessons; writes to vector memory
│       ├── error_analyzer.py                 # Post-hoc agent error analysis; generates corrective heuristics stored as episodic memories
│       └── lesson_extractor.py               # Formats raw lessons into embeddable prose for vector store
│
├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql            # Users, conversations, messages, memory, feedback
│   │   ├── 002_add_goals.sql                 # Goals + sub_tasks JSONB column [GAP-03]
│   │   ├── 003_add_pgvector.sql              # CREATE EXTENSION vector; memory_vectors table [GAP-02]
│   │   └── 004_add_error_logs.sql            # Error logs + learning heuristics [GAP-05]
│   └── schema.sql                            # Current full schema snapshot
│
├── frontend/                                 # React + Vite frontend (TypeScript)
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── manifest.json                     # PWA manifest
│   │   └── robots.txt
│   │
│   └── src/
│       ├── api/                              # API client layer
│       │   ├── client.ts                     # Axios/fetch wrapper with JWT + error handling
│       │   ├── chat.ts                       # Chat send, history, SSE stream handler
│       │   ├── auth.ts                       # Login, register, OAuth flows
│       │   ├── goals.ts                      # Goal CRUD API calls
│       │   ├── feedback.ts                   # Feedback signal submission
│       │   └── settings.ts                   # Settings read/write
│       │
│       ├── components/                       # Reusable UI components
│       │   ├── AgentStatusBar/               # Real-time ReAct phase display via WebSocket [GAP-08]
│       │   │   ├── AgentStatusBar.tsx
│       │   │   └── AgentStatusBar.module.css
│       │   ├── AutonomyControl/              # Autonomy level selector: Supervised/Balanced/Autonomous
│       │   │   ├── AutonomyControl.tsx
│       │   │   └── AutonomyControl.module.css
│       │   ├── ConfidenceBadge/              # Visual confidence indicator on assistant messages [GAP-04]
│       │   │   ├── ConfidenceBadge.tsx
│       │   │   └── ConfidenceBadge.module.css
│       │   ├── MessageBubble/                # User + assistant message rendering with markdown
│       │   │   ├── MessageBubble.tsx
│       │   │   └── MessageBubble.module.css
│       │   ├── MemoryPanel/                  # Dev-mode panel showing injected memories [GAP-02]
│       │   │   ├── MemoryPanel.tsx
│       │   │   └── MemoryPanel.module.css
│       │   ├── Sidebar/                      # Conversation list + navigation
│       │   │   ├── Sidebar.tsx
│       │   │   └── Sidebar.module.css
│       │   ├── TaskProgressPanel/            # Multi-step task progress via WebSocket [GAP-08]
│       │   │   ├── TaskProgressPanel.tsx
│       │   │   └── TaskProgressPanel.module.css
│       │   └── Topbar/                       # App bar: model selector, new chat, user menu
│       │       ├── Topbar.tsx
│       │       └── Topbar.module.css
│       │
│       ├── hooks/                            # Custom React hooks
│       │   ├── useAuth.ts                    # Auth state: login, logout, token management
│       │   ├── useChat.ts                    # Chat state: send, stream, history
│       │   ├── useGoals.ts                   # Goal CRUD + sub-task status [GAP-03]
│       │   ├── useVoiceInput.ts              # Web Speech API voice transcription
│       │   └── useWebSocket.ts              # WebSocket connection manager [GAP-08]
│       │
│       ├── i18n/                             # Internationalization
│       │   ├── index.ts                      # i18n engine: t(), setLanguage(), applyTranslations()
│       │   └── locales/                      # Per-language JSON translation files
│       │       ├── en.json
│       │       ├── id.json
│       │       ├── fr.json
│       │       ├── de.json
│       │       ├── ja.json
│       │       ├── ko.json
│       │       ├── pt.json
│       │       ├── es.json
│       │       ├── it.json
│       │       ├── zh.json
│       │       └── ar.json
│       │
│       ├── pages/                            # Route-level page components
│       │   ├── Auth/                         # Login + Register pages
│       │   │   ├── Login.tsx
│       │   │   └── Register.tsx
│       │   ├── Chat/                         # Main chat interface
│       │   │   └── Chat.tsx
│       │   ├── Dashboard/                    # Developer stats + monetization
│       │   │   └── Dashboard.tsx
│       │   ├── Incognito/                    # Private session (no persistence)
│       │   │   └── Incognito.tsx
│       │   └── Onboarding/                   # 3-step new user flow
│       │       └── Onboarding.tsx
│       │
│       ├── stores/                           # Reactive state management (Zustand)
│       │   ├── authStore.ts                  # Auth state: user, token, profile
│       │   ├── chatStore.ts                  # Chat state: conversations, messages, streaming
│       │   ├── goalStore.ts                  # Goal state: active goals, sub-tasks [GAP-03]
│       │   ├── i18nStore.ts                  # Language state
│       │   └── uiStore.ts                    # UI preferences: theme, sidebar, autonomy level
│       │
│       ├── styles/                           # Design tokens + global CSS
│       │   ├── tokens/
│       │   │   ├── colors.css
│       │   │   ├── spacing.css
│       │   │   ├── typography.css
│       │   │   └── radii.css
│       │   └── global.css
│       │
│       ├── utils/                            # Shared utilities
│       │   ├── formatters.ts                 # Date, currency, number formatting
│       │   ├── markdownPipeline.ts           # marked.js + highlight.js pipeline
│       │   └── sseParser.ts                  # Server-Sent Events stream parser
│       │
│       ├── App.tsx                           # Root component + router
│       ├── main.tsx                          # Vite entry point
│       └── vite-env.d.ts                     # Vite type declarations
│
├── docs/
│   ├── ARCHITECTURE.md                       # System architecture + component breakdown
│   ├── FILE_STRUCTURE.md                     # This file
│   ├── ROADMAP.md                            # 6-phase implementation roadmap
│   └── SYSTEM_PROMPTS.md                     # All 5 production system prompts
│
├── .env                                      # Local environment variables (gitignored)
├── .env.example                              # Environment variable template
├── .gitignore
├── .python-version                           # Python version pin
├── AGENTS.md                                 # Agent behavior guidelines
├── LICENSE
├── README.md
├── requirements.txt                          # Root Python dependencies
└── vercel.json                               # Vercel routing config
```

---

## Key Module Descriptions

### Supervisor Layer

| Module | Responsibility |
|---|---|
| `supervisor/orchestrator.py` | Routes messages, manages agent lifecycle, orchestrates SSE streaming |
| `supervisor/intent_classifier.py` | Sends message to Groq → returns `{ primary_model, pre_think, confidence, reason }` |
| `supervisor/task_planner.py` | Decomposes complex requests into ordered, parallelizable sub-tasks |
| `supervisor/goal_manager.py` | Persists user goals to DB; tracks sub-task completion; replans on failure; re-hydrates at session start |
| `supervisor/confidence_engine.py` | Aggregates per-agent uncertainty signals; computes final response confidence; decides clarify/proceed threshold |
| `supervisor/meta_cognition.py` | Runs post-generation quality evaluation; scores 4 dimensions; triggers re-generation if < 0.72 threshold |
| `supervisor/recovery_manager.py` | 3-tier failure handling: retry → fallback model → graceful degrade with user notification |

### Shared Infrastructure

| Module | Responsibility |
|---|---|
| `shared/memory/manager.py` | Unified memory interface: episodic key-value R/W + `semantic_search(query, top_k)` |
| `shared/memory/vector_store.py` | pgvector operations: `embed(text)`, `upsert(record)`, `cosine_search(query, top_k)` |
| `shared/learning/feedback_processor.py` | Classifies feedback signal; extracts lessons; formats `memory_text`; writes to vector store |
| `shared/learning/error_analyzer.py` | Analyzes agent errors; identifies root cause category; generates corrective heuristic |
| `shared/learning/lesson_extractor.py` | Formats raw lesson data into embeddable natural-language prose |

### Frontend Key Components

| Component | Responsibility |
|---|---|
| `AgentStatusBar` | Displays real-time ReAct phase (Perceive/Reason/Act/Observe) via WebSocket |
| `AutonomyControl` | Lets user set autonomy level: Supervised / Balanced / Autonomous |
| `ConfidenceBadge` | Shows confidence score on assistant messages (developer mode) |
| `MemoryPanel` | Developer-mode panel showing which memories were injected into current context |
| `TaskProgressPanel` | Shows multi-step task progress, goal status, and sub-task completion |

---

*Generated manually — reflects target architecture including all GAP-01 through GAP-08 additions*