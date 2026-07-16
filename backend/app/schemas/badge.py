from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class BadgeBase(BaseModel):
    name: str
    description: str
    image_url: str
    criteria_type: str
    criteria_value: int

class BadgeCreate(BadgeBase):
    pass

class Badge(BadgeBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserBadgeBase(BaseModel):
    user_id: int
    badge_id: int

class UserBadgeCreate(UserBadgeBase):
    pass

class UserBadge(BaseModel):
    id: int
    user_id: int
    badge_id: int
    earned_at: datetime
    badge: Badge

    class Config:
        from_attributes = True
