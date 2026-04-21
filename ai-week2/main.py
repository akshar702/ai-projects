from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import shutil
import os
from rag_chain import upload_pdf, ask

app = FastAPI()

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

# ─────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    # Save uploaded file temporarily
    temp_path = f"./temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Process PDF → get session_id
    session_id = upload_pdf(temp_path)
    
    # Clean up temp file
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