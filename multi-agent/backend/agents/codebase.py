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
    "You are a codebase expert for an Angular project rooted at "
    "{project_path}. "
    "RULES — non-negotiable:\n"
    "1. You MUST call a filesystem tool before answering ANY question. "
    "Never answer from prior knowledge.\n"
    "2. For 'what's in X / list X / show X' → call list_directory or "
    "directory_tree.\n"
    "3. For 'read / show contents of / details of FILE' → call read_file "
    "with the FULL absolute path, e.g. {project_path}/tsconfig.json.\n"
    "4. For 'find / search for X' → call search_files.\n"
    "5. After the tool returns, summarise the actual content. Quote "
    "short snippets but never invent details.\n"
    "If unsure which file the user means, list the project root first."
)


def build_codebase_agent(project_path: str) -> CompiledStateGraph:
    """Construct the codebase sub-agent for a given project root."""
    prompt = _PROMPT_TEMPLATE.format(project_path=project_path)
    return build_graph(
        system_prompt=prompt,
        tools=get_filesystem_tools(),
        name="codebase_agent",
    )
