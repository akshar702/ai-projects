from groq import Groq
from dotenv import load_dotenv
import os
import json

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ─────────────────────────────────────────
# ACTUAL FUNCTIONS (your real code)
# ─────────────────────────────────────────
def get_weather(city: str) -> str:
    # In real app this would call a weather API
    weather_data = {
        "jaipur": "38°C, sunny and hot",
        "delhi": "35°C, hazy",
        "mumbai": "32°C, humid",
        "bangalore": "26°C, pleasant"
    }
    return weather_data.get(city.lower(), f"Weather data not available for {city}")

def get_flight_status(flight_number: str) -> str:
    # In real app this would call Delta's API
    flights = {
        "DL123": "On time, departing at 14:30",
        "DL456": "Delayed by 2 hours",
        "DL789": "Cancelled"
    }
    return flights.get(flight_number.upper(), f"Flight {flight_number} not found")

# ─────────────────────────────────────────
# TOOL DEFINITIONS (what LLM sees)
# ─────────────────────────────────────────
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a city",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "City name e.g. Jaipur, Delhi"
                    }
                },
                "required": ["city"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_flight_status",
            "description": "Get status of a Delta Airlines flight",
            "parameters": {
                "type": "object",
                "properties": {
                    "flight_number": {
                        "type": "string",
                        "description": "Flight number e.g. DL123"
                    }
                },
                "required": ["flight_number"]
            }
        }
    }
]

# ─────────────────────────────────────────
# FUNCTION DISPATCHER
# ─────────────────────────────────────────
def call_function(name, arguments):
    if name == "get_weather":
        return get_weather(arguments["city"])
    elif name == "get_flight_status":
        return get_flight_status(arguments["flight_number"])
    return "Function not found"

# ─────────────────────────────────────────
# MAIN AGENT LOOP
# ─────────────────────────────────────────
def run_agent(user_input):
    print(f"\nUser: {user_input}")
    
    messages = [
        {"role": "system", "content": "You are a helpful Aksha Airlines assistant."},
        {"role": "user", "content": user_input}
    ]
    
    # Step 1 — First LLM call
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        tools=tools,
        temperature=0.0

    )
    # Step 2 — Did LLM want to call a function?
    while response.choices[0].finish_reason == "tool_calls":
        tool_calls = response.choices[0].message.tool_calls
        print(response.choices[0].message, 'decision message')
        # Append LLM's tool call decision to history
        messages.append(response.choices[0].message)
        
        # Step 3 — Execute each tool call
        for tool_call in tool_calls:
            name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)
            
            print(f"→ Calling: {name}({arguments})")
            result = call_function(name, arguments)
            print(f"→ Result: {result}")
            
            # Step 4 — Append tool result to history
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result
            })
        
        # Step 5 — Call LLM again with tool results
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            tools=tools,
            temperature=0.0
        )
    
    # Step 6 — Final answer
        print('finishreason', response.choices[0].finish_reason)

    print(f"AI: {response.choices[0].message.content}")

# ─────────────────────────────────────────
# TEST IT
# ─────────────────────────────────────────
run_agent("What's the weather in Jaipur?")
run_agent("Is flight DL456 on time?")
run_agent("What's the weather in Delhi and also check flight DL123 status")