import asyncio
from dotenv import load_dotenv
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END, add_messages
from langgraph.prebuilt import ToolNode
from langchain_groq import ChatGroq
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage
from langchain_tavily import TavilySearch

load_dotenv()

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

def build_graph(llm, tools, system_prompt):
    """Reusable function to build any agent graph"""
    llm_with_tools = llm.bind_tools(tools)
    tool_node = ToolNode(tools)

    async def call_llm(state: AgentState):
        messages = [SystemMessage(content=system_prompt)] + state["messages"]
        response = await llm_with_tools.ainvoke(messages)
        return {"messages": [response]}

    def should_continue(state: AgentState):
        if state["messages"][-1].tool_calls:
            return "run_tools"
        return END

    graph = StateGraph(AgentState)
    graph.add_node("llm", call_llm)
    graph.add_node("tools", tool_node)
    graph.set_entry_point("llm")
    graph.add_conditional_edges("llm", should_continue, {
        "run_tools": "tools",
        END: END
    })
    graph.add_edge("tools", "llm")
    return graph.compile()

async def run_multi_agent():
    # --- MCP Setup ---
    client = MultiServerMCPClient({
        "filesystem": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem",
            "/Users/akshar/Desktop/AI-Projects"],
            "transport": "stdio"
        }
    })
    mcp_tools = await client.get_tools()
    ALLOWED_TOOLS = {"list_directory", "read_file", "directory_tree", "search_files"}
    filesystem_tools = [t for t in mcp_tools if t.name in ALLOWED_TOOLS]

    # --- Search Tool ---
    @tool
    def web_search(query: str) -> str:
        """Search the web for tutorials, articles and resources."""
        tavily = TavilySearch(max_results=3)
        return str(tavily.invoke(query))

    llm = ChatGroq(model="meta-llama/llama-4-scout-17b-16e-instruct")

    # --- Build Specialized Agents ---
    codebase_app = build_graph(
    llm,
    filesystem_tools,
    """You are a codebase expert. Help developers understand their Angular project files and code.
    The root directory is /Users/akshar/Desktop/AI-Projects.
    Always use full absolute paths starting with /Users/akshar/Desktop/AI-Projects when calling filesystem tools."""
)

    search_app = build_graph(
        llm,
        [web_search],
        "You are a research expert. Find the best Angular and JavaScript learning resources."
    )

    # --- Wrap agents as orchestrator tools ---
    @tool
    async def codebase_agent(query: str) -> str:
        """Use for questions about the user's project files, 
        Angular code, components, services or codebase structure."""
        result = await codebase_app.ainvoke({
            "messages": [("user", query)]
        })
        return result["messages"][-1].content

    @tool
    async def search_agent(query: str) -> str:
        """Use for finding tutorials, articles, documentation 
        or any learning resources about Angular or JavaScript."""
        result = await search_app.ainvoke({
            "messages": [("user", query)]
        })
        return result["messages"][-1].content

    # --- Build Orchestrator ---
    orchestrator_app = build_graph(
        llm,
        [codebase_agent, search_agent],
        """You are Folio, an AI workspace for Angular developers.
        You have two agents available:
        - codebase_agent: for anything about the user's code and project files
        - search_agent: for finding learning resources and tutorials
        Delegate to the right agent based on the user's question."""
    )

    # --- Test it ---
    print("\n--- Test 1: Should use codebase_agent ---")
    result1 = await orchestrator_app.ainvoke({
    "messages": [("user", "What files are in /Users/akshar/Desktop/AI-Projects/ai-week3?")]
    })
    print(result1["messages"][-1].content)

    print("\n--- Test 2: Should use search_agent ---")
    result2 = await orchestrator_app.ainvoke({
        "messages": [("user", "Find me the best Angular signals tutorials")]
    })
    print(result2["messages"][-1].content)

asyncio.run(run_multi_agent())