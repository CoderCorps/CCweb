from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from app.deps import get_db, get_current_user, get_current_mentor
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.sprint import Sprint, Task
from app.schemas.project import ProjectCreate, ProjectResponse
from app.schemas.sprint import SprintCreate, SprintResponse, TaskCreate, TaskUpdate, TaskResponse

router = APIRouter()

# --- Projects ---

@router.get("/", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Students see projects they are members of, mentors see all
    if current_user.role in ["mentor", "admin"]:
        return db.query(Project).all()
    else:
        # Join project_members to filter
        return db.query(Project).join(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_mentor: User = Depends(get_current_mentor)
):
    db_project = Project(
        title=project_in.title,
        description=project_in.description,
        status=project_in.status,
        mentor_id=current_mentor.id if not project_in.mentor_id else project_in.mentor_id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # Automatically add the mentor as a lead member of the project
    mentor_member = ProjectMember(
        project_id=db_project.id,
        user_id=db_project.mentor_id,
        role="lead"
    )
    db.add(mentor_member)
    db.commit()
    db.refresh(db_project)
    
    return db_project

@router.get("/{id}", response_model=ProjectResponse)
def get_project(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project

@router.post("/{id}/join", response_model=ProjectResponse)
def join_project(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    # Check if already a member
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == id,
        ProjectMember.user_id == current_user.id
    ).first()
    if member:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already joined this project")
    
    db_member = ProjectMember(
        project_id=id,
        user_id=current_user.id,
        role="contributor"
    )
    db.add(db_member)
    db.commit()
    db.refresh(project)
    return project

# --- Sprints ---

@router.get("/{id}/sprints", response_model=List[SprintResponse])
def get_project_sprints(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project.sprints

@router.post("/{id}/sprints", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
def create_project_sprint(
    id: int,
    sprint_in: SprintCreate,
    db: Session = Depends(get_db),
    current_mentor: User = Depends(get_current_mentor)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    db_sprint = Sprint(
        project_id=id,
        sprint_number=sprint_in.sprint_number,
        start_date=sprint_in.start_date,
        end_date=sprint_in.end_date,
        goal=sprint_in.goal
    )
    db.add(db_sprint)
    db.commit()
    db.refresh(db_sprint)
    return db_sprint

# --- Tasks ---

@router.get("/sprints/{sprint_id}/tasks", response_model=List[TaskResponse])
def get_sprint_tasks(sprint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")
    return sprint.tasks

@router.post("/sprints/{sprint_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_sprint_task(
    sprint_id: int,
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")
    
    # Optional check: is current_user a member of this project?
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == sprint.project_id,
        ProjectMember.user_id == current_user.id
    ).first()
    
    if current_user.role not in ["mentor", "admin"] and not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this project")

    db_task = Task(
        sprint_id=sprint_id,
        assigned_to_id=task_in.assigned_to_id,
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        github_pr_url=task_in.github_pr_url
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    # Verify user belongs to the project or is mentor
    sprint = db_task.sprint
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == sprint.project_id,
        ProjectMember.user_id == current_user.id
    ).first()
    
    if current_user.role not in ["mentor", "admin"] and not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit tasks in this project")

    # Update fields
    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)
        
    db.commit()
    db.refresh(db_task)
    return db_task
