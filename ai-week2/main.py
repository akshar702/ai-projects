from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import shutil
import os
from groq import Groq
from dotenv import load_dotenv
from rag_chain import upload_pdf, ask

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
class AskRequest(BaseModel):
    question: str
    session_id: str

class Message(BaseModel):
    role: str
    content: str

class ChatHistoryRequest(BaseModel):
    messages: List[Message]
    temperature: float = 0.7

# ─────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    temp_path = f"./temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    session_id = upload_pdf(temp_path)
    os.remove(temp_path)
    
    return {
        "session_id": session_id,
        "filename": file.filename,
        "message": "PDF processed successfully"
    }

@app.post("/ask")
async def ask_question(request: AskRequest):
    result = ask(request.question, request.session_id)
    return result

# ─────────────────────────────────────────
# RAG STREAMING — with PDF session
# ─────────────────────────────────────────
@app.post("/ask/stream")
async def ask_stream(request: AskRequest):
    def generate():
        result = ask(request.question, request.session_id)
        answer = result["answer"]
        sources = result["sources"]

        # Stream word by word instead of char by char
        words = answer.split(' ')
        for i, word in enumerate(words):
            # Add space back except for last word
            token = word + (' ' if i < len(words) - 1 else '')
            yield f"data: {token}\n\n"

        import json
        if sources:
            yield f"data: [SOURCES]{json.dumps(sources)}\n\n"
        
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )

# ─────────────────────────────────────────
# GENERAL CHAT STREAMING — no PDF needed
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