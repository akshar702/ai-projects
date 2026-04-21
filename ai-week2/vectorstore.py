from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv
import os

load_dotenv()

embedding_function = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=os.getenv("GEMINI_API_KEY")
)

def load_pdf(path: str):
    loader = PyPDFLoader(path)
    pages = loader.load()
    print(f"Loaded {len(pages)} pages")
    return pages

def chunk_documents(pages):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
        length_function=len,
    )
    chunks = splitter.split_documents(pages)
    print(f"Total chunks: {len(chunks)}")
    return chunks

def load_and_chunk(path: str):
    pages = load_pdf(path)
    return chunk_documents(pages)

def store_in_chromadb(chunks, collection_name="documents"):
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embedding_function,
        persist_directory="./chroma_db",
        collection_name=collection_name
    )
    print(f"Stored {len(chunks)} chunks in ChromaDB ✅")
    return vectorstore

if __name__ == "__main__":
    pages = load_pdf("sample.pdf")
    chunks = chunk_documents(pages)