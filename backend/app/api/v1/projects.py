from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from app.deps import get_db, get_current_user, get_current_mentor
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.sprint import Sprint, Task, TaskAssignment, TaskSubmission
from app.models.activity import ActivityEvent
from app.schemas.project import ProjectCreate, ProjectResponse
from app.schemas.sprint import SprintCreate, SprintResponse, TaskCreate, TaskUpdate, TaskResponse, TaskAssignmentResponse

router = APIRouter()

# --- Projects ---

from pydantic import BaseModel

class StudentAssignment(BaseModel):
    student_id: int

# --- Projects ---

@router.get("/", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Admins see all projects
    if current_user.role == "admin":
        return db.query(Project).all()
    # Mentors see only their own projects
    elif current_user.role == "mentor":
        return db.query(Project).filter(Project.mentor_id == current_user.id).all()
    # Students see only projects they are members of
    else:
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
        mentor_id=current_mentor.id if not project_in.mentor_id else project_in.mentor_id,
        start_date=project_in.start_date,
        end_date=project_in.end_date
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

    # Log activity event for project started
    db.add(ActivityEvent(
        event_type="project_started",
        actor_user_id=db_project.mentor_id,
        project_id=db_project.id,
        event_metadata={"project_title": db_project.title}
    ))
    db.commit()
    
    return db_project

@router.get("/{id}", response_model=ProjectResponse)
def get_project(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Enforce project visibility:
    # 1. Admin can see any project
    # 2. Mentor can see only if they own the project
    # 3. Student can see only if they are assigned to this project
    if current_user.role == "admin":
        return project
    elif current_user.role == "mentor":
        if project.mentor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not manage this project"
            )
        return project
    else:
        member = db.query(ProjectMember).filter(
            ProjectMember.project_id == id,
            ProjectMember.user_id == current_user.id
        ).first()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not assigned to this project"
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

@router.post("/{id}/assign")
def assign_student_to_project(
    id: int,
    payload: StudentAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Authorize assignment access
    if current_user.role == "mentor" and project.mentor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You can only assign students to your own projects."
        )
    elif current_user.role not in ["mentor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Student accounts cannot assign members."
        )

    # Verify student exists and has student role
    target_student = db.query(User).filter(User.id == payload.student_id).first()
    if not target_student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    
    # Check if already a member of the project
    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == id,
        ProjectMember.user_id == payload.student_id
    ).first()
    if existing_member:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student is already assigned to this project.")

    # Create membership entry
    new_member = ProjectMember(
        project_id=id,
        user_id=payload.student_id,
        role="contributor"
    )
    db.add(new_member)
    db.commit()

    return {"status": "success", "message": f"Successfully assigned {target_student.name} to project {project.title}."}

@router.get("/{id}/assignable-students")
def get_assignable_students(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Authorize access
    if current_user.role == "mentor" and project.mentor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You can only view assignable students for your own projects."
        )
    elif current_user.role not in ["mentor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )

    # Get user_ids of students already assigned to this project
    assigned_user_ids = db.query(ProjectMember.user_id).filter(ProjectMember.project_id == id).subquery()

    # Get all users with student role who are not in this project
    assignable = db.query(User).filter(
        User.role == "student",
        ~User.id.in_(assigned_user_ids)
    ).order_by(User.name).all()

    return [
        {"id": u.id, "name": u.name, "email": u.email}
        for u in assignable
    ]

# --- Project Members & Leaderboard ---

class MemberAssignPayload(BaseModel):
    student_id: int

@router.post("/{id}/members")
def assign_member(
    id: int, 
    payload: MemberAssignPayload, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        
    if current_user.role != "admin" and (current_user.role != "mentor" or project.mentor_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not the mentor of this project")
        
    student = db.query(User).filter(User.id == payload.student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        
    existing = db.query(ProjectMember).filter(ProjectMember.project_id == id, ProjectMember.user_id == payload.student_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already a member")
        
    db_member = ProjectMember(project_id=id, user_id=payload.student_id, role="contributor")
    db.add(db_member)
    db.commit()
    return {"status": "success", "message": "Member assigned"}

@router.delete("/{id}/members/{user_id}")
def remove_member(
    id: int, 
    user_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        
    if current_user.role != "admin" and (current_user.role != "mentor" or project.mentor_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not the mentor of this project")
        
    member = db.query(ProjectMember).filter(ProjectMember.project_id == id, ProjectMember.user_id == user_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        
    db.delete(member)
    db.commit()
    return {"status": "success", "message": "Member removed"}

@router.get("/{id}/members")
def get_members(
    id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        
    is_member = db.query(ProjectMember).filter(ProjectMember.project_id == id, ProjectMember.user_id == current_user.id).first() is not None
    if current_user.role != "admin" and project.mentor_id != current_user.id and not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    members = db.query(ProjectMember).filter(ProjectMember.project_id == id).all()
    res = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            res.append({
                "user_id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "project_role": m.role
            })
    return res

@router.post("/{id}/sprints/{sprint_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_project_sprint_task(
    id: int,
    sprint_id: int,
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        
    if current_user.role != "admin" and (current_user.role != "mentor" or project.mentor_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not manage this project")
        
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id, Sprint.project_id == id).first()
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found under this project")
        
    db_task = Task(
        sprint_id=sprint_id,
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        github_pr_url=task_in.github_pr_url,
        task_mode=task_in.task_mode,
        difficulty=task_in.difficulty,
        due_date=task_in.due_date
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("/{id}/leaderboard")
def get_project_leaderboard(
    id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        
    is_member = db.query(ProjectMember).filter(ProjectMember.project_id == id, ProjectMember.user_id == current_user.id).first() is not None
    if current_user.role != "admin" and project.mentor_id != current_user.id and not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    members = db.query(ProjectMember).filter(ProjectMember.project_id == id, ProjectMember.role == "contributor").all()
    leaderboard = []
    for m in members:
        subs = db.query(TaskSubmission).join(Task).join(Sprint).filter(
            Sprint.project_id == id,
            TaskSubmission.user_id == m.user_id,
            TaskSubmission.mentor_score.isnot(None)
        ).all()
        
        total_score = sum(s.mentor_score for s in subs)
        tasks_completed = len(subs)
        
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            leaderboard.append({
                "user_id": user.id,
                "name": user.name,
                "avatar_url": user.avatar_url,
                "total_score": total_score,
                "tasks_completed": tasks_completed
            })
            
    leaderboard.sort(key=lambda x: (x["total_score"], x["tasks_completed"]), reverse=True)
    return leaderboard

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

    if current_mentor.role != "admin" and project.mentor_id != current_mentor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You can only create sprints for your own projects."
        )
    
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
    
    is_admin = current_user.role == "admin"
    is_project_mentor = sprint.project.mentor_id == current_user.id
    is_student_member = current_user.role == "student" and db.query(ProjectMember).filter(
        ProjectMember.project_id == sprint.project_id,
        ProjectMember.user_id == current_user.id
    ).first() is not None

    if not (is_admin or is_project_mentor or is_student_member):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to create tasks in this project."
        )

    db_task = Task(
        sprint_id=sprint_id,
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        github_pr_url=task_in.github_pr_url,
        task_mode=task_in.task_mode,
        difficulty=task_in.difficulty,
        due_date=task_in.due_date
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
    
    sprint = db_task.sprint
    is_admin = current_user.role == "admin"
    is_project_mentor = sprint.project.mentor_id == current_user.id
    is_student_member = current_user.role == "student" and db.query(ProjectMember).filter(
        ProjectMember.project_id == sprint.project_id,
        ProjectMember.user_id == current_user.id
    ).first() is not None

    if not (is_admin or is_project_mentor or is_student_member):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to edit tasks in this project."
        )

    # Update fields
    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)
        
    db.commit()
    db.refresh(db_task)
    return db_task
    
# --- Phase 2: Project-Level Interactions ---

from app.models.communication import Announcement
from app.models.project import Resource
from app.models.sprint import StuckFlag
from app.schemas.communication import AnnouncementCreate, AnnouncementResponse
from app.schemas.interaction import ResourceCreate, ResourceResponse, StuckFlagResponse

@router.get("/{id}/announcements", response_model=List[AnnouncementResponse])
def get_project_announcements(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    announcements = db.query(Announcement).filter(
        Announcement.project_id == id
    ).order_by(Announcement.created_at.desc()).all()
    
    return announcements

@router.post("/{id}/announcements", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_project_announcement(
    id: int,
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if current_user.role != "admin" and (current_user.role != "mentor" or project.mentor_id != current_user.id):
        raise HTTPException(status_code=403, detail="Only the project mentor can create announcements")
        
    new_announcement = Announcement(
        project_id=id,
        mentor_id=current_user.id,
        content=payload.content,
        pinned=payload.pinned
    )
    db.add(new_announcement)
    db.commit()
    db.refresh(new_announcement)
    return new_announcement

@router.get("/{id}/stuck-flags", response_model=List[StuckFlagResponse])
def get_project_stuck_flags(
    id: int,
    active: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if current_user.role != "admin" and (current_user.role != "mentor" or project.mentor_id != current_user.id):
        raise HTTPException(status_code=403, detail="Only the project mentor can view all stuck flags")
        
    query = db.query(StuckFlag).join(Task).join(Sprint).filter(Sprint.project_id == id)
    
    if active:
        query = query.filter(StuckFlag.resolved_at.is_(None))
        
    return query.order_by(StuckFlag.created_at.desc()).all()

@router.get("/{id}/resources", response_model=List[ResourceResponse])
def get_project_resources(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    resources = db.query(Resource).filter(Resource.project_id == id).order_by(Resource.created_at.desc()).all()
    return resources

@router.post("/{id}/resources", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
def create_project_resource(
    id: int,
    payload: ResourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Anyone in the project can add resources (mentor or member)
    is_member = db.query(ProjectMember).filter(ProjectMember.project_id == id, ProjectMember.user_id == current_user.id).first()
    is_mentor = (project.mentor_id == current_user.id)
    
    if not is_member and not is_mentor and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Must be a project member to add resources")
        
    new_resource = Resource(
        project_id=id,
        added_by=current_user.id,
        title=payload.title,
        url=payload.url,
        description=payload.description
    )
    db.add(new_resource)
    db.commit()
    db.refresh(new_resource)
    return new_resource
