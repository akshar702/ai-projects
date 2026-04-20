from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ─────────────────────────────────────────
# 1. BASIC STREAMING
# ─────────────────────────────────────────
print("=" * 50)
print("1. BASIC STREAMING")
print("=" * 50)

stream = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[
        {"role": "user", "content": "Explain how RAG works in 100 words."}
    ],
    stream=True  # ← this one parameter enables streaming
)

for chunk in stream:
    token = chunk.choices[0].delta.content
    if token:
        print(token, end="", flush=True)  # print without newline, immediately

print("\n")

# ─────────────────────────────────────────
# 2. STREAMING WITH TOKEN COUNTER
# ─────────────────────────────────────────
print("=" * 50)
print("2. STREAMING WITH TOKEN COUNTER")
print("=" * 50)

stream = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[
        {"role": "user", "content": "Write a short poem about coding."}
    ],
    stream=True
)

token_count = 0
full_response = ""

for chunk in stream:
    token = chunk.choices[0].delta.content
    if token:
        print(token, end="", flush=True)
        full_response += token
        token_count += 1

print(f"\n\nTokens streamed: {token_count}")
print(f"Total characters: {len(full_response)}")

# ─────────────────────────────────────────
# 3. STREAMING CHATBOT
# ─────────────────────────────────────────
print("=" * 50)
print("3. STREAMING CHATBOT")
print("=" * 50)

messages = [
    {"role": "system", "content": "You are a helpful assistant."}
]

print("Streaming chat! Type 'exit' to quit.\n")

while True:
    user_input = input("You: ")
    
    if user_input.lower() == "exit":
        print("Bye!")
        break
    
    messages.append({"role": "user", "content": user_input})
    
    print("AI: ", end="", flush=True)
    
    stream = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        stream=True
    )
    
    full_reply = ""
    for chunk in stream:
        token = chunk.choices[0].delta.content
        if token:
            print(token, end="", flush=True)
            full_reply += token
    
    print("\n")
    messages.append({"role": "assistant", "content": full_reply})