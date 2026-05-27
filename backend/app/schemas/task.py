from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.auth import UserOut
from app.schemas.project import ProjectOut

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    xp: int = Field(default=100, ge=0)
    assigned_to_id: Optional[int] = None
    project_id: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskStatusUpdate(BaseModel):
    status: str = Field(description="Todo, In Progress, Completed")

class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    xp: int
    status: str
    due_date: Optional[datetime]
    created_at: datetime
    assigned_to_id: Optional[int]
    project_id: Optional[int]
    assigned_to: Optional[UserOut] = None
    project: Optional[ProjectOut] = None

    class Config:
        from_attributes = True
