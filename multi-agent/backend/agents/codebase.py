"""Codebase agent — answers questions about the user's Angular project.

Uses the MCP filesystem tools (``list_directory``, ``read_file``,
``directory_tree``, ``search_files``) exposed by
``@modelcontextprotocol/server-filesystem``.
"""

from __future__ import annotations

from langgraph.graph.state import CompiledStateGraph

from agents.graph import build_graph
from tools.filesystem import get_filesystem_tools

_PROMPT_TEMPLATE = (
    "You are a codebase expert for Angular projects. "
    "Always use full absolute paths when calling filesystem tools. "
    "Root directory is {project_path}. "
    "When the user asks about a file, prefer to read it before answering. "
    "When asked about structure, call directory_tree first. "
    "Be concise — quote short snippets, never dump entire files."
)


def build_codebase_agent(project_path: str) -> CompiledStateGraph:
    """Construct the codebase sub-agent for a given project root."""
    prompt = _PROMPT_TEMPLATE.format(project_path=project_path)
    return build_graph(
        system_prompt=prompt,
        tools=get_filesystem_tools(),
        name="codebase_agent",
    )
