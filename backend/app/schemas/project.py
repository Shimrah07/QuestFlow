from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=255)

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=255)
    status: Optional[str] = Field(default=None, description="Active, Archived")

class ProjectOut(BaseModel):
    id: int
    name: str
    description: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
