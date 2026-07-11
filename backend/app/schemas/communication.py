from pydantic import BaseModel, ConfigDict
from typing import Optional, List
import datetime
from app.schemas.user import UserResponse

class DirectMessageBase(BaseModel):
    content: str

class DirectMessageCreate(DirectMessageBase):
    recipient_id: int

class DirectMessageResponse(DirectMessageBase):
    id: int
    sender_id: int
    recipient_id: int
    read_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    
    sender: Optional[UserResponse] = None
    recipient: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class ThreadPreviewResponse(BaseModel):
    user: UserResponse
    last_message: DirectMessageResponse
    unread_count: int

class AnnouncementBase(BaseModel):
    content: str
    pinned: bool = True

class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementResponse(AnnouncementBase):
    id: int
    project_id: int
    mentor_id: int
    created_at: datetime.datetime
    mentor: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class AnnouncementReadReceipt(BaseModel):
    announcement_id: int
    user_id: int
    read_at: datetime.datetime
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class MessageReactionBase(BaseModel):
    target_type: str
    target_id: int
    emoji: str

class MessageReactionCreate(MessageReactionBase):
    pass

class MessageReactionResponse(MessageReactionBase):
    id: int
    user_id: int
    created_at: datetime.datetime
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
