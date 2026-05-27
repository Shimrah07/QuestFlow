from datetime import datetime
from pydantic import BaseModel, Field

class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=255)

class ProjectOut(BaseModel):
    id: int
    name: str
    description: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
