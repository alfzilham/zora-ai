# ZORA CODE — Big Roadmap & Architecture
> Web-based AI-powered code editor. Inspired by Trae (UI), VS Code Marketplace, and Cursor/Antigravity (AI Agent).

---

## Vision

ZORA Code is a **browser-native, AI-first code editor** that brings the full IDE experience to the web — with ZORA AI as the intelligence layer. Users can write, run, debug, and deploy code entirely from the browser, assisted by an AI agent powered by Qwen (NVIDIA) via the ZORA orchestration system.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| UI Shell | HTML, CSS, JavaScript (Vanilla) | No frameworks — pure DOM |
| Code Editor Core | **CodeMirror 6** | Syntax highlight, multi-lang, themes |
| Terminal | **Xterm.js** | Full terminal emulator in browser |
| Backend Runtime | **Python FastAPI** | Executes code via subprocess sandboxing |
| AI Agent | **ZORA AI → Qwen (NVIDIA)** | Code generation, debug, explain |
| File System | **Browser Origin Private FS (OPFS)** | Persistent virtual file system |
| Marketplace | Static JSON registry | Extension metadata + install simulation |
| Auth | JWT (shared with ZORA main) | Same session as ZORA Chat |
| Deploy | Vercel (same as ZORA main) | Serverless |

---

## UI Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  MENUBAR  [File] [Edit] [View] [Run] [Terminal] [Help]  [ZORA▼] │
├────────────────────────────────────────────────────────────────-┤
│ AB │     SIDEBAR PANEL      │    EDITOR AREA    │  AI PANEL     │
│    │                        │                   │               │
│ 🗂 │  ┌──────────────────┐  │  ┌─────────────┐  │  ┌─────────┐ │
│    │  │  File Explorer   │  │  │  Tab Bar    │  │  │  ZORA   │ │
│ 🔍 │  │  > src/          │  │  ├─────────────┤  │  │  Agent  │ │
│    │  │    > index.js    │  │  │             │  │  │         │ │
│ 🔀 │  │    > App.jsx     │  │  │  CodeMirror │  │  │  Chat   │ │
│    │  │  > package.json  │  │  │  Editor     │  │  │  area   │ │
│ 🧩 │  │  > .env          │  │  │             │  │  │         │ │
│    │  └──────────────────┘  │  └─────────────┘  │  ├─────────┤ │
│ 🤖 │                        ├───────────────────┤  │ Inline  │ │
│    │                        │   TERMINAL PANEL  │  │ suggest │ │
│ ⚙️ │                        │  $ npm run dev    │  └─────────┘ │
│    │                        │  > Local: :3000   │               │
└────┴────────────────────────┴───────────────────┴───────────────┘
```

### Zone Breakdown

| Zone | ID | Description |
|---|---|---|
| Menu Bar | `#menubar` | Top bar — file/edit/view/run menus + ZORA branding |
| Activity Bar | `#activityBar` | Far-left icon strip — switches sidebar panels |
| Sidebar Panel | `#sidePanel` | Collapsible — Explorer / Search / Git / Extensions / AI |
| Editor Area | `#editorArea` | Tab bar + CodeMirror instances (split view supported) |
| AI Panel | `#aiPanel` | Right drawer — ZORA Agent chat + inline suggestions |
| Terminal Panel | `#terminalPanel` | Bottom resizable — Xterm.js multi-tab terminal |
| Status Bar | `#statusBar` | Bottom strip — language, line/col, git branch, errors |

---

## Feature Modules

### Module 1 — Editor Core
- CodeMirror 6 integration
- Syntax highlight: JavaScript, TypeScript, Python, HTML, CSS, JSON, Markdown, Bash, Go, Rust, Java, C/C++, SQL, YAML, TOML
- Multi-tab editor with tab management (open, close, reorder, dirty state)
- Split editor (horizontal & vertical)
- Themes: ZORA Dark (default), ZORA Light
- Find & Replace (Ctrl+H)
- Multi-cursor editing
- Auto-close brackets/quotes
- Line numbers, minimap placeholder
- Keyboard shortcuts (VS Code compatible)

### Module 2 — File System (OPFS)
- Virtual project file tree via Origin Private File System
- Create / rename / delete files and folders
- Drag & drop file upload
- Import project (ZIP upload → extract to OPFS)
- Export project (ZIP download)
- `.gitignore` aware file tree filtering
- File icons by extension (devicons)
- Recent projects list (localStorage)

### Module 3 — Terminal
- Xterm.js embedded terminal
- Multi-tab terminal support
- WebSocket bridge to FastAPI backend for real process execution
- Supported runtimes (via backend subprocess):
  - Node.js (npm, npx, node)
  - Python (python3, pip)
  - Bash/Shell
  - Git
- Terminal split (horizontal)
- Terminal themes matching editor theme
- Persistent terminal history per session

### Module 4 — AI Agent (ZORA)
- Powered by **Qwen (qwen3.5-122b-a10b)** via NVIDIA NIM
- **Chat mode** — conversational code Q&A in AI panel
- **Inline suggestions** — ghost text completions (Tab to accept)
- **Agent mode** — multi-step task execution:
  - "Build a REST API for user auth"
  - "Fix all TypeScript errors in this file"
  - "Refactor this function to use async/await"
- **Context awareness** — agent reads open file + selected code
- **Apply changes** — agent proposes diff, user accepts/rejects per block
- **Explain code** — right-click → "Explain with ZORA"
- **Generate tests** — right-click → "Generate tests"
- **Commit message** — auto-generate from git diff
- Extended Thinking mode toggle (Groq pre-reasoning layer)

### Module 5 — Marketplace
- Extension browser inspired by VS Code Marketplace
- Categories: Themes, Language Support, Linters, Formatters, AI Tools, Snippets
- Search + filter by category/rating
- Extension cards: name, publisher, description, install count, rating
- Install/Uninstall simulation (localStorage state)
- Featured extensions curated list
- ZORA Extensions (official): ZORA Copilot, ZORA Themes, ZORA Snippets

### Module 6 — Run & Debug
- Run button per file type (detects language → correct command)
- Output panel (stdout/stderr streaming via SSE)
- Basic error highlighting (link error line → editor)
- Environment variables panel (.env editor)
- Run configurations (save npm scripts, python commands)

### Module 7 — Git Integration (UI only — Phase 2)
- Git status sidebar panel (modified, staged, untracked files)
- Diff viewer (side-by-side)
- Commit message composer with AI assist
- Branch display in status bar
- Push/pull buttons (calls backend git subprocess)

### Module 8 — Settings
- Editor preferences: font size, font family, tab size, word wrap, minimap
- Theme selector
- Keybinding reference sheet
- AI Agent settings: model, temperature, context window
- Sync settings to localStorage

---

## File Structure

```
frontend/public/labs/
├── code.html                  ← Main editor shell
├── code/
│   ├── css/
│   │   ├── editor.css         ← Editor layout & zones
│   │   ├── sidebar.css        ← File explorer, panels
│   │   ├── terminal.css       ← Terminal styling
│   │   ├── ai-panel.css       ← AI agent panel
│   │   ├── marketplace.css    ← Extensions browser
│   │   └── statusbar.css      ← Bottom status bar
│   ├── js/
│   │   ├── editor.js          ← CodeMirror init & tab management
│   │   ├── filesystem.js      ← OPFS virtual file system
│   │   ├── terminal.js        ← Xterm.js init & WebSocket bridge
│   │   ├── ai-agent.js        ← ZORA AI chat & inline suggest
│   │   ├── marketplace.js     ← Extension browser logic
│   │   ├── git.js             ← Git status & diff UI
│   │   ├── run.js             ← Run configurations & output
│   │   ├── settings.js        ← Preferences & theme
│   │   └── keybindings.js     ← Keyboard shortcut map
│   └── data/
│       ├── extensions.json    ← Marketplace extension registry
│       └── snippets.json      ← Code snippet library

backend/app/routers/
└── code_editor.py             ← WebSocket terminal + run endpoints

backend/app/services/
└── sandbox.py                 ← Subprocess sandbox for code execution
```

---

## Backend API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `WS` | `/code/terminal` | WebSocket — bidirectional terminal I/O |
| `POST` | `/code/run` | Execute code snippet, return output via SSE |
| `POST` | `/code/format` | Format code (black/prettier) |
| `GET` | `/code/runtimes` | List available runtimes on server |
| `POST` | `/labs/code` | AI code generation via Qwen |

---

## Design System

### Colors (Dark Theme — Default)

| Token | Value | Usage |
|---|---|---|
| `--editor-bg` | `#1e1e1e` | Editor background |
| `--sidebar-bg` | `#252526` | Sidebar background |
| `--actbar-bg` | `#1e1e1e` | Activity bar background |
| `--panel-bg` | `#1e1e1e` | Terminal/bottom panel |
| `--border` | `#3e3e42` | All borders |
| `--text-primary` | `#cccccc` | Editor text |
| `--text-muted` | `#858585` | Comments, line numbers |
| `--accent` | `#0099CC` | ZORA accent (tabs, selections) |
| `--accent-glow` | `rgba(0,153,204,0.15)` | AI suggestion highlight |
| `--tab-active` | `#1e1e1e` | Active tab background |
| `--tab-inactive` | `#2d2d2d` | Inactive tab background |
| `--statusbar-bg` | `#007ACC` | Status bar (VS Code blue) |

### Typography

| Usage | Font | Size |
|---|---|---|
| UI Chrome | Plus Jakarta Sans | 13px |
| Editor | JetBrains Mono | 14px |
| Terminal | JetBrains Mono | 13px |
| Status Bar | Plus Jakarta Sans | 12px |

---

## Build Roadmap

### Phase 1 — Shell & Editor (Week 1–2)
**Goal:** Working editor with file system and multi-tab support.

- [ ] HTML shell layout (all zones, no logic)
- [ ] CSS layout system (flexbox zones, resizable panels)
- [ ] Activity bar + sidebar panel switching
- [ ] CodeMirror 6 integration with multi-language support
- [ ] Tab management (open, close, reorder, dirty indicator)
- [ ] OPFS file system (create, read, write, delete)
- [ ] File explorer tree with file icons
- [ ] Find & Replace
- [ ] Status bar (language, line/col)
- [ ] Theme: ZORA Dark

### Phase 2 — Terminal & Run (Week 3)
**Goal:** Real code execution in browser.

- [ ] Xterm.js integration
- [ ] Multi-tab terminal
- [ ] WebSocket bridge to FastAPI backend
- [ ] Node.js runtime support
- [ ] Python runtime support
- [ ] Run button (auto-detect language)
- [ ] Output panel with streaming
- [ ] .env editor panel
- [ ] Error line linking (click error → jump to line)

### Phase 3 — AI Agent (Week 4–5)
**Goal:** ZORA AI fully integrated as coding assistant.

- [ ] AI Panel layout (right drawer)
- [ ] Chat mode — conversational Q&A
- [ ] Context injection (open file + selection → prompt)
- [ ] Inline ghost text suggestions
- [ ] Apply diff — accept/reject per block
- [ ] Agent mode — multi-step task execution
- [ ] Right-click context menu (Explain, Refactor, Generate Tests)
- [ ] Commit message generator
- [ ] Extended Thinking toggle

### Phase 4 — Marketplace (Week 6)
**Goal:** Extension browser with install/uninstall.

- [ ] Marketplace panel UI
- [ ] Extension card component
- [ ] Category filter + search
- [ ] Install/uninstall state (localStorage)
- [ ] Featured extensions section
- [ ] ZORA official extensions
- [ ] Extension detail view

### Phase 5 — Git & Polish (Week 7–8)
**Goal:** Git UI + production-ready polish.

- [ ] Git status sidebar panel
- [ ] Diff viewer (side-by-side)
- [ ] Commit composer
- [ ] Branch display in status bar
- [ ] Settings panel (all preferences)
- [ ] Keyboard shortcut map
- [ ] ZORA Light theme
- [ ] Split editor (horizontal & vertical)
- [ ] Welcome screen (new user onboarding)
- [ ] Performance optimization
- [ ] Mobile responsive (read-only view)

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+P` | Quick open file |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+\`` | Toggle terminal |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+K Ctrl+Z` | Toggle AI panel |
| `Ctrl+Enter` | Run current file |
| `Ctrl+H` | Find & Replace |
| `Alt+Z` | Toggle word wrap |
| `Ctrl+Shift+K` | Delete line |
| `Alt+↑/↓` | Move line up/down |
| `Ctrl+/` | Toggle comment |
| `Tab` | Accept AI suggestion |
| `Escape` | Dismiss AI suggestion |
| `Ctrl+Shift+E` | Focus file explorer |
| `Ctrl+Shift+X` | Open Marketplace |

---

## Supported Languages

| Language | Syntax | Run | Format | AI |
|---|---|---|---|---|
| JavaScript | ✅ | ✅ Node.js | ✅ Prettier | ✅ |
| TypeScript | ✅ | ✅ ts-node | ✅ Prettier | ✅ |
| JSX/TSX | ✅ | ✅ | ✅ Prettier | ✅ |
| Python | ✅ | ✅ python3 | ✅ Black | ✅ |
| HTML | ✅ | ✅ Live preview | ✅ Prettier | ✅ |
| CSS/SCSS | ✅ | — | ✅ Prettier | ✅ |
| JSON | ✅ | — | ✅ | ✅ |
| Markdown | ✅ | ✅ Preview | — | ✅ |
| Bash/Shell | ✅ | ✅ | — | ✅ |
| Go | ✅ | 🔜 Phase 2 | 🔜 | ✅ |
| Rust | ✅ | 🔜 Phase 2 | 🔜 | ✅ |
| Java | ✅ | 🔜 Phase 2 | 🔜 | ✅ |
| C/C++ | ✅ | 🔜 Phase 2 | 🔜 | ✅ |
| SQL | ✅ | — | — | ✅ |
| YAML/TOML | ✅ | — | — | ✅ |

---

## Security Considerations

- Code execution runs in **sandboxed subprocess** with:
  - Time limit: 30s per execution
  - Memory limit: 256MB
  - No network access from sandbox
  - No filesystem access outside project directory
- JWT required for all `/code/*` endpoints
- Rate limiting: 60 executions/hour per user
- CORS restricted to ZORA domain

---

## Dependencies (External CDN)

```html
<!-- CodeMirror 6 -->
<script type="module" src="https://cdn.jsdelivr.net/npm/codemirror@6/dist/index.js"></script>

<!-- Xterm.js -->
<script src="https://cdn.jsdelivr.net/npm/xterm@5/lib/xterm.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5/css/xterm.css">

<!-- Xterm FitAddon -->
<script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8/lib/xterm-addon-fit.js"></script>
```

---

## Milestones

| Milestone | Target | Deliverable |
|---|---|---|
| M1 — Shell | Week 2 | Working layout + CodeMirror + file tree |
| M2 — Terminal | Week 3 | Real terminal with Node.js + Python |
| M3 — AI Agent | Week 5 | Full ZORA AI integration |
| M4 — Marketplace | Week 6 | Extension browser |
| M5 — Production | Week 8 | Full polish + deploy |

---

*ZORA Code — Built on ZORA AI Platform | © 2026 ZORA AI*