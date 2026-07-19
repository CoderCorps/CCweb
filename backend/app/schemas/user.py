from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Literal
import datetime

class ProfileBase(BaseModel):
    bio: Optional[str] = None
    college: Optional[str] = None
    skills: List[str] = []
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    resume_url: Optional[str] = None
    is_public: bool = True
    availability: Optional[str] = None  # Mentor office hours / notes

class ProfileCreate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Literal["student", "mentor", "admin"] = "student"
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime.datetime
    status: Literal["pending", "active", "rejected"] = "active"
    rejection_reason: Optional[str] = None
    last_reminder_sent_at: Optional[datetime.datetime] = None
    unlocked_skills: List[str] = []
    skill_points: int = 0
    profile: Optional[ProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str
    user: UserResponse

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    type: Optional[str] = None

class PortfolioUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    college: Optional[str] = None
    skills: List[str] = []
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    resume_url: Optional[str] = None
    is_public: bool = True
    availability: Optional[str] = None  # Mentor office hours / notes
