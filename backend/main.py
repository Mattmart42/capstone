import os
import io
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from PyPDF2 import PdfReader
from dotenv import load_dotenv

# 1. Load environment variables
load_dotenv()

app = FastAPI(title="Ikigai Nexus API")

# 2. CORS Setup (CORRECTED for Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Changed to 3000 for Next.js
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Initialize Supabase (Service Role / God Mode)
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    raise ValueError("Supabase credentials not found in .env file")

supabase: Client = create_client(url, key)

# --- Data Models ---
class ResumeRequest(BaseModel):
    user_id: str
    file_path: str

# --- Endpoints ---

@app.get("/health")
def health_check():
    return {"status": "active", "brain": "online"}

@app.post("/process-resume")
async def process_resume(request: ResumeRequest):
    print(f"Processing resume for user: {request.user_id}")
    
    try:
        # Download file from 'resumes' bucket
        response = supabase.storage.from_("resumes").download(request.file_path)
        
        # Parse PDF
        pdf_file = io.BytesIO(response)
        reader = PdfReader(pdf_file)
        
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text() + "\n"
            
        print(f"Extracted {len(full_text)} characters.")

        return {
            "status": "success", 
            "message": "Resume parsed successfully",
            "extracted_text_preview": full_text[:200] + "..." 
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)