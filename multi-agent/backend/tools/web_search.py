"""Tavily-backed web search tool for the search agent."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from langchain_core.tools import BaseTool
from langchain_tavily import TavilySearch


@lru_cache(maxsize=1)
def _build_tool() -> BaseTool:
    """Construct a single TavilySearch instance.

    LRU-cached so the underlying HTTP client is reused across requests.
    The Tavily SDK reads ``TAVILY_API_KEY`` from the environment.
    """
    if not os.getenv("TAVILY_API_KEY"):
        raise RuntimeError(
            "TAVILY_API_KEY is not set. Add it to your .env file."
        )
    # max_results=5 keeps the context window tight while still giving the
    # agent enough breadth to pick a good source.
    return TavilySearch(max_results=5, topic="general")


def get_web_search_tools() -> List[BaseTool]:
    """Return the Tavily search tool wrapped in a list for ReAct agents."""
    return [_build_tool()]
