from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END, add_messages
from langgraph.prebuilt import ToolNode
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_groq import ChatGroq
from dotenv import load_dotenv
load_dotenv()
# 1 — Define State
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

# 2 — Define Tools
search_tool = TavilySearchResults(max_results=3)
tools = [search_tool]

# 3 — LLM with tools bound
llm = ChatGroq(model="llama-3.3-70b-versatile")
llm_with_tools = llm.bind_tools(tools)

# 4 — Nodes
def call_llm(state: AgentState):
    response = llm_with_tools.invoke(state["messages"])
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

# 7 — Run it
result = app.invoke({
    "messages": [("user", "Find me the best resources to learn Angular signals")]
})

print(result["messages"][-1].content)