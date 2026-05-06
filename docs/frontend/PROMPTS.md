# Both AI — Frontend Development Prompts
## React + Vite SPA — Prompt Reference Library

---

## How to Use This Document

Each prompt is a ready-to-paste instruction block for an AI coding assistant.
Copy the block under the `**Prompt:**` heading verbatim. Adjust file paths if needed.

---

## SECTION 1 — Foundation & Setup

---

### PROMPT-01: Vite + React Scaffold

**Context:** Phase -1 starting point.

**Prompt:**
```
Create a production-ready Vite + React 18 + TypeScript project at `frontend/`.

Requirements:
- Template: react-ts
- Install: react-router-dom v6, zustand, @tanstack/react-query, axios, framer-motion,
  tailwindcss, i18next, react-i18next, dompurify, marked, highlight.js
- Configure tailwind.config.ts with darkMode: 'class'
- Configure vite.config.ts with path aliases (@/ → src/) and manualChunks:
  { vendor: ['react','react-dom','react-router-dom'], ui: ['framer-motion','@tanstack/react-query'] }
- Create src/main.tsx that mounts App inside QueryClientProvider
- Create src/App.tsx that wraps RouterProvider
- Create src/router.tsx with placeholder routes: /, /login, /chat, /incognito, /dashboard
- Output the complete file contents for each file created.
```

---

### PROMPT-02: Zustand Store Scaffold

**Context:** Phase -1.4 — all 5 stores.

**Prompt:**
```
Create 5 Zustand stores for the Both AI frontend in TypeScript at src/stores/.

STORE 1 — authStore.ts:
State: user (User | null), token (string | null), isAuthenticated (boolean)
Actions: setUser, setToken, logout, hydrate (reads localStorage['both_token'])

STORE 2 — chatStore.ts:
State: conversations (Conversation[]), activeConversationId (string | null),
       messages (Message[]), isStreaming (boolean), abortController (AbortController | null)
Actions: setConversations, setActiveConversation, appendMessage, updateLastMessage,
         setStreaming, setAbortController

STORE 3 — uiStore.ts:
State: sidebarOpen (boolean), activeModal (string | null), autonomyLevel (0|1|2),
       widescreen (boolean), theme ('dark')
Actions: toggleSidebar, openModal, closeModal, setAutonomyLevel

STORE 4 — i18nStore.ts:
State: language (string), supportedLanguages (string[])
Actions: setLanguage

STORE 5 — agentStore.ts:
State: activeAgent ('Supervisor'|'Both'|'Both'|null), currentAction (string|null),
       stepCurrent (number), stepTotal (number), taskTree (TaskNode[]),
       taskVisible (boolean), confidenceMap (Record<string,number>),
       wsConnection (WebSocket|null), wsConnected (boolean)
Actions: setActiveAgent, setTaskTree, setTaskProgress, setConfidence,
         setWsConnection, abortTask

Interface TaskNode: { id, label, agent, status: 'pending'|'in_progress'|'done'|'failed', children? }

All stores use Zustand. AuthStore persists token to localStorage['both_token'].
UIStore persists autonomyLevel to localStorage['both_autonomy'].
```

---

### PROMPT-03: Axios Client + JWT Interceptor

**Context:** Phase -1.5

**Prompt:**
```
Create src/api/client.ts — the central Axios HTTP client for Both AI.

Requirements:
- baseURL from import.meta.env.VITE_API_URL
- Request interceptor: attach Authorization: Bearer {token} from authStore
- Response interceptor: on 401 → call authStore.logout() + redirect to /login
- Export typed helper functions: apiGet<T>, apiPost<T>, apiPut<T>, apiPatch<T>, apiDelete<T>
- Each helper accepts (path, data?, config?) and returns Promise<T>
- Include error normalization: extract error.response.data.detail or fallback message

TypeScript only. No default exports — named exports only.
```

---

### PROMPT-04: i18next Setup + Locale Migration

**Context:** Phase -1.7

**Prompt:**
```
Set up i18next for Both AI at src/i18n/index.ts.

Requirements:
- Install: i18next, react-i18next, i18next-browser-languagedetector
- Init with: lng detection from localStorage['both_language'], fallbackLng: 'en'
- Namespaces: common, chat, settings, onboarding, errors
- Create src/i18n/locales/en.json with these keys (nested):
  common: { newChat, search, settings, logout, save, cancel, confirm, delete }
  chat: { placeholder, thinking, typing, copy, regenerate, feedback, send, attach, voice }
  settings: { profile, language, interface, chatHistory, faq, about, save, cancel }
  onboarding: { step1Title, step2Title, step3Title, next, finish }
  errors: { network, unauthorized, rateLimited, generic }
- Create stub locale files for: id, ja, ko, zh, fr, de, it, pt, es, ar
  (copy en.json structure, values = English as placeholder)
- Export i18n instance + LanguageCode type
```

---

## SECTION 2 — App Shell

---

### PROMPT-05: AppShell + Sidebar

**Context:** Phase 1.1–1.3

**Prompt:**
```
Create the App Shell for Both AI using React + TailwindCSS + Framer Motion.

FILE: src/components/shell/AppShell.tsx
- Full-height flex layout: Sidebar (left, fixed) + main area (flex-1, scrollable)
- Reads uiStore.sidebarOpen for sidebar width (68px collapsed / 260px expanded)
- Framer Motion: sidebar width animates with spring({ stiffness: 300, damping: 30 })
- Dark theme: bg-zinc-950 base, bg-zinc-900 sidebar

FILE: src/components/shell/Sidebar.tsx
Props: none (reads uiStore + chatStore + i18nStore internally)
- Top section: vertical icon nav (Home, Search, History, MemoryPanel icon, Feedback)
- Middle: ConversationList.tsx (only shown when expanded)
- Bottom: UserProfile.tsx
- Framer Motion width transition on sidebarOpen toggle
- On mobile (<768px): renders as overlay with backdrop blur

FILE: src/components/shell/ConversationList.tsx
- Reads chatStore.conversations
- Groups by date: Today / Yesterday / Previous 7 Days / Older (use utils/date.ts)
- Each item: ConversationItem.tsx (title + right-click context menu: Rename, Archive)
- React Query: fetches GET /chat/history on mount

Output all 3 files with full TypeScript + TailwindCSS implementation.
```

---

### PROMPT-06: Topbar Component

**Context:** Phase 1.5

**Prompt:**
```
Create src/components/shell/Topbar.tsx for Both AI.

Props: none (reads stores internally)
Features:
- Left: HamburgerIcon button → uiStore.toggleSidebar()
- Center: ModelSelector dropdown (list of model names from constants.ts; selected stored in chatStore)
- Right: AutonomyControl compact variant + NewChat button + ConversationTitle (editable on double-click)
- Compact height: h-12, border-b border-zinc-800, backdrop-blur-sm bg-zinc-950/80
- Responsive: title hidden on mobile; model selector truncates

Also create src/utils/constants.ts with:
- MODELS array: [{ id, label, provider }] for all 11 models from ARCHITECTURE.md
- AUTONOMY_LEVELS: [{ level: 0, label: 'Always ask' }, { level: 1, label: 'Ask on ambiguity' }, { level: 2, label: 'Fully autonomous' }]
- SSE_DONE = '[DONE]'
- WS_HEARTBEAT_INTERVAL = 30000

Full TypeScript. TailwindCSS dark theme.
```

---

## SECTION 3 — Authentication

---

### PROMPT-07: Login + OAuth Callback

**Context:** Phase 2.1–2.3

**Prompt:**
```
Create the authentication pages for Both AI.

FILE: src/components/auth/LoginPage.tsx
- Dark full-page layout with centered card (glass: bg-zinc-900/60 backdrop-blur border border-zinc-800)
- Both AI logo/wordmark at top
- Two OAuth buttons: Google (red) + GitHub (white/zinc)
  - onClick: redirect to VITE_API_URL + /auth/google or /auth/github
- Divider "or"
- Email + Password inputs + Sign In button
  - onSubmit: POST /auth/login → authStore.setToken + navigate('/chat')
- "Don't have an account? Register" link
- Error toast on failure

FILE: src/components/auth/OAuthCallback.tsx
- Route: /auth/callback
- On mount: extract ?token= from URL search params
- Call authStore.setToken(token) + authStore.hydrate()
- Check if onboarding_done from GET /auth/me
  - if false → navigate('/onboarding')
  - if true → navigate('/chat')
- Show loading spinner while processing

FILE: src/components/common/ProtectedRoute.tsx
- HOC: if !authStore.isAuthenticated → navigate('/login', { replace: true })
- Else: render <Outlet />

Full TypeScript. Use useNavigate + useSearchParams from react-router-dom.
```

---

### PROMPT-08: Onboarding Wizard

**Context:** Phase 2.5

**Prompt:**
```
Create src/components/auth/OnboardingWizard.tsx for Both AI.

3-step animated wizard using Framer Motion AnimatePresence:

Step 1 — Name:
- Input: "What should Both call you?"
- Validates non-empty

Step 2 — Topics (multi-select chips):
- 15 topic chips: Technology, Science, Business, Arts, Health, Education,
  Travel, Food, Sports, Gaming, Music, Film, Finance, News, Philosophy
- Min 1 selected; chips toggle on/off (Tailwind ring style on selected)

Step 3 — Language:
- 11-language grid with flag emoji + native name + language code
- Single selection; defaults to browser language if supported

Progress dots at bottom (3 circles, active = accent color)

On Finish: POST /onboarding/ { name, topics, language } → navigate('/chat')

Each step slides in from right using Framer Motion (x: 40 → 0, opacity: 0 → 1)
Slide out left on next (x: 0 → -40, opacity: 1 → 0)

Full TypeScript. TailwindCSS dark. i18next keys for all labels.
```

---

## SECTION 4 — Chat Interface

---

### PROMPT-09: Chat Page Layout

**Context:** Phase 3 structure

**Prompt:**
```
Create src/components/chat/ChatPage.tsx — the main chat route component.

Layout (top to bottom, full height):
1. AgentStatusBar (always rendered, visibility controlled by agentStore)
2. If messages.length === 0: WelcomeScreen (centered, full area)
3. If messages.length > 0: MessageThread (scrollable, flex-1)
4. TaskProgressPanel (collapsible, above Composer, shown when agentStore.taskVisible)
5. Composer (bottom, sticky)

Behavior:
- Fetches conversation history from chatStore on route param change (:id)
- Auto-scrolls to bottom on new message (useRef + useEffect)
- Sets document.title to conversation title or "Both AI"
- Keyboard: Escape cancels streaming (calls abortController.abort())

Props: none (reads chatStore + agentStore via Zustand)

Full TypeScript. TailwindCSS. Use React.Suspense for WebGLOrb lazy import.
```

---

### PROMPT-10: SSE Streaming Hook

**Context:** Phase 3.3–3.4

**Prompt:**
```
Create src/hooks/useChat.ts and src/hooks/useSSE.ts for Both AI.

FILE: src/hooks/useSSE.ts
- Generic SSE hook: useSSE(url, body, { onToken, onThinking, onDone, onError, onConfidence })
- Uses fetch() with ReadableStream (not EventSource — we need POST)
- Parses lines starting with "data: "
- Detects [DONE] signal → calls onDone()
- Parses JSON: { token } → onToken, { thinking } → onThinking, { confidence } → onConfidence
- Stores AbortController in chatStore.abortController

FILE: src/hooks/useChat.ts
- sendMessage(content: string, attachments?: File[]) → calls useSSE internally
- On send: append user message to chatStore immediately (optimistic)
- Create streaming assistant message placeholder in chatStore
- Token by token: update last message content via chatStore.updateLastMessage
- On confidence event: agentStore.setConfidence(messageId, score)
- On done: chatStore.setStreaming(false)
- On error: toast notification + chatStore.setStreaming(false)
- Abort: calls abortController.abort()

Full TypeScript. Handle network errors gracefully.
```

---

### PROMPT-11: Markdown Renderer + Code Block

**Context:** Phase 3.6–3.7

**Prompt:**
```
Create the markdown rendering pipeline for Both AI.

FILE: src/utils/markdown.ts
- renderMarkdown(raw: string): string
  1. Extract <think>...</think> blocks (return separately as thinkContent)
  2. Pass remaining content through marked.js with options: { breaks: true, gfm: true }
  3. Pass through highlight.js for code blocks (auto-detect language)
  4. Sanitize with DOMPurify: { ALLOWED_TAGS: standard prose + code + table tags }
  5. Return { html: string, thinkContent: string | null }

FILE: src/components/chat/CodeBlock.tsx
Props: { code: string, language: string }
- Renders pre + code with highlight.js class
- Language tag (top-right, pill style, zinc-700)
- Copy button: copies code to clipboard; shows checkmark for 2s
- Line numbers if code > 5 lines

FILE: src/components/chat/ThinkBlock.tsx
Props: { content: string }
- Collapsible panel (default: collapsed)
- Header: 💭 "Extended Reasoning" + chevron toggle
- Framer Motion height animation (height: 0 → auto)
- Content rendered as plain text (no markdown re-parse)
- Subtle border-l-2 border-purple-500/40 style

Full TypeScript.
```

---

## SECTION 5 — Superintelligence UI Components

---

### PROMPT-12: AgentStatusBar [UI-GAP-01]

**Context:** Phase 3.11 — critical new component

**Prompt:**
```
Create src/components/chat/AgentStatusBar.tsx for Both AI.

This component shows real-time agent execution status from WebSocket events.

Props:
interface AgentStatusBarProps {
  isVisible: boolean;
  activeAgent: 'Supervisor' | 'Both (Coding)' | 'Both (General)' | null;
  currentAction: string | null;
  stepCurrent: number;
  stepTotal: number;
  onAbort: () => void;
}

UI:
- Thin horizontal bar below Topbar (h-9)
- Left: colored dot (Supervisor=purple, Both (Coding)=blue, Both (General)=green) + agent name + currentAction text
- Center: step progress "Step 3 of 7" (only if stepTotal > 1)
- Right: "Stop" button (red, small, only during active task)
- Framer Motion: AnimatePresence (opacity 0→1 on mount, 1→0 on unmount)
- Background: bg-zinc-900/80 border-b border-zinc-800

Integration:
- Reads from agentStore: activeAgent, currentAction, stepCurrent, stepTotal
- onAbort calls agentStore.abortTask which sends { type: 'abort' } via WebSocket
- isVisible = agentStore.activeAgent !== null

Full TypeScript. No external dependencies beyond framer-motion and TailwindCSS.
```

---

### PROMPT-13: TaskProgressPanel [UI-GAP-02]

**Context:** Phase 5.4

**Prompt:**
```
Create src/components/chat/TaskProgressPanel.tsx for Both AI.

This panel shows decomposed task trees from the Supervisor's task_planner.py.

Types (from src/types/agent.ts):
interface TaskNode {
  id: string;
  label: string;
  agent: 'Both (Coding)' | 'Both (General)';
  status: 'pending' | 'in_progress' | 'done' | 'failed';
  children?: TaskNode[];
}

Props:
interface TaskProgressPanelProps {
  taskTree: TaskNode[];
  isCollapsed: boolean;
  onToggle: () => void;
}

UI:
- Rounded panel above Composer: bg-zinc-900 border border-zinc-800 rounded-lg mx-4 mb-2
- Header row: "Task Breakdown" title + overall progress bar (%) + collapse chevron
- When expanded: recursive task tree
  - Each TaskNode: status icon (⏳ pending / 🔵 in_progress / ✅ done / ❌ failed)
    + label + agent badge (Both=blue chip, Both=green chip)
  - Children indented pl-6
- Progress: count done/total across all nodes (including children)
- Framer Motion: height animation for collapse/expand
- Auto-collapse when all tasks = 'done' after 2s delay
- Hidden when taskTree.length === 0

Full TypeScript.
```

---

### PROMPT-14: ConfidenceBadge [UI-GAP-03]

**Context:** Phase 3.10

**Prompt:**
```
Create src/components/chat/ConfidenceBadge.tsx for Both AI.

Props:
interface ConfidenceBadgeProps {
  score: number;       // 0.0 to 1.0
  agent: string;       // which agent answered
  model: string;       // model used
  routingReason?: string;
}

Logic:
- score >= 0.85 → tier 'high'   → green dot (#22c55e)
- 0.60–0.84    → tier 'medium' → yellow dot (#eab308)
- < 0.60       → tier 'low'    → red dot (#ef4444) + warning text "Low confidence"

UI:
- Inline element, sits below message timestamp
- Compact: "● 94%" in small gray text (text-xs text-zinc-500)
- On hover: Framer Motion tooltip showing:
  - Confidence: 94%
  - Agent: Supervisor → Both
  - Model: nemotron-3-super-120b
  - Routing reason (if provided)
- Tooltip: absolute positioned, bg-zinc-800 rounded-lg p-3 text-xs w-48
- Low confidence tier only: show "⚠ Low confidence" text after percentage

Full TypeScript. No external tooltip library — custom Framer Motion implementation.
```

---

### PROMPT-15: MemoryPanel [UI-GAP-04]

**Context:** Phase 5.5

**Prompt:**
```
Create src/components/sidebar/MemoryPanel.tsx for Both AI.

This panel shows the user's persistent memory from vector_store.py via GET /memory/user.

Props:
interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

Types:
interface MemoryItem {
  id: string;
  type: 'topic' | 'correction' | 'key_fact' | 'language';
  content: string;
  created_at: string;
}

UI:
- Slide-in panel from left side of Sidebar (not full-screen overlay)
- Width: 280px, height: full, bg-zinc-900 border-r border-zinc-800
- Framer Motion: x: -280 → 0 slide animation
- Header: "Memory" title + brain emoji + close button (X)
- React Query: useQuery(['memory'], () => apiGet<MemoryItem[]>('/memory/user'))
- Loading: 3 skeleton rows (Skeleton.tsx)
- Empty state: "No memories yet. Start chatting for Both to learn about you."
- Each MemoryItem:
  - Type badge: colored chip (topic=purple, correction=red, key_fact=blue, language=green)
  - Content text (truncate at 2 lines)
  - Relative date (utils/date.ts)
  - Delete button (X icon, hover reveal) → useMutation DELETE /memory/user/{id} (optimistic remove)
- Footer: "Clear all memory" button (red outline) → ConfirmDialog → DELETE /memory/user/all

Full TypeScript. React Query for all server state.
```

---

### PROMPT-16: AutonomyControl [UI-GAP-05]

**Context:** Phase 5.6

**Prompt:**
```
Create src/components/settings/AutonomyControl.tsx for Both AI.

Two variants: 'full' (InterfaceTab in Settings) and 'compact' (Topbar dropdown).

Props:
interface AutonomyControlProps {
  variant: 'full' | 'compact';
}

Autonomy Levels (from constants.ts AUTONOMY_LEVELS):
- 0: "Always ask" — confirm before every agent action
- 1: "Ask on ambiguity" — proceed unless task is unclear
- 2: "Fully autonomous" — execute without user confirmation

Full variant UI:
- Section header: "Agent Autonomy" + info tooltip explaining the levels
- Three large radio cards stacked vertically:
  - Radio indicator + level name (bold) + description text
  - Selected: ring-2 ring-violet-500 bg-zinc-800
  - Unselected: bg-zinc-900 border border-zinc-700
- On change: uiStore.setAutonomyLevel(level) + PATCH /settings/autonomy { level }
  + localStorage['both_autonomy'] = level

Compact variant UI:
- Small dropdown button in Topbar: shows current level as icon + short label
- Dropdown: 3 items with level name + short description
- Framer Motion: scale + opacity animation on dropdown open/close
- Same onChange logic as full variant

Full TypeScript. i18next keys for all labels.
```

---

## SECTION 6 — WebSocket Integration

---

### PROMPT-17: WebSocket Hook

**Context:** Phase 3.12 / Phase 5

**Prompt:**
```
Create src/api/ws.ts and src/hooks/useWebSocket.ts for Both AI.

FILE: src/api/ws.ts
- createWsConnection(token: string): WebSocket
  - URL: import.meta.env.VITE_WS_URL + '/ws?token=' + token
  - Sets onmessage, onerror, onclose handlers
  - Exports sendWsMessage(ws: WebSocket, payload: object): void
  - Exports WsEventType enum: AGENT_STEP, TASK_DECOMPOSED, TASK_PROGRESS,
    GOAL_UPDATE, TASK_DONE, RECOVERY, AGENT_ERROR, HEARTBEAT

FILE: src/hooks/useWebSocket.ts
- useWebSocket() hook
- On mount: calls createWsConnection with authStore.token
- Stores ws in agentStore.wsConnection
- Dispatches events to stores:
  - 'agent_step' → agentStore.setActiveAgent(event.phase, event.detail)
  - 'task_decomposed' → agentStore.setTaskTree(event.taskTree)
  - 'task_progress' → agentStore.setTaskProgress(event.taskId, event.status)
  - 'task_done' → agentStore.setActiveAgent(null, null)
  - 'recovery' → toast.warn(`Switched to ${event.agent}: ${event.reason}`)
  - 'heartbeat' → no-op (keeps connection alive)
- Reconnect logic: on close, retry after 3s (max 5 attempts)
- On unmount: ws.close()
- abortTask(taskId): sendWsMessage(ws, { type: 'abort', task_id: taskId })

Full TypeScript.
```

---

## SECTION 7 — Settings & Common Components

---

### PROMPT-18: Settings Modal

**Context:** Phase 4.1

**Prompt:**
```
Create src/components/settings/SettingsModal.tsx for Both AI.

- Full-screen overlay: fixed inset-0 bg-black/60 backdrop-blur-sm z-50
- Modal card: max-w-2xl centered, bg-zinc-900 rounded-2xl border border-zinc-800
- Framer Motion: scale(0.95)→scale(1) + opacity(0)→(1) on mount; reverse on close
- AnimatePresence in parent (uiStore.activeModal === 'settings')
- Close: Escape key + backdrop click + X button

Tab layout (left sidebar tabs + right content area):
- Profile | Language | Interface | Chat | FAQ | About

Tab: Interface
- 8 toggle rows with label + description + Switch component
- Bottom section: AutonomyControl variant='full'

Tab: Language
- 11-language grid (3 cols): flag emoji + language name + native name
- Active: ring-2 ring-violet-500

All tabs use i18next keys. Full TypeScript. TailwindCSS.
```

---

### PROMPT-19: Toast + Common Primitives

**Context:** Phase 7.2–7.5

**Prompt:**
```
Create the common UI primitives for Both AI.

FILE: src/components/common/Toast.tsx
- Global toast queue (stored in uiStore or a local ref)
- Framer Motion AnimatePresence: toasts slide in from bottom-right
- Types: success (green), error (red), warning (amber), info (blue)
- Auto-dismiss after 4s; manual close button
- Max 3 toasts visible simultaneously
- Export: toast.success(msg), toast.error(msg), toast.warn(msg), toast.info(msg)

FILE: src/components/common/Skeleton.tsx
Props: { width?: string, height?: string, className?: string }
- Animated shimmer: bg-zinc-800 with CSS keyframe pulse
- Used in: ConversationList, MemoryPanel, message history load

FILE: src/components/common/ConfirmDialog.tsx
Props: { isOpen, title, description, confirmLabel, onConfirm, onCancel, isDangerous? }
- Modal.tsx-based dialog
- isDangerous=true → confirm button is red
- Framer Motion scale animation

FILE: src/components/common/ErrorBoundary.tsx
- React class component ErrorBoundary
- Catches render errors; shows friendly error card
- "Reload" button + error detail (collapsed by default)

Full TypeScript.
```

---

## SECTION 8 — Performance & Production

---

### PROMPT-20: Code Splitting + Lazy Loading

**Context:** Phase 8.2

**Prompt:**
```
Refactor src/router.tsx to implement React.lazy() code splitting for all page components.

Requirements:
- Wrap all page-level components in React.lazy():
  const ChatPage = React.lazy(() => import('./components/chat/ChatPage'))
  const LoginPage = React.lazy(() => import('./components/auth/LoginPage'))
  etc. for: RegisterPage, OnboardingWizard, IncognitoPage, DashboardPage, OAuthCallback

- Wrap all lazy routes in <React.Suspense fallback={<Skeleton />}>

- In src/components/chat/WebGLOrb.tsx:
  - Verify the OGL import is dynamic: const { Renderer } = await import('ogl')
  - This ensures OGL is not in the initial bundle

- In src/components/chat/ChatPage.tsx:
  - Monaco Editor (if used): const MonacoEditor = React.lazy(() => import('@monaco-editor/react'))

- Update vite.config.ts manualChunks:
  Add: { ogl: ['ogl'], monaco: ['@monaco-editor/react'] }

- After changes, run: npx vite build --report
  Target: initial bundle < 300KB gzipped

Output: updated router.tsx + vite.config.ts + any changed component files.
```

---

### PROMPT-21: localStorage Dual-Key Compatibility

**Context:** Phase -1 (Both → Both migration)

**Prompt:**
```
Create src/utils/storage.ts — localStorage compatibility layer for the Both → Both migration.

Requirements:

storageGet(key: string): string | null
- Try localStorage.getItem('both_' + key) first
- If null, try localStorage.getItem('both_general_' + key) as legacy fallback
- Return value or null

storageSet(key: string, value: string): void
- Write to localStorage.setItem('both_' + key, value)
- Remove legacy: localStorage.removeItem('both_general_' + key)

storageClear(): void
- Remove all 'both_*' and 'both_general_*' keys (use Object.keys + filter)

Keys that use this util:
- 'token' → both_token / both_general_token
- 'language' → both_language / both_general_language
- 'ui_sidebar' → both_ui_sidebar / both_general_ui_sidebar
- 'autonomy' → both_autonomy (new, no legacy)

Update authStore.ts, uiStore.ts, i18nStore.ts to import and use storageGet/storageSet
instead of direct localStorage calls.

Full TypeScript. Export all three functions.
```
