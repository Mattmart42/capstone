import os
import json
import asyncio
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from openai import AsyncOpenAI
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="IkigAI Nexus API")

# --- Config ---
TEST_MODE = False # Set to False to use real OpenAI

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

openai_client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# --- Models ---
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    user_id: str

class UserProfile(BaseModel):
    passions: List[str] = []
    skills: List[str] = []
    values: List[str] = []
    preferences: List[str] = []

# --- Helper: Save Chat Message ---
async def save_message(user_id: str, role: str, content: str):
    try:
        supabase.table("chat_messages").insert({
            "user_id": user_id,
            "role": role,
            "content": content
        }).execute()
    except Exception as e:
        print(f"Error saving message: {e}")

# --- NEW: The Background Listener ---
async def update_user_profile(user_id: str, new_text: str):
    print(f"🕵️ Listener waking up for user {user_id}...")
    
    try:
        # 1. Fetch current profile (Using .execute() avoids the 0-rows crash)
        current_data = supabase.table("profiles").select("*").eq("id", user_id).execute()
        
        # If no profile exists (empty list), create a default one
        if not current_data.data:
            print("No existing profile found. Creating a new one...")
            existing_profile = {"passions": [], "skills": [], "values": [], "preferences": []}
        else:
            existing_profile = current_data.data[0] # Get the first item

        # 2. Ask GPT-4o-mini to extract new facts
        extraction_prompt = f"""
        You are a smart data extractor. 
        Your goal is to update the user's "Ikigai Profile" based on their latest message.
        
        CURRENT PROFILE:
        Passions: {existing_profile.get('passions', [])}
        Skills: {existing_profile.get('skills', [])}
        Values (Mission): {existing_profile.get('values', [])}
        Preferences (Vocation): {existing_profile.get('preferences', [])}
        
        LATEST USER MESSAGE:
        "{new_text}"
        
        INSTRUCTIONS:
        - Analyze the message for ANY new information related to the 4 categories.
        - Merge it with the Current Profile.
        - Do not duplicate items.
        - Return ONLY a JSON object with keys: passions, skills, values, preferences.
        """

        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": extraction_prompt}],
            response_format={"type": "json_object"} 
        )
        
        new_profile_json = json.loads(response.choices[0].message.content)
        
        # 3. Save updated profile to Supabase
        supabase.table("profiles").upsert({
            "id": user_id,
            "passions": new_profile_json.get("passions", []),
            "skills": new_profile_json.get("skills", []),
            "values": new_profile_json.get("values", []),
            "preferences": new_profile_json.get("preferences", []),
            "updated_at": "now()"
        }).execute()
        
        print(f"✅ Profile updated for {user_id}")

    except Exception as e:
        print(f"❌ Error updating profile: {e}")

# --- Endpoints ---

@app.get("/health")
def health_check():
    return {"status": "active"}

@app.post("/chat")
async def chat_endpoint(request: ChatRequest, background_tasks: BackgroundTasks):
    # 1. Get latest message
    latest_msg = request.messages[-1]
    
    # 2. Save User Message
    asyncio.create_task(save_message(request.user_id, "user", latest_msg.content))

    # 3. TRIGGER THE LISTENER (This runs in background!)
    if not TEST_MODE and latest_msg.role == "user":
        background_tasks.add_task(update_user_profile, request.user_id, latest_msg.content)

    # --- Response Logic ---
    if TEST_MODE:
        async def mock_stream():
            fake_response = "I am listening... (Check your backend terminal to see if I extracted your data!)"
            for word in fake_response.split():
                yield word + " "
                await asyncio.sleep(0.1)
            asyncio.create_task(save_message(request.user_id, "assistant", fake_response))
        return StreamingResponse(mock_stream(), media_type="text/plain")

    # Real AI Response
    system_prompt = {
        "role": "system",
        "content": "You are an empathetic career coach helping the user find their Ikigai..."
    }
    
    # We feed the last 10 messages for context
    final_messages = [system_prompt] + [msg.model_dump() for msg in request.messages[-10:]]

    async def generate_stream():
        full_response = ""
        try:
            stream = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=final_messages,
                stream=True
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    full_response += text
                    yield text 
            
            asyncio.create_task(save_message(request.user_id, "assistant", full_response))

        except Exception as e:
            yield f"Error: {str(e)}"

    return StreamingResponse(generate_stream(), media_type="text/plain")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)