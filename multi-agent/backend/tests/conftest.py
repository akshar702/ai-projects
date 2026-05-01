"""Shared pytest configuration.

We don't have real API keys in CI, so the tests stub out the orchestrator
and MCP startup. The point is to verify the wiring (CORS, SSE format,
graph construction signature) — not to make real LLM calls.
"""

from __future__ import annotations

import os
from typing import AsyncIterator
from unittest.mock import AsyncMock, MagicMock

import pytest


# Make the backend package importable when running ``pytest`` from the
# backend/ directory.
os.environ.setdefault("GROQ_API_KEY", "test-key")
os.environ.setdefault("TAVILY_API_KEY", "test-key")
os.environ.setdefault("PROJECT_PATH", os.getcwd())


@pytest.fixture
def fake_orchestrator() -> MagicMock:
    """A stand-in for the compiled orchestrator graph.

    ``astream_events`` yields a tiny scripted sequence so we can assert
    on the SSE encoding without touching a real LLM.
    """

    async def fake_events(*_args, **_kwargs) -> AsyncIterator[dict]:
        yield {
            "event": "on_tool_start",
            "name": "codebase_agent",
        }
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": MagicMock(content="Hello ")},
        }
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": MagicMock(content="world")},
        }

    orch = MagicMock()
    orch.astream_events = fake_events
    orch.ainvoke = AsyncMock(return_value={"messages": [MagicMock(content="ok")]})
    return orch
