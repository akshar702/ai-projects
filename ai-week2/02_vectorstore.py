from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from dotenv import load_dotenv
import os

load_dotenv()

# ─────────────────────────────────────────
# EMBEDDING MODEL
# ─────────────────────────────────────────
embedding_function = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=os.getenv("GEMINI_API_KEY")
)

# ─────────────────────────────────────────
# LOAD + CHUNK
# ─────────────────────────────────────────
def load_and_chunk(pdf_path: str):
    loader = PyPDFLoader(pdf_path)
    pages = loader.load()
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    chunks = splitter.split_documents(pages)
    print(f"Total chunks: {len(chunks)}")
    return chunks

# ─────────────────────────────────────────
# STORE IN CHROMADB
# ─────────────────────────────────────────
def store_in_chromadb(chunks, collection_name="documents"):
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embedding_function,
        persist_directory="./chroma_db",
        collection_name=collection_name
    )
    print(f"Stored {len(chunks)} chunks in ChromaDB ✅")
    return vectorstore

# ─────────────────────────────────────────
# SEARCH CHROMADB
# ─────────────────────────────────────────
def search(query: str, vectorstore, top_k=3):
    results = vectorstore.similarity_search(query, k=top_k)
    print(f"\nQuery: '{query}'")
    print("=" * 50)
    for i, doc in enumerate(results):
        print(f"\nResult {i+1} — Page {doc.metadata.get('page', 0) + 1}:")
        print(doc.page_content[:300])
        print("-" * 30)
    return results

# ─────────────────────────────────────────
# RUN
# ─────────────────────────────────────────
if __name__ == "__main__":
    chunks = load_and_chunk("sample.pdf")
    vectorstore = store_in_chromadb(chunks)
    
    # Test semantic search
    search("what are the types of taxes in India?", vectorstore)
    search("income tax rates", vectorstore)