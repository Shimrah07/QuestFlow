from pydantic import BaseModel, Field

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserRoleUpdate(BaseModel):
    role: str = Field(description="Admin, Manager, Employee")

class XpUpdate(BaseModel):
    points: int = Field(ge=0)

