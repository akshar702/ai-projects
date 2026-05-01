"""Search agent — finds tutorials, articles, and documentation via Tavily."""

from __future__ import annotations

from langgraph.graph.state import CompiledStateGraph

from agents.graph import build_graph
from tools.web_search import get_web_search_tools

_PROMPT = (
    "You are a research expert. Find the best Angular and JavaScript "
    "learning resources. Prefer official docs (angular.dev, MDN), "
    "well-known blogs, and recent material. When you cite a result, "
    "include the source URL."
)


def build_search_agent() -> CompiledStateGraph:
    """Construct the web-search sub-agent."""
    return build_graph(
        system_prompt=_PROMPT,
        tools=get_web_search_tools(),
        name="search_agent",
    )
