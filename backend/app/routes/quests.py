from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, check_role
from app.models.quest import Quest, QuestProgress
from app.models.user import User
from app.schemas.quest import QuestBoard, TeamQuestCreate, TeamQuestOut, WeeklyQuestOut
from app.services.quest_service import QuestService, week_bounds

router = APIRouter()

RECENT_DAYS = 14  # finished, expired or cancelled team quests stay visible this long


def _team_out(db: Session, quest: Quest, user: User) -> TeamQuestOut:
    rows = db.scalars(select(QuestProgress).where(QuestProgress.quest_id == quest.id)).all()
    total = sum(r.progress for r in rows)
    mine = next((r for r in rows if r.user_id == user.id), None)
    contributors = sorted(
        ({"user_id": r.user_id, "name": r.user.first_name if r.user else "Former member", "count": r.progress, "reward_paid": r.reward_paid} for r in rows if r.progress > 0),
        key=lambda c: (-c["count"], c["name"]),
    )
    return TeamQuestOut(
        id=quest.id,
        title=quest.title,
        description=quest.description,
        project={"id": quest.project.id, "name": quest.project.name} if quest.project else None,
        target=quest.target,
        progress=min(total, quest.target),
        my_contribution=mine.progress if mine else 0,
        my_reward=mine.reward_paid if mine else 0,
        contributors=contributors,
        reward_xp=quest.reward_xp,
        starts_at=quest.starts_at,
        ends_at=quest.ends_at,
        status=quest.status,
        completed_at=quest.completed_at,
        created_by_name=quest.created_by.first_name if quest.created_by else None,
        can_cancel=quest.status == "active" and (user.role == "Admin" or quest.created_by_id == user.id),
    )


@router.get("/", response_model=QuestBoard)
def quest_board(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """This week's personal quests with the user's progress, plus current and recent team quests."""
    now = datetime.now()
    QuestService.expire_overdue(db, now)
    start, end = week_bounds(now)

    weekly = []
    for quest in QuestService.ensure_weekly_quests(db, now):
        row = db.scalar(select(QuestProgress).where(QuestProgress.quest_id == quest.id, QuestProgress.user_id == current_user.id))
        weekly.append(WeeklyQuestOut(
            id=quest.id, code=quest.code, title=quest.title, description=quest.description, metric=quest.metric,
            target=quest.target, progress=min(row.progress if row else 0, quest.target), reward_xp=quest.reward_xp,
            ends_at=quest.ends_at, completed=bool(row and row.completed_at), reward_paid=row.reward_paid if row else 0,
        ))

    recent = now - timedelta(days=RECENT_DAYS)
    team_quests = db.scalars(
        select(Quest).where(
            Quest.kind == "team",
            or_(Quest.status == "active", Quest.ends_at >= recent, Quest.completed_at >= recent),
        )
    ).all()
    # Active quests first, soonest deadline first; then finished ones, newest first.
    order = {"active": 0, "completed": 1, "expired": 2, "cancelled": 3}
    team_quests = sorted(
        team_quests,
        key=lambda q: (order.get(q.status, 9), q.ends_at.timestamp() if q.status == "active" else -q.id),
    )
    return QuestBoard(week_starts=start, week_ends=end, weekly=weekly, team=[_team_out(db, q, current_user) for q in team_quests])


@router.post("/team", response_model=TeamQuestOut, status_code=status.HTTP_201_CREATED)
def create_team_quest(
    data: TeamQuestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Manager"])),
):
    """Set a team quest on a project. (Managers and Admins)"""
    quest = QuestService.create_team_quest(db, data, current_user)
    return _team_out(db, quest, current_user)


@router.delete("/{quest_id}", response_model=TeamQuestOut)
def cancel_team_quest(
    quest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Manager"])),
):
    """Cancel an active team quest. (Its creator, or an Admin)"""
    quest = db.get(Quest, quest_id)
    if not quest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quest not found.")
    QuestService.cancel_team_quest(db, quest, current_user)
    return _team_out(db, quest, current_user)
