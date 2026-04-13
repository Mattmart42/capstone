import os
import asyncio
from dotenv import load_dotenv
from tavily import TavilyClient

# 1. Load Environment Variables
load_dotenv()
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

# 2. Initialize Tavily Client
tavily = TavilyClient(api_key=TAVILY_API_KEY)

async def search_market_data(query: str) -> str:
    """
    Asynchronously search for real-world market data using Tavily.
    Returns a concise, formatted summary of the findings.
    """
    try:
        # We perform the search synchronously since the current tavily-python 
        # client is synchronous, but we wrap it in a thread for async safety.
        loop = asyncio.get_event_loop()
        
        # We'll use 'search' with 'include_answer' for a quick summary
        # and 'max_results=3' for top snippets.
        response = await loop.run_in_executor(
            None, 
            lambda: tavily.search(
                query=query, 
                search_depth="advanced", 
                max_results=3,
                include_answer=True
            )
        )

        results = response.get("results", [])
        answer = response.get("answer")
        
        output = [f"### Market Research for: {query}\n"]
        
        if answer:
            output.append(f"**Direct Summary:**\n{answer}\n")
        
        output.append("**Top Sources & Insights:**")
        for i, res in enumerate(results, 1):
            title = res.get("title", "No Title")
            url = res.get("url", "#")
            content = res.get("content", "No content available.")
            output.append(f"{i}. [{title}]({url})\n   > {content}\n")
            
        return "\n".join(output)

    except Exception as e:
        return f"Error during market search: {str(e)}"

if __name__ == "__main__":
    # Test block for standalone execution
    async def test():
        query = "Average salary and job description for a Technical Product Manager"
        print(f"🚀 Starting Scout search for: '{query}'...\n")
        report = await search_market_data(query)
        print(report)

    asyncio.run(test())
