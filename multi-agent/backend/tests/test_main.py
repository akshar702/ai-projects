"""End-to-end-ish tests for the FastAPI surface.

The real LLM/MCP startup is patched out so the suite runs without API
keys. We're checking the HTTP contract (status codes, SSE encoding,
CORS headers, error paths) rather than agent quality.
"""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch, fake_orchestrator):
    """Build a TestClient with MCP + orchestrator construction stubbed."""

    async def _noop_init(*_args, **_kwargs):
        return None

    async def _noop_shutdown():
        return None

    # Patch BEFORE importing main so its lifespan picks up the stubs.
    monkeypatch.setattr("tools.filesystem.init_mcp_client", _noop_init)
    monkeypatch.setattr("tools.filesystem.shutdown_mcp_client", _noop_shutdown)
    monkeypatch.setattr(
        "agents.orchestrator.build_orchestrator",
        lambda _project_path: fake_orchestrator,
    )

    # Re-import after patching so the patched names are bound.
    import importlib
    import main as main_module
    importlib.reload(main_module)

    with TestClient(main_module.app) as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_research_streams_sse(client):
    with client.stream(
        "POST",
        "/research",
        json={"query": "where is app.component?"},
    ) as r:
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/event-stream")
        body = "".join(r.iter_text())

    # We expect one badge event, two token events, and one done event.
    events = [
        json.loads(line[len("data: "):])
        for line in body.splitlines()
        if line.startswith("data: ")
    ]

    assert events[0] == {"token": "", "done": False, "agent": "codebase_agent"}
    assert events[1]["token"] == "Hello "
    assert events[2]["token"] == "world"
    assert events[-1] == {"token": "", "done": True}


def test_research_rejects_query_too_long(client):
    r = client.post("/research", json={"query": "x" * 5000})
    assert r.status_code == 422


def test_research_rejects_mismatched_project_path(client):
    r = client.post(
        "/research",
        json={"query": "hi", "project_path": "/somewhere/else"},
    )
    assert r.status_code == 400
    assert "project_path" in r.json()["detail"]
