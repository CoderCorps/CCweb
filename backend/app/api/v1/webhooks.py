from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.deps import get_db
from app.models.sprint import Task
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/github")
async def github_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Receives GitHub Actions webhook payloads.
    We expect a 'check_run' or 'workflow_run' event.
    """
    event = request.headers.get("x-github-event")
    
    # In a real app, verify the webhook signature here using x-hub-signature-256
    
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if event == "workflow_run":
        action = payload.get("action")
        workflow_run = payload.get("workflow_run", {})
        conclusion = workflow_run.get("conclusion")
        
        # Try to match the branch name to a task ID (e.g., branch 'task-123')
        head_branch = workflow_run.get("head_branch", "")
        
        if action == "completed" and head_branch.startswith("task-"):
            try:
                task_id = int(head_branch.split("-")[1])
                task = db.query(Task).filter(Task.id == task_id).first()
                if task:
                    task.ci_status = "success" if conclusion == "success" else "failed"
                    # Mock test coverage parsing
                    task.test_coverage = 85.5 if conclusion == "success" else 42.0
                    db.commit()
            except Exception as e:
                logger.error(f"Failed to process workflow_run for branch {head_branch}: {e}")
                
    elif event == "check_run":
        action = payload.get("action")
        check_run = payload.get("check_run", {})
        conclusion = check_run.get("conclusion")
        
        # In a check_run, we can check the pull_requests array
        prs = check_run.get("pull_requests", [])
        if action == "completed" and prs:
            head_branch = prs[0].get("head", {}).get("ref", "")
            if head_branch.startswith("task-"):
                try:
                    task_id = int(head_branch.split("-")[1])
                    task = db.query(Task).filter(Task.id == task_id).first()
                    if task:
                        task.ci_status = "success" if conclusion == "success" else "failed"
                        task.test_coverage = 90.0 if conclusion == "success" else 50.0
                        db.commit()
                except Exception as e:
                    logger.error(f"Failed to process check_run for branch {head_branch}: {e}")

    elif event == "pull_request":
        action = payload.get("action")
        if action in ["opened", "synchronize", "reopened"]:
            pr = payload.get("pull_request", {})
            pr_url = pr.get("html_url")
            head_branch = pr.get("head", {}).get("ref", "")
            
            # Simple diff fetch simulation (In reality, we'd fetch diff using GitHub API or pass the patch)
            diff_content = "diff --git a/test.py b/test.py\n+ print('Hello World')" 
            
            if head_branch.startswith("task-"):
                try:
                    task_id = int(head_branch.split("-")[1])
                    task = db.query(Task).filter(Task.id == task_id).first()
                    if task:
                        from app.services.ai_service import generate_pr_review
                        import asyncio
                        
                        # In production this would be enqueued via Celery or BackgroundTasks
                        # Using await synchronously for demo setup
                        score, feedback_json = await generate_pr_review(pr_url, diff_content)
                        
                        # Find the TaskSubmission to attach the score, or attach to task.
                        # Wait, the plan was to attach to TaskSubmission, but webhook might not have submission yet.
                        # Let's attach to the first submission or create a dummy one.
                        # For simplicity, we can just update the first submission for this task, if exists.
                        from app.models.sprint import TaskSubmission
                        submission = db.query(TaskSubmission).filter(TaskSubmission.task_id == task.id).first()
                        if submission:
                            submission.ai_score = score
                            submission.ai_feedback_json = feedback_json
                            db.commit()
                except Exception as e:
                    logger.error(f"Failed to process pull_request for branch {head_branch}: {e}")

    return {"status": "ok"}

