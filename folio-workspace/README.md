# Folio Workspace

> **Unified AI Workspace for Angular Developers**
> Dark, premium, developer-focused — Cursor meets Linear.

![Folio Screenshot](./docs/screenshot-placeholder.png)

---

## Overview

Folio is the capstone project of a 4-week AI Engineering Roadmap. It unifies two microservice backends into a single, stunning workspace built with Angular 17+:

- **Code Intel** — RAG-powered Angular code Q&A (connects to P1 FastAPI backend)
- **Research** — Agentic research assistant with live web search (connects to P2 FastAPI backend)
- **Focus Music** — Curated playlists for deep work with AI search
- **Settings** — Persistent configuration for both backends and project path

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 17+ (standalone components) |
| State | NgRx 17 (Store + Effects) |
| Styling | TailwindCSS v3 + CSS custom properties |
| Animations | `@angular/animations` only (no external libs) |
| Reactivity | Angular Signals throughout |
| Change Detection | `OnPush` everywhere |
| Streaming | `fetch` + `ReadableStream` (SSE) |

---

## Prerequisites

- Node.js 18+
- npm 9+
- Angular CLI 17: `npm install -g @angular/cli@17`
- P1 backend running on `http://localhost:8000`
- P2 backend running on `http://localhost:8001`

---

## Setup

### 1. Clone / navigate to project

```bash
cd /Users/akshar/Desktop/AI-Projects/folio-workspace
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the dev server

```bash
npm start
# or
ng serve --open
```

Folio will open at **http://localhost:4200**

### 4. Production build

```bash
npm run build
# Output: dist/folio-workspace/
```

---

## Environment Configuration

No `.env` file needed — all configuration is done inside the **Settings** section of the UI and persisted to `localStorage`.

| Setting | Default | Description |
|---|---|---|
| P1 Backend URL | `http://localhost:8000` | FastAPI RAG doc Q&A service |
| P2 Backend URL | `http://localhost:8001` | FastAPI Agentic Research service |
| Project Path | `/Users/username/my-angular-project` | Your Angular project root (used by codebase agent) |

---

## Backend API Reference

### P1 — RAG Chat (`http://localhost:8000`)

```
POST /chat
Content-Type: application/json
Accept: text/event-stream

{
  "message": "string",
  "session_id": "string"
}

Response: SSE stream
data: {"token": "...", "done": false, "sources": [...]}
data: [DONE]
```

### P2 — Research Agent (`http://localhost:8001`)

```
POST /research
Content-Type: application/json
Accept: text/event-stream

{
  "query": "string",
  "project_path": "string"
}

Response: SSE stream
data: {"token": "...", "agent": "codebase|search", "done": false, "sources": [...]}
data: [DONE]
```

---

## Project Structure

```
folio-workspace/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── store/           # NgRx: state, actions, reducer, effects, selectors
│   │   │   └── services/        # AgentService (SSE), MusicService
│   │   ├── layout/
│   │   │   ├── sidebar/         # Collapsible sidebar with stagger animations
│   │   │   └── shell/           # App shell with route animation host
│   │   ├── features/
│   │   │   ├── code-intel/      # RAG chat interface
│   │   │   ├── research/        # Agentic research chat
│   │   │   ├── focus-music/     # Music grid + floating player
│   │   │   └── settings/        # Backend config, persisted via NgRx effects
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── message-bubble/   # Chat bubble with badge + sources
│   │   │   │   ├── streaming-text/   # Word-by-word text reveal
│   │   │   │   └── music-player/     # Floating glass player
│   │   │   └── animations/
│   │   │       └── route.animations.ts   # All Angular animations
│   │   ├── app.component.ts     # Root: gradient mesh bg + shell
│   │   ├── app.routes.ts        # Lazy-loaded routes
│   │   └── app.config.ts        # App providers (NgRx, Router, Animations)
│   ├── styles.scss              # CSS vars, Tailwind, global utilities
│   └── index.html
├── angular.json
├── tailwind.config.js
└── package.json
```

---

## Key Features & Design Decisions

### Animations
All animations use `@angular/animations` exclusively:
- **App load sequence**: sidebar slides from left → logo scales in → nav items stagger (50ms each) → content fades
- **Route transitions**: leave slides left + fades (200ms), enter slides from right (300ms)
- **Chat messages**: user bubbles spring up from bottom, agent messages fade from left
- **Music cards**: flip in like playing cards with 80ms stagger
- **Sidebar collapse**: cubic-bezier width transition 240px ↔ 64px with label fade

### Streaming
SSE streaming uses `fetch` + `ReadableStream` instead of `EventSource` to support POST requests. Tokens are appended to a Signal in real-time for live text rendering with a blinking cursor.

### State Management
- **NgRx Store**: settings, sidebar collapsed state, current music
- **Angular Signals**: all local component state (messages, input, loading states)
- **Effects**: `LoadSettingsFromStorage` on app init, `SaveSettingsToStorage` on every settings update

### Glassmorphism
Glass cards use `backdrop-filter: blur(12px)` with `rgba(255,255,255,0.03)` background and `rgba(255,255,255,0.08)` borders that glow on hover.

---

## Screenshots

| Section | Preview |
|---|---|
| Code Intel | _Upload screenshot here_ |
| Research | _Upload screenshot here_ |
| Focus Music | _Upload screenshot here_ |
| Settings | _Upload screenshot here_ |

---

## Live Demo

🔗 [Deploy link — add after deployment]

---

## Roadmap

- [ ] Light theme support
- [ ] PDF preview split view in Code Intel
- [ ] Message history persistence (IndexedDB)
- [ ] Keyboard shortcuts (⌘K command palette)
- [ ] Export conversations as Markdown

---

## License

MIT — built as part of the AI Engineering Roadmap, Week 4.
