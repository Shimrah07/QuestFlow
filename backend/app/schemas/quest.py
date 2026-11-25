from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TeamQuestCreate(BaseModel):
    project_id: int
    target: int = Field(ge=1, le=50, description="Number of project tasks to finish")
    reward_xp: int = Field(ge=25, le=5000, description="Bonus XP shared by contributors")
    ends_at: datetime
    title: Optional[str] = Field(default=None, min_length=3, max_length=150)
    description: Optional[str] = Field(default=None, max_length=300)


class WeeklyQuestOut(BaseModel):
    id: int
    code: str
    title: str
    description: Optional[str] = None
    metric: str
    target: int
    progress: int
    reward_xp: int
    ends_at: datetime
    completed: bool
    reward_paid: int


class Contributor(BaseModel):
    user_id: int
    name: str
    count: int
    reward_paid: int


class ProjectRef(BaseModel):
    id: int
    name: str


class TeamQuestOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    project: Optional[ProjectRef] = None
    target: int
    progress: int
    my_contribution: int
    my_reward: int
    contributors: list[Contributor]
    reward_xp: int
    starts_at: datetime
    ends_at: datetime
    status: str
    completed_at: Optional[datetime] = None
    created_by_name: Optional[str] = None
    can_cancel: bool


class QuestBoard(BaseModel):
    week_starts: datetime
    week_ends: datetime
    weekly: list[WeeklyQuestOut]
    team: list[TeamQuestOut]
