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

# ─────────────────────────────────────────
# CORS — so Angular can call this API
# ─────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────
# MODELS (Pydantic = Zod in Python)
# ─────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    temperature: float = 0.7

class ChatResponse(BaseModel):
    reply: str
    tokens_used: int

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
# STREAMING ENDPOINT
# ─────────────────────────────────────────
@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    
    def generate():
        stream = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": request.message}
            ],
            temperature=request.temperature,
            stream=True
        )
        
        for chunk in stream:
            token = chunk.choices[0].delta.content
            if token:
                # SSE format — Angular knows this format!
                yield f"data: {token}\n\n"
        
        # Signal stream is done
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"  # ← this is SSE
    )

# ─────────────────────────────────────────
# CHAT WITH HISTORY
# ─────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str

class ChatHistoryRequest(BaseModel):
    messages: List[Message]
    temperature: float = 0.7

@app.post("/chat/history")
async def chat_with_history(request: ChatHistoryRequest):
    # Convert Pydantic models to dicts for Groq
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