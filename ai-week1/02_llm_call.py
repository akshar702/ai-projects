from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# This list is the memory
messages = [
    {"role": "system", "content": "You are a helpful assistant."},
]

print("Chat started! Type 'exit' to quit.\n")

while True:
    user_input = input("You: ")
    
    if user_input.lower() == "exit":
        print("Bye!")
        break
    
    # Add user message to history
    messages.append({"role": "user", "content": user_input})
    
    # Send full history every time
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages
    )
    
    ai_reply = response.choices[0].message.content
    
    # Add AI reply to history
    messages.append({"role": "assistant", "content": ai_reply})
    
    print(f"\nAI: {ai_reply}\n")