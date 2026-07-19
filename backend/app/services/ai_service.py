import os
import json
from google import genai
from pydantic import BaseModel, Field

class AIPRReview(BaseModel):
    score: int = Field(description="Score from 0 to 100 representing code quality and correctness")
    feedback: list[str] = Field(description="List of specific, actionable feedback points on syntax, best practices, and logic")

async def generate_pr_review(pr_url: str, diff_content: str) -> tuple[int, dict]:
    """
    Generates an AI review for a Pull Request diff using Gemini.
    Returns a tuple of (score, feedback_json).
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return 0, {"error": "GEMINI_API_KEY not configured for AI reviews."}

    client = genai.Client(api_key=api_key)

    prompt = f"""
    You are an expert coding mentor. Review the following pull request diff.
    Provide a score out of 100 based on code quality, best practices, and potential bugs.
    Provide a list of actionable feedback points.
    
    PR URL: {pr_url}
    
    Diff:
    {diff_content}
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': AIPRReview,
            },
        )
        
        review_data = json.loads(response.text)
        return review_data.get("score", 0), {"feedback": review_data.get("feedback", [])}
    except Exception as e:
        return 0, {"error": str(e)}
