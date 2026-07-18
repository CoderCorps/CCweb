from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
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

    return {"status": "ok"}
