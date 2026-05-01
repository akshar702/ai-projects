import asyncio
import os
from dotenv import load_dotenv
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END, add_messages
from langgraph.prebuilt import ToolNode
from langchain_groq import ChatGroq
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage

load_dotenv()

SYSTEM_PROMPT = SystemMessage(content="""
You are Folio, an AI assistant specifically built for Angular developers.

Your job is to help developers with:
- Understanding Angular codebases (components, services, NgRx, RxJS)
- Finding Angular and JavaScript learning resources
- Reviewing and explaining code files from their project

You have access to two types of tools:
1. Filesystem tools (list_directory, read_file, directory_tree, search_files) — use these when user asks about their code or project files
2. web_search — use this when user asks for tutorials, articles, or latest information

Always be specific to Angular/frontend context.
""")

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

@tool
def web_search(query: str) -> str:
    """Search the web for current information, tutorials, articles and resources about any topic."""
    tavily = TavilySearchResults(max_results=3)
    results = tavily.invoke(query)
    return str(results)

# Only keep essential filesystem tools
ALLOWED_TOOLS = {"list_directory", "read_file", "directory_tree", "search_files"}

async def run_agent():
    # 1 — Connect to MCP server
    client = MultiServerMCPClient({
        "filesystem": {
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-filesystem",
                "/Users/akshar/Desktop/AI-Projects"
            ],
            "transport": "stdio"
        }
    })

    # 2 — Filter MCP tools + add web search
    mcp_tools = await client.get_tools()
    filtered_mcp_tools = [t for t in mcp_tools if t.name in ALLOWED_TOOLS]
    tools = filtered_mcp_tools + [web_search]
    print(f"Available tools: {[t.name for t in tools]}")

    # 3 — LLM with filtered tools
    llm = ChatGroq(model="meta-llama/llama-4-scout-17b-16e-instruct")
    llm_with_tools = llm.bind_tools(tools)

    # 4 — Nodes (async)
    async def call_llm(state: AgentState):
        messages = [SYSTEM_PROMPT] + state["messages"]
        response = await llm_with_tools.ainvoke(messages)
        return {"messages": [response]}

    tool_node = ToolNode(tools)

    # 5 — Edge logic
    def should_continue(state: AgentState):
        last_message = state["messages"][-1]
        if last_message.tool_calls:
            return "run_tools"
        return END

    # 6 — Build graph
    graph = StateGraph(AgentState)
    graph.add_node("llm", call_llm)
    graph.add_node("tools", tool_node)
    graph.set_entry_point("llm")
    graph.add_conditional_edges("llm", should_continue, {
        "run_tools": "tools",
        END: END
    })
    graph.add_edge("tools", "llm")
    app = graph.compile()

    # 7 — Test filesystem tool
    print("\n--- Test 1: Filesystem ---")
    result1 = await app.ainvoke({
        "messages": [("user", "List all files and folders in /Users/akshar/Desktop/AI-Projects")]
    })
    print(result1["messages"][-1].content)

    # 8 — Test web search
    print("\n--- Test 2: Web Search ---")
    result2 = await app.ainvoke({
         "messages": [("user", "List and explain what is in /Users/akshar/Desktop/AI-Projects/ai-week3")]
    })
    print(result2["messages"][-1].content)

asyncio.run(run_agent())