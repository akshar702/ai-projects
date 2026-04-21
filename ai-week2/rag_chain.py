from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
import os
import hashlib
import chromadb
from vectorstore import load_and_chunk, store_in_chromadb

load_dotenv()

# ─────────────────────────────────────────
# SETUP
# ─────────────────────────────────────────
embedding_function = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=os.getenv("GEMINI_API_KEY")
)

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.3
)

# ─────────────────────────────────────────
# HASH — unique ID per PDF content
# ─────────────────────────────────────────
def get_pdf_hash(pdf_path: str) -> str:
    with open(pdf_path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()

# ─────────────────────────────────────────
# UPLOAD PDF — returns session_id
# ─────────────────────────────────────────
def upload_pdf(pdf_path: str, force_reload=False) -> str:
    session_id = get_pdf_hash(pdf_path)  # hash = session_id
    print(f"Session ID: {session_id}")  # ← add this
    print(f"PDF path: {pdf_path}")
    client = chromadb.PersistentClient(path="./chroma_db")
    
    if force_reload:
        try:
            client.delete_collection(session_id)
            print(f"Deleted old collection")
        except:
            pass
    
    vectorstore = Chroma(
        persist_directory="./chroma_db",
        embedding_function=embedding_function,
        collection_name=session_id
    )
    
    if vectorstore._collection.count() > 0:
        print(f"PDF already processed — {vectorstore._collection.count()} chunks")
    else:
        print(f"Processing PDF...")
        chunks = load_and_chunk(pdf_path)
        store_in_chromadb(chunks, session_id)
        print(f"Done — {len(chunks)} chunks stored")
    
    return session_id  # return to caller

# ─────────────────────────────────────────
# PROMPT TEMPLATE
# ─────────────────────────────────────────
prompt = ChatPromptTemplate.from_template("""
You are a helpful assistant that answers questions based on the provided context.

Rules:
- Primarily answer from the context below
- Mention page numbers when you find relevant information
- If the exact answer is not in context but related information exists, use that to give best possible answer
- Only say "I couldn't find this" if context has absolutely nothing related

Context:
{context}

Question: {question}

Answer:
""")

# ─────────────────────────────────────────
# ASK — takes question + session_id
# ─────────────────────────────────────────
def ask(question: str, session_id: str, top_k: int = 8):
    print(f"Searching collection: {session_id}")
    vectorstore = Chroma(
        persist_directory="./chroma_db",
        embedding_function=embedding_function,
        collection_name=session_id
    )
    
    results = vectorstore.similarity_search(question, k=top_k)
    print(f"Found {len(results)} results")
    
    # Add this:
    for i, doc in enumerate(results):
        print(f"Chunk {i+1}: {doc.page_content[:100]}")
    
    context = ""
    pages = []
    for doc in results:
        page = doc.metadata.get('page', 0) + 1
        context += f"\n[Page {page}]\n{doc.page_content}\n"
        pages.append(f"Page {page}")

    # Add this:
    print(f"Context length: {len(context)}")
    
    chain = prompt | llm
    response = chain.invoke({
        "context": context,
        "question": question
    })
    
    print(f"Answer: {response.content[:100]}")
    
    return {
        "answer": response.content,
        "sources": list(set(pages))
    }

# ─────────────────────────────────────────
# TEST
# ─────────────────────────────────────────
if __name__ == "__main__":
    # Step 1 — upload PDF once → get session_id
    session_id = upload_pdf("sample.pdf")
    print(f"Session ID: {session_id}\n")
    
    # Step 2 — ask questions using session_id only
    questions = [
        "What are the GST tax slabs in India?",
        "What is the due date for income tax returns?",
        "What causes tax evasion in India?",
        "What is custom duty?"
    ]
    
    for q in questions:
        print(f"\nQ: {q}")
        result = ask(q, session_id)
        print(f"A: {result['answer']}")
        print(f"Sources: {result['sources']}")
        print("=" * 60)