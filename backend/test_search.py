import os
from dotenv import load_dotenv
from pinecone import Pinecone
from openai import OpenAI

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
index = pc.Index("ikigai-jobs")

def search_jobs(query):
    print(f"🔎 Searching for: '{query}'...")
    
    # 1. Turn query into vector
    query_vector = client.embeddings.create(
        input=query,
        model="text-embedding-3-small"
    ).data[0].embedding
    
    # 2. Search Pinecone
    results = index.query(
        vector=query_vector,
        top_k=3,
        include_metadata=True
    )
    
    # 3. Print Results
    for match in results['matches']:
        print(f"\n🏆 Match Score: {match['score']:.4f}")
        print(f"   Title: {match['metadata']['title']}")
        print(f"   Skills: {match['metadata']['skills'][:100]}...") # Truncate for clean output

if __name__ == "__main__":
    # Try a semantic search!
    # Notice I don't use the exact job title. I describe the *vibe*.
    search_jobs("I love coding and building visual interfaces for websites")