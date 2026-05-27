from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.auth import UserOut

class ExpenseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)

class ExpenseStatusUpdate(BaseModel):
    status: str = Field(description="Pending, Approved, Rejected")

class ExpenseOut(BaseModel):
    id: int
    title: str
    category: str
    amount: float
    status: str
    created_at: datetime
    submitted_by_id: int
    submitted_by: UserOut

    class Config:
        from_attributes = True
