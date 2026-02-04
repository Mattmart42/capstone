import os
import time
from dotenv import load_dotenv
from pinecone import Pinecone
from openai import OpenAI
from datasets import load_dataset

# 1. Load Environment Variables
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
INDEX_NAME = "ikigai-jobs"

# 2. Initialize Clients
pc = Pinecone(api_key=PINECONE_API_KEY)
client = OpenAI(api_key=OPENAI_API_KEY)

# Connect to the Index
index = pc.Index(INDEX_NAME)

def get_embedding(text):
    """Generates a vector embedding for a given text using OpenAI."""
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

def ingest_data(limit=50):
    print(f"🚀 Starting Ingestion into Pinecone Index: {INDEX_NAME}...")
    
    # 3. Load Dataset from Hugging Face
    # We use a dataset that has Titles, Skills, and Descriptions
    print("📥 Streaming dataset from Hugging Face...")
    dataset = load_dataset("NxtGenIntern/job_titles_and_descriptions", split="train", streaming=True)
    
    vectors_to_upload = []
    count = 0

    # 4. Loop through the dataset
    for row in dataset:
        if count >= limit:
            break
            
        job_title = row['Job Title']
        skills = row['Skills']
        description = row['Job Description']
        
        # Create a "Rich Text" blob for the AI to search against
        # This is what we actually embed.
        combined_text = f"Job Title: {job_title}\nKey Skills: {skills}\nDescription: {description}"
        
        print(f"🔹 Processing: {job_title}")
        
        try:
            # Generate Embedding
            vector = get_embedding(combined_text)
            
            # Prepare Data for Pinecone
            # ID: A unique string (we use job title here for simplicity)
            # Values: The vector list
            # Metadata: The actual text we want to retrieve later
            vector_data = {
                "id": str(count), # Simple ID like "1", "2", "3"
                "values": vector,
                "metadata": {
                    "title": job_title,
                    "skills": skills,
                    "text": combined_text # We store the full text so the AI can read it later
                }
            }
            vectors_to_upload.append(vector_data)
            count += 1
            
        except Exception as e:
            print(f"⚠️ Error embedding {job_title}: {e}")

    # 5. Batch Upload to Pinecone
    if vectors_to_upload:
        print(f"📤 Uploading {len(vectors_to_upload)} jobs to Pinecone...")
        index.upsert(vectors=vectors_to_upload)
        print("✅ Upload Complete!")
    else:
        print("❌ No data prepared.")

if __name__ == "__main__":
    # We limit to 50 jobs for the test to save money/time.
    # You can increase this to 500 or 1000 later!
    ingest_data(limit=50)