from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
import datetime

class ActivityEventResponse(BaseModel):
    id: int
    event_type: str
    actor_name: str
    actor_avatar_url: Optional[str] = None
    project_id: Optional[int] = None
    project_title: Optional[str] = None
    created_at: datetime.datetime
    metadata: Dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)
