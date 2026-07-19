from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
import datetime

from app.deps import get_db, get_current_user
from app.core.security import decode_token
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.communication import Room, RoomMessage

router = APIRouter()

# --- Connection Manager ---

class ConnectionManager:
    # NOTE: This in-memory connection registry does not scale across multiple server instances.
    # If the application scales beyond a single backend instance, swap this implementation for Redis Pub/Sub.
    def __init__(self):
        # Maps room_id (int) to list of WebSocket connections
        self.active_connections: dict[int, List[WebSocket]] = {}

    async def connect(self, room_id: int, websocket: WebSocket):
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, room_id: int, websocket: WebSocket):
        if room_id in self.active_connections:
            self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast(self, room_id: int, message: dict):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def broadcast_bytes(self, room_id: int, message: bytes, exclude: WebSocket = None):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                if connection != exclude:
                    try:
                        await connection.send_bytes(message)
                    except Exception:
                        pass

manager = ConnectionManager()

# --- REST Endpoints ---

@router.get("/api/v1/rooms/{project_id}/messages")
def get_room_messages(
    project_id: int,
    before: Optional[datetime.datetime] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    is_member = db.query(ProjectMember).filter(ProjectMember.project_id == project_id, ProjectMember.user_id == current_user.id).first() is not None
    if current_user.role != "admin" and project.mentor_id != current_user.id and not is_member:
        raise HTTPException(status_code=403, detail="Access denied: You are not a member of this project")
        
    room = db.query(Room).filter(Room.project_id == project_id).first()
    if not room:
        room = Room(project_id=project_id)
        db.add(room)
        db.commit()
        db.refresh(room)
        
    query = db.query(RoomMessage).filter(RoomMessage.room_id == room.id)
    if before:
        query = query.filter(RoomMessage.created_at < before)
        
    messages = query.order_by(RoomMessage.created_at.desc()).limit(limit).all()
    # Reverse to return chronological order
    messages.reverse()
    
    return [
        {
            "id": m.id,
            "room_id": m.room_id,
            "user_id": m.user_id,
            "user_name": m.user.name,
            "user_avatar": m.user.avatar_url,
            "content": m.content,
            "created_at": m.created_at,
            "edited_at": m.edited_at
        }
        for m in messages
    ]

# --- WebSocket Endpoint ---

@router.websocket("/ws/rooms/{project_id}")
async def websocket_room(
    project_id: int, 
    websocket: WebSocket, 
    token: str = Query(...), 
    db: Session = Depends(get_db)
):
    await websocket.accept()
    # Resolve and verify user from JWT query token
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        print(f"WS auth failed: invalid token payload {payload}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    user_id_str = payload.get("sub")
    if not user_id_str:
        print("WS auth failed: no sub claim")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    try:
        user_id = int(user_id_str)
    except ValueError:
        print("WS auth failed: sub is not int")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        print("WS auth failed: user not found")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    # Verify membership
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        return
        
    is_member = db.query(ProjectMember).filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user.id).first() is not None
    if user.role != "admin" and project.mentor_id != user.id and not is_member:
        print(f"WS auth failed: user {user.id} not member/mentor/admin")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    # Resolve or create room
    room = db.query(Room).filter(Room.project_id == project_id).first()
    if not room:
        room = Room(project_id=project_id)
        db.add(room)
        db.commit()
        db.refresh(room)
        
    # Accept and store connection
    await manager.connect(room.id, websocket)
    
    # Broadcast presence (online)
    await manager.broadcast(room.id, {"type": "presence", "user_id": user.id, "status": "online"})
    
    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type", "message")
            
            if event_type == "typing":
                await manager.broadcast(room.id, {"type": "typing", "user_id": user.id})
                continue
                
            content = data.get("content")
            if not content:
                continue
                
            now = datetime.datetime.now(datetime.timezone.utc)
            
            # Use isolated session for thread safety inside async loop
            from app.db.session import SessionLocal
            session = SessionLocal()
            try:
                db_msg = RoomMessage(
                    room_id=room.id,
                    user_id=user.id,
                    content=content,
                    created_at=now
                )
                session.add(db_msg)
                session.commit()
                session.refresh(db_msg)
                
                payload = {
                    "id": db_msg.id,
                    "room_id": db_msg.room_id,
                    "user_id": db_msg.user_id,
                    "user_name": user.name,
                    "user_avatar": user.avatar_url,
                    "content": db_msg.content,
                    "created_at": db_msg.created_at.isoformat(),
                    "edited_at": db_msg.edited_at.isoformat() if db_msg.edited_at else None
                }
                # Broadcast message to all active clients in this room
                await manager.broadcast(room.id, payload)
            finally:
                session.close()
                
    except WebSocketDisconnect:
        manager.disconnect(room.id, websocket)
        # Broadcast presence (offline)
        await manager.broadcast(room.id, {"type": "presence", "user_id": user.id, "status": "offline"})

@router.websocket("/ws/yjs/{project_id}")
async def websocket_yjs(project_id: int, websocket: WebSocket, db: Session = Depends(get_db)):
    """
    A simple WebSocket relay for Yjs.
    y-websocket clients connect here. We receive binary messages (Uint8Array)
    and broadcast them to all other clients connected to the same project_id.
    """
    await websocket.accept()
    
    # We use a separate room namespace for Yjs to avoid mixing with chat messages
    yjs_room_id = f"yjs_{project_id}"
    
    # Let's reuse ConnectionManager, but with string keys for Yjs rooms
    if yjs_room_id not in manager.active_connections:
        manager.active_connections[yjs_room_id] = []
    manager.active_connections[yjs_room_id].append(websocket)
    
    try:
        while True:
            # y-websocket sends binary data
            data = await websocket.receive_bytes()
            
            # Broadcast to everyone else in this yjs room
            for connection in manager.active_connections.get(yjs_room_id, []):
                if connection != websocket:
                    try:
                        await connection.send_bytes(data)
                    except Exception:
                        pass
    except WebSocketDisconnect:
        if yjs_room_id in manager.active_connections:
            if websocket in manager.active_connections[yjs_room_id]:
                manager.active_connections[yjs_room_id].remove(websocket)
            if not manager.active_connections[yjs_room_id]:
                del manager.active_connections[yjs_room_id]

