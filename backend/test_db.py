import os
from dotenv import load_dotenv
from pinecone import Pinecone
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def check_system():
    print("🚀 STARTING SYSTEM CHECK...\n")
    
    # --- 1. PINECONE CHECK ---
    print("1️⃣  Testing Pinecone (Vector Memory)...")
    pc_key = os.getenv("PINECONE_API_KEY")
    if not pc_key:
        print("   ❌ Error: PINECONE_API_KEY is missing from .env")
    else:
        try:
            pc = Pinecone(api_key=pc_key)
            indexes = pc.list_indexes()
            index_names = [i.name for i in indexes]
            print(f"   ✅ Success! Found indexes: {index_names}")
            
            if "ikigai-jobs" not in index_names:
                print("   ⚠️  Warning: Index 'ikigai-jobs' not found. Did you create it in the dashboard?")
        except Exception as e:
            print(f"   ❌ Pinecone Error: {e}")

    print("-" * 30)

    # --- 2. SUPABASE CHECK (ADMIN MODE) ---
    print("2️⃣  Testing Supabase (User Database)...")
    sb_url = os.getenv("SUPABASE_URL")
    sb_key = os.getenv("SUPABASE_SERVICE_KEY") # Making sure we use the SECRET key

    if not sb_url or not sb_key:
        print("   ❌ Error: SUPABASE variables missing from .env")
    else:
        try:
            # Initialize client with Service Role key
            supabase: Client = create_client(sb_url, sb_key)
            
            # Simple read operation to verify auth
            # Listing buckets is a safe way to check connectivity
            buckets = supabase.storage.list_buckets()
            print(f"   ✅ Success! Connected to Supabase Project.")
            print(f"   - Storage Buckets Accessible: {len(buckets)}")
            
        except Exception as e:
            print(f"   ❌ Supabase Error: {e}")
            print("   (Double check that you copied the 'service_role' key, not the 'anon' key!)")

    print("\n🏁 SYSTEM CHECK COMPLETE.")

if __name__ == "__main__":
    check_system()