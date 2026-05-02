"""Orchestrator agent — routes user queries to the right specialist.

The orchestrator is itself a ReAct agent. The two specialist agents
(codebase_agent and search_agent) are exposed to it as *tools*, so the
LLM picks one (or both) per turn. The tool wrappers run the sub-agent
graph and return its final answer as the tool result.

Each tool call carries a metadata flag so the SSE endpoint can surface
which agent produced the response on the frontend (the "badge" in the
UI requirements).
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict

from langchain_core.messages import HumanMessage
from langchain_core.tools import StructuredTool
from langgraph.graph.state import CompiledStateGraph

from agents.codebase import build_codebase_agent
from agents.graph import build_graph
from agents.search import build_search_agent

_ORCHESTRATOR_PROMPT = (
    "You are Folio, an AI workspace for Angular developers.\n"
    "Routing rules:\n"
    "• ANY mention of the user's project, files, folders, configs "
    "(tsconfig, package.json, angular.json), components, services, or "
    "phrases like 'my project / my code / show me / read / list / "
    "details of <file>' → ALWAYS call codebase_agent.\n"
    "• Generic 'how do I…', 'what is…', tutorials, library "
    "comparisons, or external docs → call search_agent.\n"
    "• Never answer from your own knowledge for project-specific "
    "questions. When in doubt, prefer codebase_agent.\n"
    "Pass the user's full original question to the chosen sub-agent."
)


def _wrap_subagent_as_tool(
    *,
    name: str,
    description: str,
    sub_agent: CompiledStateGraph,
) -> StructuredTool:
    """Expose a compiled sub-agent graph as a callable tool."""

    async def _run(query: str) -> str:
        # Each sub-agent invocation gets its own ephemeral thread so it
        # doesn't pollute the orchestrator's checkpointed history. The
        # orchestrator passes the user-facing thread_id; sub-agent state
        # is fresh per delegation.
        config: Dict[str, Any] = {
            "configurable": {"thread_id": f"sub-{name}-{id(query)}"}
        }
        result = await sub_agent.ainvoke(
            {"messages": [HumanMessage(content=query)]},
            config=config,
        )
        # ``messages`` ends with the AI message that has the final answer.
        messages = result.get("messages", [])
        if not messages:
            return ""
        return messages[-1].content if hasattr(messages[-1], "content") else str(messages[-1])

    def _sync_run(query: str) -> str:  # pragma: no cover — async path is primary
        return asyncio.run(_run(query))

    return StructuredTool.from_function(
        coroutine=_run,
        func=_sync_run,
        name=name,
        description=description,
    )


def build_orchestrator(project_path: str) -> CompiledStateGraph:
    """Build the top-level orchestrator agent.

    Args:
        project_path: Absolute path the codebase agent will be scoped to.
    """
    codebase_agent = build_codebase_agent(project_path)
    search_agent = build_search_agent()

    tools = [
        _wrap_subagent_as_tool(
            name="codebase_agent",
            description=(
                "Use for any question that requires reading, listing, "
                "or searching files in the user's Angular project. "
                "Input: a natural-language question."
            ),
            sub_agent=codebase_agent,
        ),
        _wrap_subagent_as_tool(
            name="search_agent",
            description=(
                "Use for tutorials, library comparisons, documentation "
                "lookups, and 'how do I do X in Angular' questions. "
                "Input: a natural-language search query."
            ),
            sub_agent=search_agent,
        ),
    ]

    return build_graph(
        system_prompt=_ORCHESTRATOR_PROMPT,
        tools=tools,
        name="orchestrator",
    )
