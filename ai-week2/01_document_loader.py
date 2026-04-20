from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import os

# ─────────────────────────────────────────
# STEP 1 — LOAD PDF
# ─────────────────────────────────────────
def load_pdf(path: str):
    loader = PyPDFLoader(path)
    pages = loader.load()
    print(f"Loaded {len(pages)} pages")
    print(f"First page preview: {pages[0].page_content[:200]}")
    return pages

# ─────────────────────────────────────────
# STEP 2 — CHUNK DOCUMENTS
# ─────────────────────────────────────────
def chunk_documents(pages):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,      # max characters per chunk
        chunk_overlap=200,    # overlap between chunks
        length_function=len,
    )
    chunks = splitter.split_documents(pages)
    print(f"\nTotal chunks: {len(chunks)}")
    for chunk in chunks:
        print(f"index:{chunks.index(chunk)}, pages: {chunk.metadata['page']}")  # print chunk index and metadata
    print(f"Chunk 1 metadata: {chunks[0].metadata}")
    return chunks

# ─────────────────────────────────────────
# TEST IT
# ─────────────────────────────────────────
if __name__ == "__main__":
    # Download any PDF and put it in this folder
    # Or use this sample PDF URL
    import urllib.request 
    
    pages = load_pdf("sample.pdf")
    chunks = chunk_documents(pages)