from langchain_groq import ChatGroq
from langchain_tavily import TavilySearch
from langgraph.prebuilt import create_react_agent
from dotenv import load_dotenv
import warnings
import os

warnings.filterwarnings("ignore")
load_dotenv()

# LLM
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0
)

# Tools
search_tool = TavilySearch(
    max_results=3
)

tools = [search_tool]

# System prompt
system_prompt = """You are a helpful research assistant.
When using search tools:
- Keep queries simple and direct
- Do not add date filters or time ranges
- Just search for the topic directly
"""

# Agent
agent = create_react_agent(llm, tools, prompt=system_prompt)

# ─────────────────────────────────────────
# PRETTY PRINT
# ─────────────────────────────────────────
def print_agent_response(result):
    print("\n" + "="*60)
    print("AGENT TRACE")
    print("="*60)
    
    for message in result["messages"]:
        msg_type = message.type.upper()
        
        if msg_type == "HUMAN":
            print(f"\n👤 USER:")
            print(f"   {message.content}")
            
        elif msg_type == "AI":
            if message.content:
                print(f"\n🤖 AGENT:")
                print(f"   {message.content}")
            if hasattr(message, 'tool_calls') and message.tool_calls:
                for tc in message.tool_calls:
                    print(f"\n🔧 TOOL CALL: {tc['name']}")
                    print(f"   Input: {tc['args']}")
                    
        elif msg_type == "TOOL":
            print(f"\n📊 TOOL RESULT:")
            # Truncate long results
            content = str(message.content)
            print(f"   {content[:300]}..." if len(content) > 300 else f"   {content}")
    
    print("\n" + "="*60)
    print("✅ FINAL ANSWER:")
    print("="*60)
    # Last AI message is final answer
    for message in reversed(result["messages"]):
        if message.type == "ai" and message.content:
            print(message.content)
            break

# Run
if __name__ == "__main__":
    question = "What is LangGraph and what are its latest features?"
    
    print(f"\n🚀 Running agent for: {question}")
    
    result = agent.invoke({
        "messages": [{"role": "user", "content": question}]
    })
    
    print_agent_response(result)