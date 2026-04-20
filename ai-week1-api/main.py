from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import os
from fastapi.responses import StreamingResponse
from typing import List

load_dotenv()

app = FastAPI()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    temperature: float = 0.7

class ChatResponse(BaseModel):
    reply: str
    tokens_used: int

class ChatHistoryRequest(BaseModel):
    messages: List[Message]
    temperature: float = 0.7

# ─────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": request.message}
        ],
        temperature=request.temperature
    )
    return ChatResponse(
        reply=response.choices[0].message.content,
        tokens_used=response.usage.total_tokens
    )

# ─────────────────────────────────────────
# STREAMING WITH HISTORY
# ─────────────────────────────────────────
@app.post("/chat/stream")
async def chat_stream(request: ChatHistoryRequest):
    
    def generate():
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages
        ]
        stream = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=request.temperature,
            stream=True
        )
        for chunk in stream:
            token = chunk.choices[0].delta.content
            if token:
                yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )

# ─────────────────────────────────────────
# CHAT WITH HISTORY (no streaming)
# ─────────────────────────────────────────
@app.post("/chat/history")
async def chat_with_history(request: ChatHistoryRequest):
    messages = [
        {"role": msg.role, "content": msg.content}
        for msg in request.messages
    ]
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=request.temperature
    )
    return ChatResponse(
        reply=response.choices[0].message.content,
        tokens_used=response.usage.total_tokens
    )