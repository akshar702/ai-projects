"""MCP filesystem client.

The MCP server is the upstream `@modelcontextprotocol/server-filesystem`
package, launched via `npx` over stdio. We initialise the
`MultiServerMCPClient` once at application startup (see ``main.lifespan``)
and reuse it across requests — re-spawning the npx process per call adds
hundreds of ms of latency and exhausts file descriptors quickly.

Public surface:
    * ``init_mcp_client(project_path)`` — build the client (call once)
    * ``get_filesystem_tools()`` — return cached LangChain tools
    * ``shutdown_mcp_client()`` — clean shutdown (called from lifespan)
"""

from __future__ import annotations

import inspect
import logging
from typing import List, Optional

from langchain_core.tools import BaseTool
from langchain_mcp_adapters.client import MultiServerMCPClient

logger = logging.getLogger(__name__)

# Module-level singletons — populated by init_mcp_client().
_client: Optional[MultiServerMCPClient] = None
_tools: List[BaseTool] = []


async def init_mcp_client(project_path: str) -> None:
    """Initialise the MCP filesystem client and cache its tools.

    Safe to call multiple times — subsequent calls are no-ops once the
    client has been built. ``project_path`` becomes the only directory
    the MCP server is allowed to read from.
    """
    global _client, _tools

    if _client is not None:
        logger.debug("MCP client already initialised; skipping re-init")
        return

    logger.info("Initialising MCP filesystem client at %s", project_path)
    _client = MultiServerMCPClient(
        {
            "filesystem": {
                "command": "npx",
                "args": [
                    "-y",
                    "@modelcontextprotocol/server-filesystem",
                    project_path,
                ],
                "transport": "stdio",
            }
        }
    )

    # Pull tools once and cache. The adapter wraps each MCP tool in a
    # LangChain BaseTool so it slots straight into ``create_react_agent``.
    result = _client.get_tools()
    _tools = await result if inspect.isawaitable(result) else result
    logger.info("Loaded %d MCP filesystem tools: %s",
                len(_tools), [t.name for t in _tools])


def get_filesystem_tools() -> List[BaseTool]:
    """Return the cached MCP filesystem tools.

    Raises ``RuntimeError`` if ``init_mcp_client`` has not been called.
    """
    if _client is None:
        raise RuntimeError(
            "MCP client not initialised. Call init_mcp_client() at startup."
        )
    return _tools


async def shutdown_mcp_client() -> None:
    """Tear down the MCP client. Idempotent."""
    global _client, _tools
    if _client is None:
        return
    logger.info("Shutting down MCP filesystem client")
    # MultiServerMCPClient manages its own subprocess lifecycle internally;
    # dropping the reference is sufficient for the npx process to exit when
    # the parent process terminates. If the adapter exposes an explicit
    # close method in a newer release, prefer that here.
    close = getattr(_client, "aclose", None) or getattr(_client, "close", None)
    if close is not None:
        try:
            result = close()
            if hasattr(result, "__await__"):
                await result
        except Exception:  # pragma: no cover — best effort shutdown
            logger.exception("Error while closing MCP client")
    _client = None
    _tools = []
