from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
import asyncio

from app.deps import get_db, get_current_user, get_current_mentor
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.sprint import Sprint, Task, TaskAssignment, TaskSubmission
from app.models.activity import ActivityEvent
from app.schemas.project import ProjectCreate, ProjectResponse
from app.schemas.sprint import SprintCreate, SprintResponse, TaskCreate, TaskUpdate, TaskResponse, TaskAssignmentResponse

router = APIRouter()

from pydantic import BaseModel

class StudentAssignment(BaseModel):
    student_id: int

# --- Projects ---

@router.get("/", response_model=List[ProjectResponse])
async def get_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    def _query():
        if current_user.role == "admin":
            return db.query(Project).all()
        elif current_user.role == "mentor":
            return db.query(Project).filter(Project.mentor_id == current_user.id).all()
        else:
            return db.query(Project).join(ProjectMember).filter(
                ProjectMember.user_id == current_user.id,
                Project.status.in_(["active", "completed", "planning"])
            ).all()
    return await asyncio.to_thread(_query)

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_mentor: User = Depends(get_current_mentor)
):
    def _create():
        db_project = Project(
            title=project_in.title,
            description=project_in.description,
            status="pending_approval",
            mentor_id=current_mentor.id if not project_in.mentor_id else project_in.mentor_id,
            start_date=project_in.start_date,
            end_date=project_in.end_date
        )
        db.add(db_project)
        db.commit()
        db.refresh(db_project)

        mentor_member = ProjectMember(
            project_id=db_project.id,
            user_id=db_project.mentor_id,
            role="lead"
        )
        db.add(mentor_member)
        db.commit()
        db.refresh(db_project)

        db.add(ActivityEvent(
            event_type="project_started",
            actor_user_id=db_project.mentor_id,
            project_id=db_project.id,
            event_metadata={"project_title": db_project.title}
        ))
        db.commit()
        return db_project

    return await asyncio.to_thread(_create)

@router.get("/{id}", response_model=ProjectResponse)
async def get_project(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    def _query():
        return db.query(Project).filter(Project.id == id).first(), \
               db.query(ProjectMember).filter(
                   ProjectMember.project_id == id,
                   ProjectMember.user_id == current_user.id
               ).first()

    project, member = await asyncio.to_thread(_query)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if current_user.role == "admin":
        return project
    elif current_user.role == "mentor":
        if project.mentor_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not manage this project")
        return project
    else:
        if not member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not assigned to this project")
        return project

@router.post("/{id}/join", response_model=ProjectResponse)
async def join_project(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    def _join():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None, "not_found"
        member = db.query(ProjectMember).filter(
            ProjectMember.project_id == id,
            ProjectMember.user_id == current_user.id
        ).first()
        if member:
            return None, "already_member"
        db_member = ProjectMember(project_id=id, user_id=current_user.id, role="contributor")
        db.add(db_member)
        db.commit()
        db.refresh(project)
        return project, "ok"

    project, result = await asyncio.to_thread(_join)
    if result == "not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if result == "already_member":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already joined this project")
    return project

@router.post("/{id}/assign")
async def assign_student_to_project(
    id: int,
    payload: StudentAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _assign():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None, "project_not_found", None
        target_student = db.query(User).filter(User.id == payload.student_id).first()
        if not target_student:
            return None, "student_not_found", None
        existing_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == id,
            ProjectMember.user_id == payload.student_id
        ).first()
        if existing_member:
            return None, "already_member", None
        new_member = ProjectMember(project_id=id, user_id=payload.student_id, role="contributor")
        db.add(new_member)
        db.commit()
        return project, "ok", target_student

    project, result, target_student = await asyncio.to_thread(_assign)
    if result == "project_not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if current_user.role == "mentor" and project.mentor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You can only assign students to your own projects.")
    elif current_user.role not in ["mentor", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Student accounts cannot assign members.")

    if result == "student_not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    if result == "already_member":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student is already assigned to this project.")

    return {"status": "success", "message": f"Successfully assigned {target_student.name} to project {project.title}."}

@router.get("/{id}/assignable-students")
async def get_assignable_students(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _query():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None, []
        assigned_user_ids = db.query(ProjectMember.user_id).filter(ProjectMember.project_id == id).subquery()
        assignable = db.query(User).filter(
            User.role == "student",
            ~User.id.in_(assigned_user_ids)
        ).order_by(User.name).all()
        return project, assignable

    project, assignable = await asyncio.to_thread(_query)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if current_user.role == "mentor" and project.mentor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    elif current_user.role not in ["mentor", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return [{"id": u.id, "name": u.name, "email": u.email} for u in assignable]

# --- Project Members & Leaderboard ---

class MemberAssignPayload(BaseModel):
    student_id: int

@router.post("/{id}/members")
async def assign_member(
    id: int,
    payload: MemberAssignPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _assign():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None, "project_not_found", None
        student = db.query(User).filter(User.id == payload.student_id, User.role == "student").first()
        if not student:
            return project, "student_not_found", None
        existing = db.query(ProjectMember).filter(
            ProjectMember.project_id == id, ProjectMember.user_id == payload.student_id
        ).first()
        if existing:
            return project, "already_member", None
        db_member = ProjectMember(project_id=id, user_id=payload.student_id, role="contributor")
        db.add(db_member)
        db.commit()
        return project, "ok", student

    project, result, student = await asyncio.to_thread(_assign)
    if result == "project_not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if current_user.role != "admin" and (current_user.role != "mentor" or project.mentor_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if result == "student_not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    if result == "already_member":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already a member")
    return {"status": "success", "message": "Member assigned"}

@router.delete("/{id}/members/{user_id}")
async def remove_member(
    id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _remove():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None, "project_not_found"
        member = db.query(ProjectMember).filter(ProjectMember.project_id == id, ProjectMember.user_id == user_id).first()
        if not member:
            return project, "member_not_found"
        db.delete(member)
        db.commit()
        return project, "ok"

    project, result = await asyncio.to_thread(_remove)
    if result == "project_not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if current_user.role != "admin" and (current_user.role != "mentor" or project.mentor_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if result == "member_not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return {"status": "success", "message": "Member removed"}

@router.get("/{id}/members")
async def get_members(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _query():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None, None, []
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == id, ProjectMember.user_id == current_user.id
        ).first() is not None
        members = db.query(ProjectMember).filter(ProjectMember.project_id == id).all()
        result = []
        for m in members:
            user = db.query(User).filter(User.id == m.user_id).first()
            if user:
                result.append({
                    "user_id": user.id, "name": user.name,
                    "email": user.email, "role": user.role, "project_role": m.role
                })
        return project, is_member, result

    project, is_member, res = await asyncio.to_thread(_query)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if current_user.role != "admin" and project.mentor_id != current_user.id and not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return res

@router.post("/{id}/sprints/{sprint_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_project_sprint_task(
    id: int,
    sprint_id: int,
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _create():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None, "project_not_found"
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id, Sprint.project_id == id).first()
        if not sprint:
            return None, "sprint_not_found"
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
        if task_in.assignee_ids:
            for user_id in task_in.assignee_ids:
                assignment = TaskAssignment(
                    task_id=db_task.id,
                    user_id=user_id,
                    assigned_by_id=current_user.id
                )
                db.add(assignment)
            db.commit()
            db.refresh(db_task)
        return db_task, "ok"

    db_task, result = await asyncio.to_thread(_create)
    if result == "project_not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if result == "sprint_not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found under this project")
    return db_task

@router.get("/{id}/leaderboard")
async def get_project_leaderboard(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _query():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None, None, []
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == id, ProjectMember.user_id == current_user.id
        ).first() is not None
        members = db.query(ProjectMember).filter(ProjectMember.project_id == id, ProjectMember.role == "contributor").all()
        leaderboard = []
        for m in members:
            subs = db.query(TaskSubmission).join(Task).join(Sprint).filter(
                Sprint.project_id == id,
                TaskSubmission.user_id == m.user_id,
                TaskSubmission.mentor_score.isnot(None)
            ).all()
            total_score = sum(s.mentor_score for s in subs)
            user = db.query(User).filter(User.id == m.user_id).first()
            if user:
                leaderboard.append({
                    "user_id": user.id, "name": user.name, "avatar_url": user.avatar_url,
                    "total_score": total_score, "tasks_completed": len(subs)
                })
        leaderboard.sort(key=lambda x: (x["total_score"], x["tasks_completed"]), reverse=True)
        return project, is_member, leaderboard

    project, is_member, leaderboard = await asyncio.to_thread(_query)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if current_user.role != "admin" and project.mentor_id != current_user.id and not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return leaderboard

# --- Sprints ---

@router.get("/{id}/sprints", response_model=List[SprintResponse])
async def get_project_sprints(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    def _query():
        project = db.query(Project).filter(Project.id == id).first()
        return project
    project = await asyncio.to_thread(_query)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project.sprints

@router.post("/{id}/sprints", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
async def create_project_sprint(
    id: int,
    sprint_in: SprintCreate,
    db: Session = Depends(get_db),
    current_mentor: User = Depends(get_current_mentor)
):
    def _create():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None, "project_not_found"
        if current_mentor.role != "admin" and project.mentor_id != current_mentor.id:
            return None, "forbidden"
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
        return db_sprint, "ok"

    db_sprint, result = await asyncio.to_thread(_create)
    if result == "project_not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if result == "forbidden":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You can only create sprints for your own projects.")
    return db_sprint

# --- Tasks ---

@router.get("/sprints/{sprint_id}/tasks", response_model=List[TaskResponse])
async def get_sprint_tasks(sprint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    def _query():
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        return sprint
    sprint = await asyncio.to_thread(_query)
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")
    return sprint.tasks

@router.post("/sprints/{sprint_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_sprint_task(
    sprint_id: int,
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _create():
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if not sprint:
            return None, "sprint_not_found"
        is_admin = current_user.role == "admin"
        is_project_mentor = sprint.project.mentor_id == current_user.id
        is_student_member = current_user.role == "student" and db.query(ProjectMember).filter(
            ProjectMember.project_id == sprint.project_id,
            ProjectMember.user_id == current_user.id
        ).first() is not None
        if not (is_admin or is_project_mentor or is_student_member):
            return None, "forbidden"
        db_task = Task(
            sprint_id=sprint_id, title=task_in.title, description=task_in.description,
            status=task_in.status, github_pr_url=task_in.github_pr_url,
            task_mode=task_in.task_mode, difficulty=task_in.difficulty, due_date=task_in.due_date
        )
        db.add(db_task)
        db.commit()
        db.refresh(db_task)
        return db_task, "ok"

    db_task, result = await asyncio.to_thread(_create)
    if result == "sprint_not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")
    if result == "forbidden":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return db_task

@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _update():
        db_task = db.query(Task).filter(Task.id == task_id).first()
        if not db_task:
            return None, "not_found"
        sprint = db_task.sprint
        is_admin = current_user.role == "admin"
        is_project_mentor = sprint.project.mentor_id == current_user.id
        is_student_member = current_user.role == "student" and db.query(ProjectMember).filter(
            ProjectMember.project_id == sprint.project_id,
            ProjectMember.user_id == current_user.id
        ).first() is not None
        if not (is_admin or is_project_mentor or is_student_member):
            return None, "forbidden"
        update_data = task_in.model_dump(exclude_unset=True)
        if "assignee_ids" in update_data:
            assignee_ids = update_data.pop("assignee_ids")
            if is_admin or is_project_mentor:
                db.query(TaskAssignment).filter(TaskAssignment.task_id == db_task.id).delete()
                for user_id in assignee_ids:
                    assignment = TaskAssignment(
                        task_id=db_task.id,
                        user_id=user_id,
                        assigned_by_id=current_user.id
                    )
                    db.add(assignment)
        for field, value in update_data.items():
            setattr(db_task, field, value)
        db.commit()
        db.refresh(db_task)
        return db_task, "ok"

    db_task, result = await asyncio.to_thread(_update)
    if result == "not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if result == "forbidden":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return db_task

# --- Phase 2: Project-Level Interactions ---

from app.models.communication import Announcement
from app.models.project import Resource
from app.models.sprint import StuckFlag
from app.schemas.communication import AnnouncementCreate, AnnouncementResponse
from app.schemas.interaction import ResourceCreate, ResourceResponse, StuckFlagResponse

@router.get("/{id}/announcements", response_model=List[AnnouncementResponse])
async def get_project_announcements(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _query():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None, []
        announcements = db.query(Announcement).filter(
            Announcement.project_id == id
        ).order_by(Announcement.created_at.desc()).all()
        return project, announcements

    project, announcements = await asyncio.to_thread(_query)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return announcements

@router.post("/{id}/announcements", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_project_announcement(
    id: int,
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _create():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None, "not_found"
        if current_user.role != "admin" and (current_user.role != "mentor" or project.mentor_id != current_user.id):
            return None, "forbidden"
        new_announcement = Announcement(
            project_id=id, mentor_id=current_user.id,
            content=payload.content, pinned=payload.pinned
        )
        db.add(new_announcement)
        db.commit()
        db.refresh(new_announcement)
        return new_announcement, "ok"

    announcement, result = await asyncio.to_thread(_create)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="Project not found")
    if result == "forbidden":
        raise HTTPException(status_code=403, detail="Only the project mentor can create announcements")
    return announcement

@router.get("/{id}/stuck-flags", response_model=List[StuckFlagResponse])
async def get_project_stuck_flags(
    id: int,
    active: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _query():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None, "not_found", []
        if current_user.role != "admin" and (current_user.role != "mentor" or project.mentor_id != current_user.id):
            return None, "forbidden", []
        query = db.query(StuckFlag).join(Task).join(Sprint).filter(Sprint.project_id == id)
        if active:
            query = query.filter(StuckFlag.resolved_at.is_(None))
        return project, "ok", query.order_by(StuckFlag.created_at.desc()).all()

    project, result, flags = await asyncio.to_thread(_query)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="Project not found")
    if result == "forbidden":
        raise HTTPException(status_code=403, detail="Only the project mentor can view all stuck flags")
    return flags

@router.get("/{id}/resources", response_model=List[ResourceResponse])
async def get_project_resources(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _query():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None, []
        resources = db.query(Resource).filter(Resource.project_id == id).order_by(Resource.created_at.desc()).all()
        return project, resources

    project, resources = await asyncio.to_thread(_query)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return resources

@router.post("/{id}/resources", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_project_resource(
    id: int,
    payload: ResourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _create():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None, "not_found"
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == id, ProjectMember.user_id == current_user.id
        ).first()
        is_mentor = (project.mentor_id == current_user.id)
        if not is_member and not is_mentor and current_user.role != "admin":
            return None, "forbidden"
        new_resource = Resource(
            project_id=id, added_by=current_user.id,
            title=payload.title, url=payload.url, description=payload.description
        )
        db.add(new_resource)
        db.commit()
        db.refresh(new_resource)
        return new_resource, "ok"

    resource, result = await asyncio.to_thread(_create)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="Project not found")
    if result == "forbidden":
        raise HTTPException(status_code=403, detail="Not authorized")
    return resource

# --- APPROVAL THREAD ---
from fastapi import WebSocket, WebSocketDisconnect
from app.models.communication import ProjectApprovalMessage

class ApprovalThreadManager:
    def __init__(self):
        self.active_connections: dict[int, List[WebSocket]] = {}

    async def connect(self, project_id: int, websocket: WebSocket):
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)

    def disconnect(self, project_id: int, websocket: WebSocket):
        if project_id in self.active_connections:
            self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]

    async def broadcast(self, project_id: int, message: dict):
        if project_id in self.active_connections:
            for connection in self.active_connections[project_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

approval_manager = ApprovalThreadManager()

class ApprovalMessageResponse(BaseModel):
    id: int
    project_id: int
    user_id: int
    content: str
    created_at: datetime.datetime
    user_name: str
    user_role: str

@router.get("/{id}/approval-thread", response_model=List[ApprovalMessageResponse])
async def get_approval_thread(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _query():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None, "not_found"
        if current_user.role != "admin" and project.mentor_id != current_user.id:
            return None, "forbidden"
        
        messages = db.query(ProjectApprovalMessage).filter(
            ProjectApprovalMessage.project_id == id
        ).order_by(ProjectApprovalMessage.created_at.asc()).all()
        
        result = []
        for msg in messages:
            result.append(ApprovalMessageResponse(
                id=msg.id,
                project_id=msg.project_id,
                user_id=msg.user_id,
                content=msg.content,
                created_at=msg.created_at,
                user_name=msg.user.name,
                user_role=msg.user.role
            ))
        return result, "ok"

    messages, result = await asyncio.to_thread(_query)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="Project not found")
    if result == "forbidden":
        raise HTTPException(status_code=403, detail="Not authorized to view this thread")
    return messages

from app.core.security import decode_token

@router.websocket("/{id}/approval-thread/ws")
async def websocket_approval_thread(websocket: WebSocket, id: int, token: str = Query(...)):
    # 1. Authenticate
    db = next(get_db())
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    project = db.query(Project).filter(Project.id == id).first()
    if not project or (user.role != "admin" and project.mentor_id != user.id):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    await approval_manager.connect(id, websocket)

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "chat_message":
                content = data.get("content")
                if content:
                    msg = ProjectApprovalMessage(
                        project_id=id,
                        user_id=user.id,
                        content=content
                    )
                    db.add(msg)
                    db.commit()
                    db.refresh(msg)
                    
                    broadcast_msg = {
                        "type": "chat_message",
                        "message": {
                            "id": msg.id,
                            "project_id": msg.project_id,
                            "user_id": msg.user_id,
                            "content": msg.content,
                            "created_at": msg.created_at.isoformat(),
                            "user_name": user.name,
                            "user_role": user.role
                        }
                    }
                    await approval_manager.broadcast(id, broadcast_msg)
    except WebSocketDisconnect:
        approval_manager.disconnect(id, websocket)
    finally:
        db.close()
