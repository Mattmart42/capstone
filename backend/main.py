import os
import json
import asyncio
import PyPDF2
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from openai import AsyncOpenAI
from supabase import create_client, Client
from dotenv import load_dotenv
from io import BytesIO
from datetime import datetime
import uuid

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

class ProposedPath(BaseModel):
    title: str
    description: str

class PathSuggestions(BaseModel):
    paths: List[ProposedPath]

class ChatRequest(BaseModel):
    messages: List[Message]
    user_id: str
    mode: str = "probe"
    paths_to_append: Optional[List[ProposedPath]] = None

class UserProfile(BaseModel):
    passions: List[str] = []
    skills: List[str] = []
    values: List[str] = []
    preferences: List[str] = []

class ResumeRequest(BaseModel):
    user_id: str
    file_path: str

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

# --- NEW: The Node-Based Background Listener ---
async def update_user_profile(user_id: str, new_text: str):
    print(f"🕵️ Listener waking up to analyze nodes for {user_id}...")
    
    try:
        # 1. Fetch current profile to get existing nodes
        current_data = supabase.table("profiles").select("*").eq("id", user_id).execute()
        
        if not current_data.data:
            print("No existing profile found. Creating a new one...")
            existing_nodes = []
        else:
            # We look for 'ikigai_nodes', default to empty list if missing
            existing_nodes = current_data.data[0].get("ikigai_nodes", [])

        # 2. Ask GPT-4o-mini to extract/update entities
        extraction_prompt = f"""
        You are a logical data extractor for an Ikigai mapping application.
        Your job is to identify distinct concepts, activities, or interests the user mentions, and evaluate them against the 4 pillars of Ikigai.

        The 4 Pillars (Boolean values):
        - ik: What they love (Passion/Interest)
        - i: What they are good at (Skill/Talent)
        - g: What the world needs (Mission/Demand)
        - ai: What they can be paid for (Vocation/Marketability)

        CURRENT NODES:
        {json.dumps(existing_nodes, indent=2)}
        
        LATEST USER MESSAGE:
        "{new_text}"
        
        INSTRUCTIONS:
        1. Analyze the message for ANY concepts (e.g., "Distance Running", "Python Development", "Public Speaking").
        2. Assign a single, highly relevant emoji to the "emoji" field for each concept.
        3. If a concept matches an existing node, UPDATE its boolean values based on the new context. Do not override a 'true' with a 'false'.
        4. If it's a new concept, CREATE a new node.
        5. If the user doesn't know or hasn't stated if a pillar applies, set it to `false`.
        6. Return ONLY a JSON object with a single key "nodes" containing the array of updated/new node objects.

        EXAMPLE OUTPUT FORMAT:
        {{
          "nodes": [
            {{
              "concept": "Distance Running",
              "emoji": "🏃‍♂️",
              "ik": true,
              "i": true,
              "g": false,
              "ai": false
            }}
          ]
        }}
        """

        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": extraction_prompt}],
            response_format={"type": "json_object"} # Force JSON output
        )
        
        result_json = json.loads(response.choices[0].message.content)
        new_nodes = result_json.get("nodes", [])
        
        # 1. Create a dictionary of your existing nodes so we can merge safely
        # We use the lowercase concept name as the key to prevent duplicates
        node_map = {node["concept"].lower(): node for node in existing_nodes}
        
        # 2. Merge the LLM's new nodes into the existing map
        for new_node in new_nodes:
            concept_key = new_node["concept"].lower()
            
            if concept_key in node_map:
                # If the concept already exists, safely update it!
                # We use 'or' so we never accidentally turn a True into a False
                existing = node_map[concept_key]
                existing["ik"] = existing.get("ik", False) or new_node.get("ik", False)
                existing["i"] = existing.get("i", False) or new_node.get("i", False)
                existing["g"] = existing.get("g", False) or new_node.get("g", False)
                existing["ai"] = existing.get("ai", False) or new_node.get("ai", False)
                
                if "emoji" in new_node:
                    existing["emoji"] = new_node["emoji"]
                    
                node_map[concept_key] = existing
            else:
                # If it's a brand new concept, just add it to the map
                node_map[concept_key] = new_node
                
        # 3. Convert the merged dictionary back into a flat list
        updated_nodes = list(node_map.values())
        
        # 4. Save the safely combined list back to Supabase
        supabase.table("profiles").update({
            "ikigai_nodes": updated_nodes,
            "updated_at": datetime.now().isoformat()
        }).eq("id", user_id).execute()
        
        print(f"✅ Merged {len(new_nodes)} updates. Total nodes: {len(updated_nodes)}")
        
        print(f"✅ Ikigai nodes updated for {user_id}")

    except Exception as e:
        print(f"❌ Error updating nodes: {e}")

# --- Endpoints ---

@app.get("/health")
def health_check():
    return {"status": "active"}

@app.post("/process-resume")
async def process_resume(request: ResumeRequest):
    print(f"📄 Processing resume for user {request.user_id}...")
    try:
        # 1. Download the file from Supabase Storage
        file_data = supabase.storage.from_("resumes").download(request.file_path)
        
        # 2. Extract Text from PDF bytes
        pdf_file = BytesIO(file_data)
        reader = PyPDF2.PdfReader(pdf_file)
        extracted_text = ""
        for page in reader.pages:
            extracted_text += page.extract_text() + "\n"
            
        # 3. Fetch current nodes
        current_data = supabase.table("profiles").select("*").eq("id", request.user_id).execute()
        existing_nodes = []
        if current_data.data:
            existing_nodes = current_data.data[0].get("ikigai_nodes", [])

        # 4. Ask GPT-4o-mini to extract nodes from the resume
        extraction_prompt = f"""
        You are a logical data extractor for an Ikigai mapping application.
        The user has uploaded their resume. Extract their distinct professional concepts, hard skills, and roles.

        The 4 Pillars (Boolean values):
        - ik: What they love (Passion/Interest)
        - i: What they are good at (Skill/Talent)
        - g: What the world needs (Mission/Demand)
        - ai: What they can be paid for (Vocation/Marketability)

        CURRENT NODES:
        {json.dumps(existing_nodes, indent=2)}
        
        RESUME TEXT:
        "{extracted_text[:4000]}" # Limiting to 4k chars to ensure we capture the most relevant recent experience
        
        INSTRUCTIONS:
        1. Analyze the resume for concepts (e.g., "React.js", "Project Management", "Data Analysis", "Distance Running").
        2. Since this is a resume, the concepts listed usually mean 'i' (Good at) is true. If it was a professional job or formal education, 'ai' (Paid for/Marketable) is true.
        3. 'ik' (Love) and 'g' (World Needs) should be evaluated carefully. If unsure, set them to `false`.
        4. If a concept matches an existing node, UPDATE it. Do not override a 'true' with a 'false'.
        5. If it's a new concept, CREATE a new node.
        6. Return ONLY a JSON object with a single key "nodes" containing the array of updated/new node objects.
        """

        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": extraction_prompt}],
            response_format={"type": "json_object"}
        )
        
        result_json = json.loads(response.choices[0].message.content)
        new_nodes = result_json.get("nodes", [])
        
        # 1. Create a dictionary of your existing nodes so we can merge safely
        # We use the lowercase concept name as the key to prevent duplicates
        node_map = {node["concept"].lower(): node for node in existing_nodes}
        
        # 2. Merge the LLM's new nodes into the existing map
        for new_node in new_nodes:
            concept_key = new_node["concept"].lower()
            
            if concept_key in node_map:
                # If the concept already exists, safely update it!
                # We use 'or' so we never accidentally turn a True into a False
                existing = node_map[concept_key]
                existing["ik"] = existing.get("ik", False) or new_node.get("ik", False)
                existing["i"] = existing.get("i", False) or new_node.get("i", False)
                existing["g"] = existing.get("g", False) or new_node.get("g", False)
                existing["ai"] = existing.get("ai", False) or new_node.get("ai", False)
                
                if "emoji" in new_node:
                    existing["emoji"] = new_node["emoji"]
                    
                node_map[concept_key] = existing
            else:
                # If it's a brand new concept, just add it to the map
                node_map[concept_key] = new_node
                
        # 3. Convert the merged dictionary back into a flat list
        updated_nodes = list(node_map.values())
        
        # 4. Save the safely combined list back to Supabase
        supabase.table("profiles").upsert({
            "id": user_id,
            "ikigai_nodes": updated_nodes,
            "updated_at": "now()"
        }).execute()
        
        print(f"✅ Merged {len(new_nodes)} updates. Total nodes: {len(updated_nodes)}")

        print(f"✅ Resume processed and nodes updated for {request.user_id}")
        return {"status": "success", "extracted_text_preview": extracted_text[:100]}

    except Exception as e:
        print(f"❌ Error processing resume: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chat/history/{user_id}")
async def get_chat_history(user_id: str):
    """Fetches the chat history for a specific user from Supabase."""
    try:
        # Fetch messages, ordered by creation time (oldest first)
        response = supabase.table("chat_messages") \
            .select("id, role, content") \
            .eq("user_id", user_id) \
            .order("created_at") \
            .execute()
            
        return {"messages": response.data}
    except Exception as e:
        print(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch chat history")

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    # 1. Get latest message
    latest_msg = request.messages[-1]
    
    # 2. Save User Message
    asyncio.create_task(save_message(request.user_id, "user", latest_msg.content))

    # 3. TRIGGER THE LISTENER (Runs in background)
    if not TEST_MODE and latest_msg.role == "user":
        asyncio.create_task(update_user_profile(request.user_id, latest_msg.content))

    # --- NEW: 4. FETCH LONG-TERM MEMORY ---
    profile_context = "You do not know anything about this user yet."
    nodes = []
    try:
        profile_response = supabase.table("profiles").select("*").eq("id", request.user_id).execute()
        if profile_response.data:
            nodes = profile_response.data[0].get('ikigai_nodes', []) or []

            formatted_nodes = "\n".join([
                f"- {n.get('concept', 'Unknown')}: Love(ik):{n.get('ik', False)}, Good At(i):{n.get('i', False)}, World Needs(g):{n.get('g', False)}, Paid For(ai):{n.get('ai', False)}" 
                for n in nodes
            ])

            profile_context = f"Here is the user's current Ikigai map:\n{formatted_nodes or 'No concepts mapped yet.'}"
    except Exception as e:
        print(f"Error fetching profile context: {e}")

    # --- CALCULATE WEAKEST PILLAR ---
    pillar_counts = {"ik": 0, "i": 0, "g": 0, "ai": 0}
    for node in nodes:
        if node.get("ik"): pillar_counts["ik"] += 1
        if node.get("i"): pillar_counts["i"] += 1
        if node.get("g"): pillar_counts["g"] += 1
        if node.get("ai"): pillar_counts["ai"] += 1

    weakest_pillar_key = min(pillar_counts, key=pillar_counts.get)
    weakest_pillar_count = pillar_counts[weakest_pillar_key]
    
    pillar_names = {
        "ik": "Love",
        "i": "Good At",
        "g": "World Needs",
        "ai": "Paid For"
    }
    weakest_pillar_name = pillar_names[weakest_pillar_key]

    # --- DYNAMIC MODE INSTRUCTIONS ---
    mode_instructions = {
        "absorb": """
        CURRENT GOAL: ACTIVE LISTENING.
        - Validate the user's input and acknowledge what they shared.
        - Do NOT ask any new questions.
        - Do NOT offer any career advice, side project ideas, or solutions.
        - Keep your response extremely brief (1-2 sentences max). Give them space to keep talking.
        """,
        
        "probe": """
        CURRENT GOAL: PROBING & DISCOVERY.
        - Look at the user's current Ikigai nodes. Find concepts that have 'false' or missing values.
        - Ask exactly ONE targeted, thought-provoking question to figure out if that concept can fulfill another pillar (e.g., "How could you monetize X?" or "What specific part of Y do you actually enjoy?").
        - Do NOT give career advice or suggest paths yet. You are strictly gathering data.
        """,
        
        "advise": """
        CURRENT GOAL: SYNTHESIS & ADVICE.
        - Review the user's Ikigai nodes.
        - Suggest actionable, specific career paths, side projects, or lifestyle shifts that move their existing concepts closer to the center of the Ikigai (where ik, i, g, and ai are all true).
        - Connect the dots between their disparate nodes. 
        - Be pragmatic and realistic.
        """
    }

    # Fallback to 'probe' if an unknown mode is sent
    current_instructions = mode_instructions.get(request.mode, mode_instructions["probe"])

    # --- NEW: SOLVER AGENT LOGIC (Step 1-3) ---
    advise_system_note = ""
    if request.mode == "advise" and nodes:
        print(f"🧠 Solver Agent active for {request.user_id}...")
        
        # 1. Scoring and Prioritization
        scored_nodes = []
        for n in nodes:
            # Calculate overlap score (0-4)
            score = sum([
                n.get("ik", False), 
                n.get("i", False), 
                n.get("g", False), 
                n.get("ai", False)
            ])
            scored_nodes.append((n, score))
        
        # Filter for "centroid" nodes (score 3 or 4)
        centroid_nodes = [n for n, s in scored_nodes if s >= 3]
        if not centroid_nodes:
            # If none exist, take the highest available score(s)
            max_score = max([s for n, s in scored_nodes]) if scored_nodes else 0
            centroid_nodes = [n for n, s in scored_nodes if s == max_score]
        
        # 2. Structured Generation
        gen_prompt = f"""
        You are a world-class career strategist. You specialize in synthesizing various passions, skills, and market needs into cohesive career blueprints.
        
        The user has a set of Ikigai nodes. I have prioritized the following "centroid" nodes that show the most promise:
        {json.dumps(centroid_nodes, indent=2)}
        
        INSTRUCTIONS:
        1. Analyze these nodes and their overlapping pillars.
        2. Generate 1 or 2 highly synthesized career paths (ProposedPath).
        3. Each path must have a 'title' (short, punchy) and a 'description' (detailed strategy/blueprint).
        4. Return ONLY a JSON object with a key 'paths' containing an array of these objects.
        """
        
        try:
            struct_response = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": gen_prompt}],
                response_format={"type": "json_object"}
            )
            
            gen_data = json.loads(struct_response.choices[0].message.content)
            new_paths = gen_data.get("paths", [])
            
            if new_paths:
                # Prepare System Note for conversational hand-off
                titles_str = ", ".join([p["title"] for p in new_paths])
                concepts_str = ", ".join([n.get("concept", "Unknown") for n in centroid_nodes])
                # UPDATED: Tell the assistant to explain the paths and mention they can be saved
                advise_system_note = f"SYSTEM NOTE: You just analyzed the user's board (Prioritized nodes: {concepts_str}) and generated the following career paths: {titles_str}. Warmly tell the user what you generated, explain why it fits their overlapping passions. Mention that they can click 'Save Path' on any of the cards below if they want to keep them for later."
                
                # We will append the JSON to the end of the stream in generate_stream
                request.paths_to_append = new_paths 
                print(f"✨ Generated {len(new_paths)} paths for {request.user_id} (Manual save mode)")

        except Exception as e:
            print(f"❌ Error in Solver Agent logic: {e}")

    if request.mode == "probe":
        probe_injection = f"\nSYSTEM NOTE: The user's Ikigai board is currently weakest in the '{weakest_pillar_name}' category (Only {weakest_pillar_count} items). Your goal for this turn is to ask a highly targeted, conversational question to help them brainstorm new ideas specifically for this missing category."
        current_instructions += probe_injection

    # --- 5. INJECT MEMORY INTO SYSTEM PROMPT ---
    system_prompt = {
        "role": "system",
        "content": f"""You are a career sensei. You are kind yet stern. You are insightful, but let the user find their own way. You are zen, but not overly spiritual. 
        You exist to guide the user on a journey of self-discovery to find their Ikigai - the place where What they love, What they are good at, What the world needs, and What they can be paid for intersect.
        
        {profile_context}

        {current_instructions}
        
        - Make sure response lengths match the content of the reponse.
        - Keep it short where necessary and verbose as needed.

        This is how the idea of Ikigai works, keep it in mind as you chat with the user:

        4 pillar mappings:
         - What they love: ik
         - What they are good at: i
         - What the world needs: g
         - What they can be paid for: ai

        Overlap of two pillars:
         - A passion: ik i
         - A mission: ik g
         - A vocation: g ai
         - A profession: i ai
        
        Overlap of three pillars:
         - Satisfaction but uselessness: ik i ai
         - Comfortable but emptiness: i g ai
         - Excitement but uncertainty: ik g ai
         - Fullness but poverty: ik i g

        Overlap of all four pillars:
         - A reason for being: ikigai

        """
    }

    # 6. Prepare messages (System Prompt + Last 10 Chat Messages)
    final_messages = [system_prompt] + [msg.model_dump() for msg in request.messages[-10:]]

    # --- Step 3 Hand-off: Append the silent system note for advise mode ---
    if advise_system_note:
        final_messages.append({"role": "system", "content": advise_system_note})

    # --- Response Generator ---
    if TEST_MODE:
        async def mock_stream():
            fake_response = f"I am testing memory. Here is what I see: {profile_context}"
            for word in fake_response.split():
                yield word + " "
                await asyncio.sleep(0.05)
            asyncio.create_task(save_message(request.user_id, "assistant", fake_response))
        return StreamingResponse(mock_stream(), media_type="text/plain")

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
            
            # --- NEW: APPEND PATHS JSON IF AVAILABLE ---
            if hasattr(request, 'paths_to_append') and request.paths_to_append:
                paths_json = json.dumps([p.model_dump() if hasattr(p, 'model_dump') else p for p in request.paths_to_append])
                delimiter_block = f"\n\n===PATHS_JSON=== {paths_json} ===END_PATHS_JSON==="
                full_response += delimiter_block
                yield delimiter_block

            asyncio.create_task(save_message(request.user_id, "assistant", full_response))

        except Exception as e:
            yield f"Error: {str(e)}"

    return StreamingResponse(generate_stream(), media_type="text/plain")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)