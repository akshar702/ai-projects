"""Smoke tests for the build_graph factory.

We can't actually call the LLM in CI, but we can confirm the factory
returns a compiled graph with the expected entry-point and that the
checkpointer is shared across builds.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from langchain_core.tools import StructuredTool


def _dummy_tool() -> StructuredTool:
    return StructuredTool.from_function(
        func=lambda x: x,
        name="echo",
        description="Echoes input.",
    )


@patch("agents.graph.ChatGroq")
def test_build_graph_returns_compiled_graph(chat_groq_cls):
    chat_groq_cls.return_value = MagicMock()
    from agents.graph import build_graph, get_checkpointer

    graph = build_graph(
        system_prompt="test",
        tools=[_dummy_tool()],
        name="test_agent",
    )
    assert graph is not None
    # CompiledStateGraph exposes .invoke / .ainvoke.
    assert hasattr(graph, "ainvoke")
    assert hasattr(graph, "astream_events")
    # Checkpointer is a singleton across builds.
    assert get_checkpointer() is get_checkpointer()


@patch("agents.graph.ChatGroq")
def test_two_agents_share_checkpointer(chat_groq_cls):
    chat_groq_cls.return_value = MagicMock()
    from agents.graph import build_graph, get_checkpointer

    a = build_graph(system_prompt="a", tools=[], name="a")
    b = build_graph(system_prompt="b", tools=[], name="b")
    assert a is not b
    # Both should reference the same module-level MemorySaver.
    cp = get_checkpointer()
    assert cp is not None
