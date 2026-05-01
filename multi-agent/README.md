# Folio — Agentic Research Assistant

Folio is a multi-agent research assistant for Angular developers. An
**orchestrator** LLM routes each question to one of two specialists:

- **codebase_agent** — talks to your project filesystem through MCP
  (`@modelcontextprotocol/server-filesystem`) using `list_directory`,
  `read_file`, `directory_tree`, and `search_files`.
- **search_agent** — searches the web via Tavily for tutorials, docs,
  and articles.

Built as Week 3 of a 4-week AI engineering roadmap.

**Stack.** Backend: Python 3.13 · FastAPI · LangGraph · LangChain ·
ChatGroq (`meta-llama/llama-4-scout-17b-16e-instruct`) · MCP filesystem
server · Tavily. Frontend: Angular 17+ standalone components · Angular
Signals · TailwindCSS v3. Streaming uses Server-Sent Events end-to-end.

**Live demo:** _(add URL after deploying to Render / Vercel)_

---

## Repository layout

```
folio/
├── backend/
│   ├── main.py                # FastAPI app + SSE endpoint
│   ├── agents/
│   │   ├── graph.py           # reusable build_graph factory
│   │   ├── codebase.py        # codebase sub-agent
│   │   ├── search.py          # search sub-agent
│   │   └── orchestrator.py    # top-level orchestrator
│   ├── tools/
│   │   ├── filesystem.py      # MCP client (init once, reused)
│   │   └── web_search.py      # Tavily tool
│   ├── tests/                 # pytest suite (no API keys needed)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/app/
│   │   ├── app.component.ts
│   │   ├── chat/              # standalone chat component (signals + OnPush)
│   │   └── services/agent.service.ts   # SSE consumer (fetch + ReadableStream)
│   ├── angular.json
│   ├── tailwind.config.js
│   └── package.json
├── render.yaml                # Render web-service config
└── .github/workflows/ci.yml   # backend lint + tests on every push
```

## Setup

### 1. Backend

```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# fill in GROQ_API_KEY, TAVILY_API_KEY, PROJECT_PATH
```

You also need Node.js (≥20) on your machine — the MCP filesystem server is
launched via `npx @modelcontextprotocol/server-filesystem`. The Dockerfile
installs it for you in the container.

Run the server:

```bash
uvicorn main:app --reload
```

The first request takes a beat while `npx` downloads the MCP package; the
process is then reused for the rest of the session.

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Open http://localhost:4200.

## Environment variables

| Name             | Where     | Description                                                           |
| ---------------- | --------- | --------------------------------------------------------------------- |
| `GROQ_API_KEY`   | backend   | Get one at <https://console.groq.com>.                                |
| `TAVILY_API_KEY` | backend   | Get one at <https://tavily.com>.                                      |
| `PROJECT_PATH`   | backend   | Absolute path to the Angular project the codebase agent may read.     |
| `CORS_ORIGINS`   | backend   | Comma-separated origins. Defaults to `http://localhost:4200`.         |
| `LOG_LEVEL`      | backend   | Optional. `INFO` (default), `DEBUG`, etc.                             |

## API

### `POST /research`

```json
{
  "query": "What components live in src/app?",
  "project_path": "/Users/you/Desktop/my-app",
  "thread_id": "session-1234"
}
```

Returns `text/event-stream`. Each event:

```
data: {"token": "Hello ", "done": false}
data: {"token": "", "done": false, "agent": "codebase_agent"}
data: {"token": "world", "done": false}
data: {"token": "", "done": true}
```

`thread_id` is optional — pass the same value across turns to keep
conversation history (LangGraph `MemorySaver` checkpointing).

### `GET /health`

```json
{ "status": "ok" }
```

## Tests

```bash
cd backend
pytest
```

Tests stub out the LLM and MCP client, so they run without API keys.
GitHub Actions runs them on every push (`.github/workflows/ci.yml`).

## Deployment

A `render.yaml` is provided for one-click Render deployment of the
backend. After deploying:

1. Set `GROQ_API_KEY`, `TAVILY_API_KEY`, and `CORS_ORIGINS` in the Render
   dashboard.
2. Mount or bundle your Angular project into the container at the path
   you set as `PROJECT_PATH`.

The frontend is a static Angular build — deploy `dist/folio-frontend/` to
Vercel, Netlify, Cloudflare Pages, or any static host. Update the
`baseUrl` in `agent.service.ts` to point at your backend URL.

## Notes

- All agents are async; the MCP client is built once at app startup and
  reused.
- Streaming uses `astream_events(version='v2')` over the compiled
  LangGraph app and forwards `on_chat_model_stream` chunks as SSE.
- The frontend uses `fetch` + `ReadableStream` (not `EventSource`) so it
  can `POST` a JSON body and cancel mid-stream via `AbortController`.
- The chat component buffers tokens and flushes via `requestAnimationFrame`
  to avoid overwhelming the UI under fast streams.
