# Both AI — Frontend Mindmap
## React + Vite SPA — Complete UI Component & Feature Map

---

## System Mindmap

```mermaid
mindmap
  root((Both AI Frontend))

    App Shell
      Sidebar
        Navigation Icons
          Home
          Search
          History
          MemoryPanel Icon
          Feedback
        Conversation List
          Grouped Headers
            Today
            Yesterday
            Previous 7 Days
            Older
          ConversationItem
            Title
            Context Menu
              Rename
              Archive
          Search Filter
        UserProfile
          Avatar Badge
          Profile Name
          Dropdown Menu
            Profile Settings
            Language
            FAQ
            Logout
      Topbar
        Hamburger Toggle
        Model Selector
        AutonomyControl Compact
        New Chat Button
        Conversation Title

    Chat Interface
      AgentStatusBar
        Agent Name Dot
        Current Action Text
        Step Progress Counter
        Abort Button
      Welcome Screen
        WebGL Orb
          OGL Renderer
          Vertex Shader
          Fragment Shader
          Noise Uniforms
        Greeting Text
          Time of Day
          User Name
        Rotating Phrases
          Typewriter Animation
          i18next Translated
        Suggestion Cards
      Message Thread
        MessageBubble User
          Avatar
          Content
          Timestamp
        MessageBubble Assistant
          Both Avatar
          MarkdownRenderer
            Headings
            Lists
            Bold Italic
            Links
          CodeBlock
            highlight.js
            Language Tag
            Copy Button
          ThinkBlock
            Collapsible
            Framer Motion Height
          ConfidenceBadge
            Score Dot
            Tier Color
            Hover Tooltip
          ActionBar
            Copy
            Regenerate
            Feedback Up Down
        TypingIndicator
          Three Dot Pulse
      TaskProgressPanel
        Task Tree
          TaskNode
            Status Icon
            Agent Badge
            Children Recursive
        Progress Bar
        Collapse Toggle
      Composer
        Auto Resize Textarea
        Send Button
        Extended Toggle
        Attach Button
        Voice Button
        File Attachment Preview

    Superintendent UI Layer
      AgentStatusBar
        UI-GAP-01
        WS Binding agent_step
        agentStore.activeAgent
        Phase Dot Colors
          Supervisor purple
          Both blue
          Both green
        Abort Button ws abort
      TaskProgressPanel
        UI-GAP-02
        WS Binding task_decomposed
        agentStore.taskTree
        TaskNode Types
          pending
          in_progress
          done
          failed
        Auto Collapse on Done
      ConfidenceBadge
        UI-GAP-03
        SSE Payload confidence
        agentStore.confidenceMap
        Tiers
          High green 085plus
          Medium yellow 060to084
          Low red below060
        Framer Tooltip
      MemoryPanel
        UI-GAP-04
        GET /memory/user
        MemoryItem Types
          topic
          correction
          key_fact
          language
        Delete Item Optimistic
        Clear All Confirm
      AutonomyControl
        UI-GAP-05
        Level 0 Always Ask
        Level 1 Ask on Ambiguity
        Level 2 Fully Autonomous
        Variants
          Full Settings
          Compact Topbar
        PATCH /settings/autonomy

    Search and History
      Search Palette
        Cmd K Shortcut
        Fuzzy Search
        Arrow Navigation
        Enter to Select
        Result Highlighting
      History Lightbox
        Full Screen Browser
        Grouped Display
        Search Within

    Auth System
      Login Page
        OAuth Buttons
          Google Sign In
          GitHub Sign In
        Email Password Fallback
        Error Toast
      Register Page
        Name Input
        OAuth Flow
      OAuth Callback
        Extract token param
        GET /auth/me
        Redirect onboarding or chat
      Onboarding Wizard
        Step 1 Name Input
        Step 2 Topics
          Multi Select Chips
          15 Categories
        Step 3 Language
          11 Languages
          Flag Icons
        Framer Motion Slide Steps
        Progress Dots

    Settings Center
      Settings Modal
        Framer Motion Scale In
        AnimatePresence
        Escape Close
      Profile Tab
        Avatar Upload
        Display Name
        PUT /settings/profile
      Language Tab
        11 Language Grid
        Flag Emoji
        i18next changeLanguage
      Interface Tab
        8 Toggles
          Bubble Style
          Widescreen
          Auto Title Gen
          Auto Tags Gen
          Auto Copy
          Paste as File
          Scroll Branch
          Improve Model
        AutonomyControl Full
      Chat Tab
        Archive All
        Delete All
        Import JSON
        Export JSON
      FAQ Tab
        Accordion Items
      About Tab
        Version Info
        Credits

    Incognito Mode
      Private Session
        No localStorage Writes
        In Memory Zustand Only
        No Auth Required
      Isolated Chat
        No Sidebar
        Incognito Header
          Mask Icon
          Private Session Badge
          Exit Button
      Ripple Transition
        Framer Motion Entry
        Exit Confirmation

    Infrastructure
      Zustand Stores
        ChatStore
          conversations
          messages
          isStreaming
          abortController
        AuthStore
          user
          token
          isAuthenticated
        UIStore
          sidebarOpen
          activeModal
          autonomyLevel
          widescreen
        I18nStore
          language
          i18next instance
        AgentStore NEW
          activeAgent
          currentAction
          stepCurrent
          stepTotal
          taskTree
          confidenceMap
          wsConnection
      API Layer
        api/client.ts Axios JWT
        api/ws.ts WebSocket
        api/chat.ts SSE
        api/memory.ts
        api/goals.ts
        api/feedback.ts
      Custom Hooks
        useChat SSE orchestration
        useSSE ReadableStream
        useWebSocket WS events
        useConfidence SSE parser
        useMemory React Query
        useVoiceInput Web Speech
        useKeyboardShortcuts
      SSE Streaming
        Token Parsing
        Think Block Extraction
        Confidence Field
        Done Signal
        Abort Control
      i18n System
        i18next
        11 Languages
        Namespaces
          common
          chat
          settings
          onboarding
          errors
        Arabic RTL
      Accessibility
        WCAG 2.1 AA
        Keyboard Nav
        Screen Reader
        Focus Management
        prefers-reduced-motion
```

---

## Agent Event Flow (WebSocket → UI)

```mermaid
flowchart TB
    subgraph "Backend ws.py"
        WS_SERVER["WebSocket Server\n/ws"]
        IC["Intent Classifier"]
        TP["Task Planner"]
        GM["Goal Manager"]
        CE["Confidence Engine"]
        RM["Recovery Manager"]
    end

    subgraph "WebSocket Events"
        E1["agent_step\n{phase, status, detail}"]
        E2["task_decomposed\n{taskTree: TaskNode[]}"]
        E3["task_progress\n{taskId, status}"]
        E4["task_done\n{result, confidence}"]
        E5["recovery\n{action, agent, reason}"]
        E6["goal_update\n{goal_id, status, progress}"]
    end

    subgraph "useWebSocket.ts (Hook)"
        DISPATCH["dispatchWsEvent()\nevent router"]
    end

    subgraph "AgentStore (Zustand)"
        SA["setActiveAgent()"]
        ST["setTaskTree()"]
        SP["setTaskProgress()"]
        SC["setConfidence()"]
    end

    subgraph "UI Components"
        ASB["AgentStatusBar\n[UI-GAP-01]"]
        TPP["TaskProgressPanel\n[UI-GAP-02]"]
        CB["ConfidenceBadge\n[UI-GAP-03]"]
        TOAST["Toast Notification"]
    end

    IC --> E1 --> WS_SERVER
    TP --> E2 --> WS_SERVER
    GM --> E3 & E6 --> WS_SERVER
    CE --> E4 --> WS_SERVER
    RM --> E5 --> WS_SERVER

    WS_SERVER -->|"WebSocket message"| DISPATCH

    DISPATCH --> SA --> ASB
    DISPATCH --> ST --> TPP
    DISPATCH --> SP --> TPP
    DISPATCH --> SC --> CB
    DISPATCH -->|"recovery event"| TOAST
```

---

## Data Flow Map

```mermaid
flowchart TB
    subgraph "User Input"
        TEXT["⌨️ Text Input"]
        VOICE["🎤 Voice Input"]
        FILE["📎 File Attach"]
        CLICK["🖱️ Click/Tap"]
    end

    subgraph "Frontend Processing"
        COMP["Composer"]
        CS["ChatStore"]
        AS["AgentStore"]
        API["api/client.ts (Axios)"]
        SSE["useSSE hook\n(ReadableStream)"]
        WS["useWebSocket hook\n(WebSocket)"]
        RENDER["MessageThread"]
        MD["markdown.ts\n(marked + DOMPurify)"]
        I18N["i18next"]
    end

    subgraph "Backend API"
        CHAT_EP["POST /chat/ → SSE"]
        WS_EP["WS /ws"]
        HIST_EP["GET /chat/history"]
        MEM_EP["GET /memory/user"]
        SET_EP["/settings/*"]
    end

    subgraph "Superintelligence UI"
        ASB["AgentStatusBar"]
        TPP["TaskProgressPanel"]
        CB["ConfidenceBadge"]
        MP["MemoryPanel"]
        AC["AutonomyControl"]
    end

    subgraph "Output"
        DOM["React DOM"]
        ORB["WebGL Orb (OGL)"]
        TOAST["Toast"]
        LS["localStorage"]
    end

    TEXT --> COMP
    VOICE --> COMP
    FILE --> COMP
    CLICK --> CS

    COMP --> CS --> API --> CHAT_EP --> SSE --> CS --> RENDER --> MD --> DOM
    SSE -->|"confidence field"| AS --> CB
    WS_EP --> WS --> AS --> ASB & TPP

    HIST_EP --> CS
    MEM_EP --> MP
    SET_EP --> LS

    I18N --> DOM
    CS --> ORB
    API --> TOAST
    AC -->|"PATCH /settings/autonomy"| SET_EP
```

---

## Component Communication Map

```mermaid
flowchart LR
    subgraph "Shell"
        SB["Sidebar"]
        TB["Topbar"]
    end

    subgraph "Chat"
        ASB_C["AgentStatusBar"]
        TPP_C["TaskProgressPanel"]
        CB_C["ConfidenceBadge"]
        THR["MessageThread"]
        CMP["Composer"]
    end

    subgraph "Sidebar Panels"
        MP_C["MemoryPanel"]
        SP["SearchPalette"]
    end

    subgraph "Settings"
        SM["SettingsModal"]
        AC_C["AutonomyControl"]
    end

    subgraph "Stores"
        CS["ChatStore"]
        ATS["AgentStore"]
        US["UIStore"]
        IS["I18nStore"]
        AUTH["AuthStore"]
    end

    SB <-->|"conversations"| CS
    TB <-->|"sidebarOpen"| US
    CMP -->|"sendMessage()"| CS
    THR <-->|"messages[]"| CS
    ASB_C <-->|"activeAgent, action"| ATS
    TPP_C <-->|"taskTree"| ATS
    CB_C <-->|"confidenceMap[id]"| ATS
    MP_C <-->|"React Query /memory"| CS
    AC_C <-->|"autonomyLevel"| US
    SM <-->|"activeModal"| US
    SB <-->|"labels"| IS
    TB <-->|"labels"| IS
    CMP <-->|"placeholder"| IS
```

---

## State Hydration on App Init

```mermaid
sequenceDiagram
    participant Browser
    participant main.tsx
    participant AuthStore
    participant ChatStore
    participant AgentStore
    participant API

    Browser->>main.tsx: Page load
    main.tsx->>AuthStore: hydrate() ← localStorage['both_token']
    AuthStore->>API: GET /auth/me (if token exists)
    API-->>AuthStore: User object or 401
    AuthStore->>main.tsx: isAuthenticated = true/false

    main.tsx->>ChatStore: loadHistory() ← GET /chat/history
    API-->>ChatStore: Conversation[] (recent 20)

    main.tsx->>AgentStore: init() ← wsConnection = null

    Note over AgentStore: useWebSocket hook mounts in ChatPage
    AgentStore->>API: WS /ws?token= (lazy, on ChatPage mount)
```

---

## Zustand Store Interaction Map

```mermaid
flowchart LR
    subgraph "ChatStore"
        C1["conversations[]"]
        C2["messages[]"]
        C3["isStreaming"]
        C4["abortController"]
    end

    subgraph "AgentStore"
        A1["activeAgent"]
        A2["taskTree"]
        A3["confidenceMap"]
        A4["wsConnection"]
    end

    subgraph "UIStore"
        U1["sidebarOpen"]
        U2["autonomyLevel"]
        U3["activeModal"]
    end

    subgraph "AuthStore"
        AT1["user"]
        AT2["token"]
    end

    subgraph "I18nStore"
        I1["language"]
    end

    UCH["useChat hook"] --> C2 & C3 & C4
    USSE["useSSE hook"] --> C2
    USSE --> A3
    UWS["useWebSocket hook"] --> A1 & A2 & A4
    UAT["useAuth hook"] --> AT1 & AT2
    UM["useMemory hook"] -.->|"React Query only"| C1

    A1 --> ASB_S["AgentStatusBar"]
    A2 --> TPP_S["TaskProgressPanel"]
    A3 --> CB_S["ConfidenceBadge"]
    C2 --> THR_S["MessageThread"]
    U1 --> SB_S["Sidebar"]
    U2 --> AC_S["AutonomyControl"]
    AT2 --> CLI_S["api/client.ts"]
```
