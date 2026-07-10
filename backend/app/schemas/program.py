from pydantic import BaseModel, ConfigDict

class ProgramBase(BaseModel):
    title: str
    description: str
    track_type: str

class ProgramCreate(ProgramBase):
    pass

class ProgramResponse(ProgramBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
