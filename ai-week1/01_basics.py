from dotenv import load_dotenv
import os

load_dotenv()

# --- 1. Dict (like JS object) ---
message = {"role": "user", "content": "Hello from Akshar!"}
print(message["role"])        # bracket notation
print(message.get("content")) # safe access like ?.

# --- 2. List of dicts (this IS a conversation history) ---
messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is RAG?"},
]

for msg in messages:
    print(f"{msg['role']}: {msg['content']}")

# --- 3. Function with default args ---
def build_prompt(topic, tone="simple"):
    return f"Explain {topic} in a {tone} way."

print(build_prompt("transformers"))
print(build_prompt("RAG", tone="technical"))

# --- 4. Reading a file ---
with open("test.txt", "w") as f:
    f.write("This is my first AI project file.")

with open("test.txt", "r") as f:
    content = f.read()
    print(content)