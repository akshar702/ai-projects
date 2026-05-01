"""FastAPI entry point for Folio.

Endpoints:
    POST /research  — SSE stream of orchestrator output
    GET  /health    — liveness probe

Design notes:
    * The MCP filesystem client is initialised once in the FastAPI
      ``lifespan`` and reused across all requests.
    * The orchestrator graph is also built once at startup and cached.
    * Streaming uses ``astream_events(version='v2')`` and forwards every
      ``on_chat_model_stream`` chunk as an SSE ``data:`` line.
"""

from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

from agents.orchestrator import build_orchestrator
from tools.filesystem import init_mcp_client, shutdown_mcp_client

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("folio")


# --------------------------------------------------------------------- models

class ResearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
    project_path: Optional[str] = Field(
        default=None,
        description=(
            "Absolute path to the Angular project. Falls back to the "
            "PROJECT_PATH environment variable if omitted."
        ),
    )
    thread_id: Optional[str] = Field(
        default=None,
        description=(
            "Conversation thread id. Pass the same value across turns to "
            "keep history; omit for a fresh conversation."
        ),
    )


# --------------------------------------------------------------- app lifespan

# Module-level cache so the orchestrator graph is built only once.
_orchestrator = None
_project_path: str = ""


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: D401 — FastAPI hook
    """Initialise expensive singletons at startup, tear down at shutdown."""
    global _orchestrator, _project_path

    _project_path = os.getenv("PROJECT_PATH", "").strip()
    if not _project_path:
        raise RuntimeError(
            "PROJECT_PATH env var is required (absolute path to the "
            "Angular project Folio should reason about)."
        )

    await init_mcp_client(_project_path)
    _orchestrator = build_orchestrator(_project_path)
    logger.info("Folio ready — project_path=%s", _project_path)

    try:
        yield
    finally:
        await shutdown_mcp_client()


app = FastAPI(title="Folio", version="0.1.0", lifespan=lifespan)

# CORS — Angular dev server runs on :4200 by default. Override via env var
# in production (Render, Vercel, etc).
_cors_origins = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:4200").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ----------------------------------------------------------------- endpoints

@app.get("/health")
async def health() -> dict:
    """Liveness probe."""
    return {"status": "ok"}


def _sse_event(payload: dict) -> str:
    """Format a payload as a single SSE ``data:`` line."""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def _stream_research(req: ResearchRequest) -> AsyncIterator[str]:
    """Yield SSE events for one /research call.

    We forward LLM token chunks (``on_chat_model_stream``) as
    ``{"token": "...", "done": false}``. When a tool call starts we emit
    a sentinel event so the frontend can render the "agent badge"
    (codebase / search). The final event is always
    ``{"token": "", "done": true}``.
    """
    if _orchestrator is None:
        # Should be impossible: lifespan runs before requests are served.
        raise HTTPException(status_code=503, detail="Orchestrator not ready")

    config = {
        "configurable": {"thread_id": req.thread_id or "default"},
        # Limit recursion so a confused agent can't burn through tokens
        # in a tool-loop forever.
        "recursion_limit": 25,
    }

    inputs = {"messages": [HumanMessage(content=req.query)]}

    try:
        async for event in _orchestrator.astream_events(
            inputs, config=config, version="v2"
        ):
            kind = event.get("event")

            if kind == "on_chat_model_stream":
                chunk = event["data"].get("chunk")
                token = getattr(chunk, "content", "") if chunk else ""
                if token:
                    yield _sse_event({"token": token, "done": False})

            elif kind == "on_tool_start":
                # Surface which sub-agent is being invoked so the UI can
                # show a badge ("codebase" / "search").
                tool_name = event.get("name") or ""
                if tool_name in {"codebase_agent", "search_agent"}:
                    yield _sse_event(
                        {"token": "", "done": False, "agent": tool_name}
                    )

    except Exception as exc:  # pragma: no cover — surface real errors
        logger.exception("Streaming failure")
        yield _sse_event({"token": "", "done": True, "error": str(exc)})
        return

    yield _sse_event({"token": "", "done": True})


@app.post("/research")
async def research(req: ResearchRequest) -> StreamingResponse:
    """Stream the orchestrator's response as Server-Sent Events."""
    # Allow callers to override PROJECT_PATH per-request only if it matches
    # what the MCP client was bound to at startup — switching directories
    # mid-process would require restarting the npx subprocess.
    if req.project_path and req.project_path != _project_path:
        raise HTTPException(
            status_code=400,
            detail=(
                f"project_path mismatch: server is bound to {_project_path!r}. "
                "Restart the backend with PROJECT_PATH set to the new path."
            ),
        )

    return StreamingResponse(
        _stream_research(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering for SSE
            "Connection": "keep-alive",
        },
    )
