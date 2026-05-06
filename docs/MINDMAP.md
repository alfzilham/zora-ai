# Both AI — System Mindmap
## Complete Architecture, Data Flow, and Component Relationships

---

## 1. System Component Hierarchy

```mermaid
mindmap
  root((Both AI\nSuperintelligence))

    Supervisor Layer
      Orchestrator
        Intent Classifier
          Groq LLaMA Pre-Think
          Routing Rules Engine
          JSON Decision Output
        Task Planner
          Sub-task Decomposition
          Dependency Ordering
        Goal Manager
          Session Goal Persistence
          Sub-task Status Tracking
          Multi-session Continuity
          Auto-Replan on Failure
        Confidence Engine
          Per-agent Uncertainty Aggregation
          Clarify vs Proceed Threshold
          Escalation Ladder
        Meta-Cognition
          4-dimension Quality Scoring
          Hallucination Detection
          Re-generation Trigger
          Caveat Injection
        Recovery Manager
          Retry Logic
          Fallback Agent Selection
          Graceful Degradation
          User Notification

    AI Model Fleet
      NVIDIA Models
        Nemotron — General Chat
        Deepseek — Math Logic
        Qwen — Code Debug
        Kimi — Long Documents
        Minimax — Creative Writing
        GLM — Multilingual Chinese
        Gemma — Backup General
        Mistral — Fast Multilingual
      Google
        Gemini Flash — Research Image
      Groq
        LLaMA 3.3 70B — Pre-thinking
      External
        Nano Banana — Image Video

    Shared Infrastructure
      Memory System
        Episodic Memory
          JSONL Key-Value Store
          Session Context
          User Preferences
        Vector Store
          pgvector Embeddings
          Semantic Search top-k
          Lesson Retrieval
          Cosine Similarity
      Learning Pipeline
        Feedback Processor
          Signal Classification
          Lesson Extraction
          Vector Memory Write
        Error Analyzer
          Post-hoc Analysis
          Heuristic Generation
          Error Log Storage
        Lesson Extractor
          Prose Formatting
          Embeddable Text
      WebSocket Layer
        Agent Step Events
        Goal Update Events
        Task Progress Stream
        Abort Signal Handling

    Backend API
      Auth Router
        Register Login
        Google OAuth
        GitHub OAuth
        JWT Middleware
      Chat Router
        Send Message
        SSE Streaming
        History
        Incognito Mode
      Goals Router
        Create Update
        Sub-task Status
        Complete Archive
      Settings Router
        Language Preferences
        Profile Update
      Feedback Router
        Signal Submit
        Admin View
      Dashboard Router
        Stats Endpoint
        Xendit Withdraw
      WebSocket Router
        ws.py Endpoint
        Session Manager

    Frontend React Vite
      Pages
        Chat Interface
        Incognito Session
        Auth Login Register
        Onboarding 3-Step
        Dashboard Stats
      Components
        AgentStatusBar
          ReAct Phase Display
          WebSocket Consumer
        TaskProgressPanel
          Goal Progress
          Sub-task List
        ConfidenceBadge
          Score Display
          Dev Mode Only
        MemoryPanel
          Injected Memories
          Dev Mode Only
        AutonomyControl
          Supervised Mode
          Balanced Mode
          Autonomous Mode
        MessageBubble
          Markdown Rendering
          Code Highlighting
          Think Blocks
        Sidebar
          Conversation List
          Context Menu
        Topbar
          Model Selector
          New Chat Button
      Stores Zustand
        AuthStore
        ChatStore
        GoalStore
        UIStore
        I18nStore
      Hooks
        useAuth
        useChat
        useGoals
        useVoiceInput
        useWebSocket
      i18n
        11 Languages
        t() Function
        Auto-detection

    Database PostgreSQL Neon
      users
      user_profiles
      conversations
      messages
      memory key-value
      memory_vectors pgvector
      goals sub_tasks JSONB
      feedback signals
      error_logs heuristics
```

---

## 2. Data Flow Diagram

```mermaid
flowchart TB
    subgraph "User Interface"
        UI["React + Vite Frontend"]
        WS_CLIENT["WebSocket Client\n(useWebSocket hook)"]
        SSE_CLIENT["SSE Stream\n(sseParser.ts)"]
    end

    subgraph "API Layer"
        REST["FastAPI REST\n/auth /chat /goals /settings"]
        WS_SRV["WebSocket Router\n/ws"]
        SSE_SRV["SSE Endpoint\n/chat/send"]
    end

    subgraph "Supervisor"
        ORCH["Orchestrator"]
        IC["Intent Classifier"]
        GM["Goal Manager"]
        CE["Confidence Engine"]
        MC["Meta-Cognition"]
        RM["Recovery Manager"]
        TP["Task Planner"]
    end

    subgraph "AI Fleet"
        NVIDIA["NVIDIA Models\n(8 models)"]
        GROQ["Groq Pre-Think"]
        GEMINI["Gemini Research"]
        NB["Nano Banana\nImage/Video"]
    end

    subgraph "Shared Infrastructure"
        MEM["Memory Manager"]
        VS["Vector Store\npgvector"]
        FP["Feedback Processor"]
        EA["Error Analyzer"]
    end

    subgraph "Database"
        PG["PostgreSQL (Neon)"]
    end

    UI -->|"REST calls"| REST
    UI <-->|"bidirectional"| WS_CLIENT
    WS_CLIENT <-->|"WS frames"| WS_SRV
    SSE_CLIENT <-->|"token stream"| SSE_SRV

    REST --> ORCH
    SSE_SRV --> ORCH
    WS_SRV --> ORCH

    ORCH --> IC
    ORCH --> GM
    ORCH --> CE
    ORCH --> TP

    IC -->|"routing decision"| ORCH
    GM -->|"active goals + plan"| ORCH
    CE -->|"confidence score"| MC
    MC -->|"DELIVER or REGENERATE"| ORCH

    ORCH -->|"route to model"| NVIDIA
    ORCH -->|"complex reasoning"| GROQ
    ORCH -->|"research queries"| GEMINI
    ORCH -->|"image/video"| NB

    NVIDIA -->|"response"| MC
    GROQ -->|"pre-thought"| NVIDIA
    GEMINI -->|"response"| MC

    ORCH -->|"agent failure"| RM
    RM -->|"fallback selection"| ORCH

    MEM -->|"episodic context"| ORCH
    VS -->|"semantic lessons"| ORCH
    FP -->|"lesson → embed"| VS
    EA -->|"heuristic → episodic"| MEM

    PG <-->|"read/write"| MEM
    PG <-->|"vector ops"| VS
    PG <-->|"goals/feedback"| GM

    WS_SRV -->|"agent step events"| WS_CLIENT
    WS_SRV -->|"goal updates"| WS_CLIENT
    SSE_SRV -->|"LLM tokens"| SSE_CLIENT
```

---

## 3. Agent Communication Protocol

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant FE as Frontend
    participant WS as WebSocket /ws
    participant SUP as Supervisor
    participant GM as Goal Manager
    participant MC as Meta-Cognition
    participant LLM as AI Model

    U->>FE: Send message
    FE->>SUP: POST /chat/send {message, conversation_id, model}

    SUP->>GM: Fetch active goals + long-horizon plan
    GM-->>SUP: { goals[], plan }

    SUP->>SUP: Intent Classifier → routing decision

    SUP->>WS: Emit { type:"agent_step", phase:"Reason", status:"active" }
    WS-->>FE: AgentStatusBar updates

    SUP->>LLM: Send prompt (with goals + semantic memories injected)
    LLM-->>SUP: Generated response

    SUP->>MC: Evaluate response quality
    MC-->>SUP: { overall_score: 0.85, action: "DELIVER" }

    alt score < 0.72
        SUP->>LLM: Re-generate with improvement instruction
        LLM-->>SUP: Improved response
        SUP->>MC: Re-evaluate
        MC-->>SUP: { overall_score: 0.79, action: "DELIVER" }
    end

    SUP->>WS: Emit { type:"task_done", confidence: 0.85 }
    WS-->>FE: TaskProgressPanel updates

    SUP-->>FE: SSE stream: tokens
    FE-->>U: Streamed response rendered

    U->>FE: 👍 or 👎 feedback
    FE->>SUP: POST /feedback { signal, message_id }
    SUP->>SUP: Feedback Processor → extract lesson → vector store
```

---

## 4. Security Pipeline

```mermaid
flowchart LR
    subgraph "L1 — Network"
        TLS["TLS 1.3\nAll traffic encrypted"]
        CORS["CORS Policy\nAllowlist only"]
    end

    subgraph "L2 — Auth"
        JWT["JWT Validation\nHS256 + expiry check"]
        OAUTH["OAuth 2.0\nGoogle + GitHub"]
        RATE["Rate Limiting\n100 req/min/user"]
    end

    subgraph "L3 — Input"
        SAN["Input Sanitization\nXSS + injection strip"]
        TOK["Token Budget\nMax 8192 tokens/req"]
        FILE["File Type Validation\nAllowlist: pdf, png, jpg, txt"]
    end

    subgraph "L4 — Model"
        PMOD["Prompt Injection Guard\nSystem prompt isolation"]
        LEAK["Secret Leak Guard\nNo API keys in responses"]
        HARM["Harm Filter\nContent policy enforcement"]
    end

    subgraph "L5 — Data"
        ENC["DB Encryption at Rest\nNeon built-in"]
        PII["PII Scrubbing\nNo PII in memory_text"]
        AUDIT["Audit Logs\nAll admin actions logged"]
    end

    TLS --> CORS --> JWT --> OAUTH --> RATE
    RATE --> SAN --> TOK --> FILE
    FILE --> PMOD --> LEAK --> HARM
    HARM --> ENC --> PII --> AUDIT
```

---

## 5. Model Tier Routing

```mermaid
flowchart TD
    MSG["User Message"]

    MSG --> IC{"Intent\nClassifier"}

    IC -->|"code/debug"| QWEN["Qwen\nqwen3.5-122b"]
    IC -->|"math/logic"| DS["Deepseek\ndeepseek-v3.2"]
    IC -->|"long doc/PDF"| KIMI["Kimi\nkimi-k2.5"]
    IC -->|"creative"| MM["Minimax\nminimax-m2.7"]
    IC -->|"research/web"| GEM["Gemini\ngemini-2.0-flash"]
    IC -->|"chinese/multilingual"| GLM["GLM\nglm-5.1"]
    IC -->|"general"| NEM["Nemotron\nnemotron-3-super"]
    IC -->|"complex multi-step"| GROQ["Groq Pre-Think\nllama-3.3-70b"]

    GROQ -->|"reasoning → best model"| QWEN
    GROQ -->|"reasoning → best model"| DS
    GROQ -->|"reasoning → best model"| NEM

    QWEN --> RM{"Recovery\nManager"}
    DS --> RM
    KIMI --> RM
    MM --> RM
    GEM --> RM
    GLM --> RM
    NEM --> RM

    RM -->|"success"| MC["Meta-Cognition\nQuality Eval"]
    RM -->|"failure: retry"| RM
    RM -->|"failure: fallback"| GEMMA["Gemma\ngemma-4-31b"]

    MC -->|"score ≥ 0.72"| OUT["Deliver Response"]
    MC -->|"score < 0.72"| REGEN["Re-generate"]
    REGEN --> MC
```

---

## 6. Feedback Learning Cycle *(New — GAP-05)*

```mermaid
flowchart TD
    U["👤 User"]
    SIG["Feedback Signal\n👍 / 👎 / Correction"]
    FP["feedback_processor.py\nClassify + Extract"]
    EA["error_analyzer.py\nPost-hoc Analysis"]
    LE["lesson_extractor.py\nFormat Prose"]
    EMB["Embedding Model\ntext-embedding-3-small"]
    VS["vector_store.py\nUpsert to pgvector"]
    DB[("memory_vectors\ntable")]
    SS["semantic_search\n(query, top_k=5)"]
    PB["prompt_builder.py\nInject Lessons"]
    LLM["LLM Response\n(improved)"]

    U --> SIG --> FP
    FP -->|"negative signal"| EA
    FP --> LE
    EA --> LE
    LE --> EMB --> VS --> DB
    DB --> SS --> PB --> LLM --> U

    style EA fill:#2a1a1a,stroke:#ff4d67
    style VS fill:#1a2a1a,stroke:#17c964
    style DB fill:#1a1a2a,stroke:#2d8cff
```

---

## 7. Confidence Propagation Flow *(New — GAP-04)*

```mermaid
flowchart LR
    subgraph "Sub-agent Signals"
        Q_CONF["Qwen\ncode_confidence: 0.88"]
        D_CONF["Deepseek\nmath_confidence: 0.94"]
        G_CONF["Gemini\nfactual_certainty: 0.71"]
        N_CONF["Nemotron\nresponse_confidence: 0.82"]
    end

    subgraph "Confidence Engine"
        AGG["Aggregator\nWeighted average\nby task_type"]
        THRESH{"Threshold\nCheck"}
    end

    subgraph "Meta-Cognition"
        EVAL["4-dimension Scoring\naccuracy + completeness\nconsistency + certainty"]
        HALL["Hallucination\nDetector"]
    end

    subgraph "Output"
        DELIVER["Deliver\nconfidence ≥ 0.72"]
        CAVEAT["Deliver + Caveat\n0.55 ≤ conf < 0.72"]
        CLARIFY["Ask Clarifying\nQuestion\nconf < 0.55"]
        BADGE["ConfidenceBadge\nFrontend Display"]
    end

    Q_CONF --> AGG
    D_CONF --> AGG
    G_CONF --> AGG
    N_CONF --> AGG

    AGG --> THRESH
    THRESH --> EVAL
    EVAL --> HALL

    HALL -->|"score ≥ 0.72\nno hallucination"| DELIVER
    HALL -->|"score ≥ 0.72\nhallucination risk"| CAVEAT
    THRESH -->|"score < 0.55"| CLARIFY

    DELIVER --> BADGE
    CAVEAT --> BADGE
```
