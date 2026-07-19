import re
import httpx
from pydantic import BaseModel
from google import genai
from google.genai import types
from app.core.config import settings

class AIReviewResponse(BaseModel):
    syntax_score: int
    best_practices: str
    security: str
    overall_summary: str

async def fetch_github_file(user: str, repo: str, filepath: str) -> str:
    url = f"https://raw.githubusercontent.com/{user}/{repo}/main/{filepath}"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=5.0)
            if resp.status_code == 200:
                return f"\n--- {filepath} ---\n{resp.text}"
            
            # fallback to master
            url_master = f"https://raw.githubusercontent.com/{user}/{repo}/master/{filepath}"
            resp_master = await client.get(url_master, timeout=5.0)
            if resp_master.status_code == 200:
                return f"\n--- {filepath} ---\n{resp_master.text}"
                
        except Exception as e:
            pass
    return ""

async def attempt_fetch_code(repo_url: str) -> str:
    if not repo_url or "github.com" not in repo_url:
        return ""
        
    # Extract user and repo
    # e.g., https://github.com/user/repo
    match = re.search(r"github\.com/([^/]+)/([^/]+)", repo_url)
    if not match:
        return ""
        
    user, repo = match.groups()
    repo = repo.replace(".git", "")
    
    files_to_check = [
        "README.md",
        "package.json",
        "requirements.txt",
        "src/App.tsx",
        "src/App.js",
        "src/index.tsx",
        "main.py",
        "app.py"
    ]
    
    code_content = ""
    for filepath in files_to_check:
        content = await fetch_github_file(user, repo, filepath)
        code_content += content
        if len(code_content) > 50000: # hard limit to avoid excessive tokens in fallback fetch
            break
            
    return code_content

async def run_ai_pre_review(task_title: str, task_desc: str, repo_url: str, approach_notes: str) -> dict:
    """
    Runs the AI Pre-Review using Gemini.
    Falls back to mock data if no API key is provided or if generation fails.
    """
    if not settings.GEMINI_API_KEY:
        return _get_mock_response()
        
    try:
        # Fetch some codebase context if it's a Github URL
        code_context = await attempt_fetch_code(repo_url)
        
        prompt = f"""
You are an expert Senior Software Engineer acting as a mentor.
Your job is to perform a Pre-Review of a student's coding submission.

Task Title: {task_title}
Task Description: {task_desc}

Student's Approach Notes: 
{approach_notes or "No notes provided."}

Student's Repository URL: {repo_url or "No URL provided."}

Code Context (Sampled files from repository):
{code_context or "No code context could be automatically fetched."}

Review the submission based on the available information. Be encouraging but constructive.
"""

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AIReviewResponse,
                temperature=0.2,
            ),
        )
        
        import json
        return json.loads(response.text)
        
    except Exception as e:
        print(f"AI Pre-Review Failed: {e}")
        return _get_mock_response()

def _get_mock_response() -> dict:
    return {
        "syntax_score": 85,
        "best_practices": "Code is clean but missing some TypeScript interfaces.",
        "security": "No apparent vulnerabilities.",
        "overall_summary": "Solid implementation, ready for mentor review."
    }
