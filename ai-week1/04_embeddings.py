from google import genai
from dotenv import load_dotenv
import os
import numpy as np

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

for model in client.models.list():
    print(model.name)
# ─────────────────────────────────────────
# 1. GENERATE EMBEDDINGS
# ─────────────────────────────────────────
print("=" * 50)
print("1. GENERATE EMBEDDINGS")
print("=" * 50)

def get_embedding(text):
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text
    )
    return result.embeddings[0].values

# Generate embeddings for different words
king   = get_embedding("king")
queen  = get_embedding("queen")
apple  = get_embedding("apple")
car    = get_embedding("car")
vehicle = get_embedding("vehicle")

print(f"Embedding dimensions: {len(king)}")
print(f"First 5 numbers of 'king': {king[:5]}")

# ─────────────────────────────────────────
# 2. COSINE SIMILARITY
# ─────────────────────────────────────────
print("\n" + "=" * 50)
print("2. COSINE SIMILARITY")
print("=" * 50)

def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

print(f"king vs queen:   {cosine_similarity(king, queen):.4f}")
print(f"king vs apple:   {cosine_similarity(king, apple):.4f}")
print(f"car vs vehicle:  {cosine_similarity(car, vehicle):.4f}")

# ─────────────────────────────────────────
# 3. SEMANTIC SEARCH
# ─────────────────────────────────────────
print("\n" + "=" * 50)
print("3. SEMANTIC SEARCH")
print("=" * 50)

# Simulate a small knowledge base
docs = [
    "How to cancel your flight booking",
    "Refund policy for delayed flights",
    "Baggage allowance and fees",
    "How to upgrade to business class",
    "Flight status and tracking",
    "How to get your money back",       # same meaning as refund
    "Check in online for your flight",
]

# Embed all docs
doc_embeddings = [(doc, get_embedding(doc)) for doc in docs]

def semantic_search(query, top_k=3):
    query_embedding = get_embedding(query)
    
    # Calculate similarity with all docs
    scores = [
        (doc, cosine_similarity(query_embedding, emb))
        for doc, emb in doc_embeddings
    ]
    
    # Sort by similarity score
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:top_k]

# Search with keyword that doesn't exactly match
query = "I want a refund"
print(f"\nQuery: '{query}'")
print("Top matches:")
for doc, score in semantic_search(query):
    print(f"  {score:.4f} → {doc}")

# Search with completely different wording
query2 = "my luggage is too heavy"
print(f"\nQuery: '{query2}'")
print("Top matches:")
for doc, score in semantic_search(query2):
    print(f"  {score:.4f} → {doc}")