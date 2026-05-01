"""Reusable LangGraph agent factory.

Every Folio agent (codebase, search, orchestrator) is a ReAct-style
agent built with the same primitives. ``build_graph`` centralises
that wiring so callers only have to supply (a) a system prompt and
(b) the tools that agent should be able to call.

The graph is compiled with a ``MemorySaver`` checkpointer so the
caller can pass a ``thread_id`` to persist conversation history
between turns of the same session.
"""

from __future__ import annotations

import os
from typing import List, Sequence

from langchain_core.tools import BaseTool
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import create_react_agent

# Single shared model — cheap to construct but we cache by attribute on the
# module so each agent doesn't pay the import + config cost.
_MODEL_NAME = "meta-llama/llama-4-scout-17b-16e-instruct"
_llm: ChatGroq | None = None


def _get_llm() -> ChatGroq:
    """Return a process-wide ChatGroq instance."""
    global _llm
    if _llm is None:
        if not os.getenv("GROQ_API_KEY"):
            raise RuntimeError(
                "GROQ_API_KEY is not set. Add it to your .env file."
            )
        _llm = ChatGroq(
            model=_MODEL_NAME,
            # Streaming must be on — main.py uses astream_events to forward
            # tokens to the SSE response.
            streaming=True,
            temperature=0.2,
        )
    return _llm


# One checkpointer per process — keyed by thread_id at invoke time.
_checkpointer = MemorySaver()


def build_graph(
    system_prompt: str,
    tools: Sequence[BaseTool] | List[BaseTool],
    *,
    name: str | None = None,
) -> CompiledStateGraph:
    """Build a ReAct agent graph with the supplied prompt and tools.

    Args:
        system_prompt: The agent's system message. For sub-agents this
            describes the role; for the orchestrator it describes the
            delegation rules.
        tools: LangChain tools the agent can call. May be empty.
        name: Optional graph name (helps when inspecting astream_events).

    Returns:
        A compiled ``StateGraph`` with ``MemorySaver`` checkpointing.
    """
    llm = _get_llm()
    agent = create_react_agent(
        model=llm,
        tools=list(tools),
        prompt=system_prompt,
        checkpointer=_checkpointer,
        name=name,
    )
    return agent


def get_checkpointer() -> MemorySaver:
    """Expose the shared checkpointer (useful for tests / introspection)."""
    return _checkpointer
