# Project Context: IkigAI Career Coach

## Overview
IkigAI is a real-time, AI-driven career coaching platform. It features an interactive, drag-and-drop spatial canvas (the Ikigai Venn Diagram) powered by a conversational AI agent. As the user talks to the AI, or manually drags gems on the board, the data synchronizes in real-time between the UI, a Supabase database, and a Python-based LLM backend.

## Tech Stack
* **Frontend:** Next.js (App Router), React, Tailwind CSS, Lucide React (Icons).
* **Database:** Supabase (PostgreSQL) with Realtime WebSockets (`postgres_changes`).
* **AI Backend:** Python (FastAPI/Flask) running on `http://127.0.0.1:8000`. LangChain / LLM Agents.

## Core Data Models
Data is primarily stored in the `profiles` table in Supabase via `JSONB` columns to allow for flexible, real-time updates.

### 1. Ikigai Nodes (`ikigai_nodes` column)
```typescript
type IkigaiNode = {
  concept: string; // The primary key / unique identifier
  emoji?: string;
  ik: boolean;     // Love
  i: boolean;      // Good At
  g: boolean;      // World Needs
  ai: boolean;     // Paid For
}
```

### 2. Saved Paths (`saved_paths` column)
```typescript
type SavedPath = {
  id: string;          // Timestamp string
  title: string;       // AI-generated or user-created
  description: string; // Detailed strategy/blueprint
  created_at: string;  // ISO Date string
}
```

## Critical Architecture & Mechanisms

### 1. The Spatial Canvas (`new-dash.tsx`)
* **No Third-Party Pan/Zoom:** The camera matrix is strictly custom-built using React state (`zoom` and `pan`) and `transform` CSS. **Do not introduce libraries like `react-zoom-pan-pinch`** as they conflict with the drag-and-drop coordinate math.
* **Geometric Drag & Drop:** Dropping a gem does not save arbitrary `(X,Y)` pixels. Instead, `handlePointerUp` calculates the exact radial distance from the drop coordinate to the centers of the 4 Venn circles. It computes the resulting `[ik, i, g, ai]` booleans and saves *those* to the database.
* **Local Position Cache:** Because the DB only stores booleans, gems naturally cluster in their intersection zones on load. When manually dragged, their precise screen coordinates are cached in `localPositions` so they stay exactly where dropped during the session.

### 2. Real-Time Sync State
* **The Golden Rule:** The UI is a reflection of the Supabase database. 
* Updates are "Optimistic" (React state updates instantly), followed immediately by a Supabase `upsert` or `update`.
* A Supabase Realtime channel (`profile-updates-[userId]`) actively listens for changes. If the Python AI backend updates the database, the React UI will instantly update without a page refresh.

### 3. The Python AI Backend Loop
The Chat Interface sends the conversation history along with a specific `mode` toggle:
* `absorb` (Listen): The AI passively takes notes and extracts `IkigaiNodes`.
* `probe` (Ask): The AI acts as an interviewer, looking at the user's board to ask targeted questions about empty quadrants.
* `advise` (Advise / Solve): The AI synthesizes the board to generate career blueprints (Saved Paths).

## Current Project State
* **Sprints 1-3 (Completed):** UI layout, Custom Camera Math, Drag-and-Drop, Supabase Realtime Sync, Manual Node Creation, Drag-to-Trash, Saved Paths routing.
* **Sprint 4 (In Progress):** "The Solver & Interviewer." Connecting the Python backend to actively read the `ikigai_nodes` array and dynamically generate `saved_paths` based on the board's centroid.
* **Sprint 5 (Upcoming):** The Scout Agent (Web Search for real job links) and Hallucination Defense (Strict Pydantic Structured Outputs).

## AI Coding Guidelines (For Gemini/Copilot/Cursor)
1.  **Preserve the Math:** Never alter the `handlePointerUp` intersection math or the `resetCamera` viewport calculations unless explicitly requested. 
2.  **Tailwind Only:** Do not write custom CSS. Use Tailwind utility classes.
3.  **UI Consistency:** Match the existing aesthetic: Glass-morphism (`bg-white/90 backdrop-blur`), subtle borders (`border-slate-200`), rounded corners (`rounded-xl` or `rounded-2xl`), and Lucide icons.
4.  **TypeScript:** Maintain strict typing for all new state variables and Supabase payloads.