from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.quest import Quest, QuestProgress
from app.models.task import Task
from app.models.user import User
from app.services.gamification_service import GamificationService
from app.services.notification_service import NotificationService

# Weekly quests everyone gets, created automatically for each Monday-to-Monday week.
WEEKLY_TEMPLATES = [
    {"code": "finish-3", "title": "Finish 3 tasks", "description": "Complete any three tasks this week.", "metric": "tasks_completed", "target": 3, "reward_xp": 100},
    {"code": "beat-deadline", "title": "Beat a deadline", "description": "Finish a task before its due date.", "metric": "tasks_on_time", "target": 1, "reward_xp": 50},
    {"code": "earn-500", "title": "Earn 500 XP", "description": "Earn 500 XP from tasks this week.", "metric": "xp_earned", "target": 500, "reward_xp": 75},
]
MAX_TEAM_QUEST_DAYS = 90


def week_bounds(now: datetime) -> tuple[datetime, datetime]:
    start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=7)


def split_reward(total: int, shares: dict[int, int]) -> dict[int, int]:
    """Splits `total` XP in proportion to `shares`, in whole numbers that add up exactly (largest remainder)."""
    weight = sum(shares.values())
    if weight <= 0:
        return {}
    exact = {uid: total * s / weight for uid, s in shares.items()}
    paid = {uid: int(x) for uid, x in exact.items()}
    leftover = total - sum(paid.values())
    for uid in sorted(exact, key=lambda u: (exact[u] - paid[u], shares[u]), reverse=True)[:leftover]:
        paid[uid] += 1
    return paid


class QuestService:

    # ---------- weekly ----------

    @staticmethod
    def ensure_weekly_quests(db: Session, now: Optional[datetime] = None) -> list[Quest]:
        """Returns this week's quests, creating them on first use. Safe to call repeatedly."""
        now = now or datetime.now()
        start, end = week_bounds(now)
        quests = []
        created = False
        for t in WEEKLY_TEMPLATES:
            quest = db.scalar(select(Quest).where(Quest.kind == "weekly", Quest.code == t["code"], Quest.starts_at == start))
            if not quest:
                quest = Quest(kind="weekly", starts_at=start, ends_at=end, **t)
                db.add(quest)
                created = True
            quests.append(quest)
        if created:
            db.commit()
        return quests

    @staticmethod
    def _progress(db: Session, quest: Quest, user_id: int) -> QuestProgress:
        row = db.scalar(select(QuestProgress).where(QuestProgress.quest_id == quest.id, QuestProgress.user_id == user_id))
        if not row:
            row = QuestProgress(quest_id=quest.id, user_id=user_id, progress=0, reward_paid=0)
            db.add(row)
            db.flush()
        return row

    # ---------- the one event quests react to ----------

    @staticmethod
    def on_task_completed(db: Session, task: Task, now: Optional[datetime] = None) -> None:
        """Credits the task's assignee on weekly quests and on any team quest for the task's project."""
        if not task.assigned_to_id:
            return
        now = now or datetime.now()
        assignee = db.get(User, task.assigned_to_id)
        if not assignee:
            return

        # Weekly quests: personal progress, each paid once.
        due = task.due_date.replace(tzinfo=None) if task.due_date else None
        increments = {
            "tasks_completed": 1,
            "tasks_on_time": 1 if due and now <= due else 0,
            "xp_earned": task.xp,
        }
        payouts = []
        for quest in QuestService.ensure_weekly_quests(db, now):
            step = increments.get(quest.metric, 0)
            if not step:
                continue
            row = QuestService._progress(db, quest, assignee.id)
            if row.completed_at:
                continue
            row.progress += step
            if row.progress >= quest.target:
                row.completed_at = now
                row.reward_paid = quest.reward_xp
                payouts.append((quest, quest.reward_xp))
        db.commit()
        for quest, reward in payouts:
            GamificationService.award_xp(db, assignee, reward)
            NotificationService.notify(
                db, [assignee.id], f"quest-{quest.id}-complete", f"Quest complete: {quest.title}",
                f"+{reward} XP bonus", "success", "/quests",
            )

        # Team quests on this task's project.
        if not task.project_id:
            return
        team_quests = db.scalars(
            select(Quest).where(
                Quest.kind == "team", Quest.status == "active", Quest.project_id == task.project_id,
                Quest.starts_at <= now, Quest.ends_at > now,
            )
        ).all()
        for quest in team_quests:
            QuestService._progress(db, quest, assignee.id).progress += 1
            db.flush()
            rows = db.scalars(select(QuestProgress).where(QuestProgress.quest_id == quest.id)).all()
            total = sum(r.progress for r in rows)
            if total < quest.target:
                continue
            quest.status = "completed"
            quest.completed_at = now
            shares = split_reward(quest.reward_xp, {r.user_id: r.progress for r in rows if r.progress > 0})
            for r in rows:
                r.reward_paid = shares.get(r.user_id, 0)
                r.completed_at = now
            db.commit()
            for r in rows:
                if not r.reward_paid:
                    continue
                GamificationService.award_xp(db, db.get(User, r.user_id), r.reward_paid)
                NotificationService.notify(
                    db, [r.user_id], f"quest-{quest.id}-complete", f"Team quest complete: {quest.title}",
                    f"You earned +{r.reward_paid} XP ({r.progress} of {total} tasks).", "success", "/quests",
                )
            if quest.created_by_id and quest.created_by_id not in shares:
                NotificationService.notify(
                    db, [quest.created_by_id], f"quest-{quest.id}-complete", f"Team quest complete: {quest.title}",
                    f"{len(shares)} people shared +{quest.reward_xp} XP.", "success", "/quests",
                )
        db.commit()

    # ---------- team quests ----------

    @staticmethod
    def expire_overdue(db: Session, now: Optional[datetime] = None) -> None:
        now = now or datetime.now()
        db.execute(update(Quest).where(Quest.kind == "team", Quest.status == "active", Quest.ends_at <= now).values(status="expired"))
        db.commit()

    @staticmethod
    def create_team_quest(db: Session, data, actor: User, now: Optional[datetime] = None) -> Quest:
        now = now or datetime.now()
        project = db.get(Project, data.project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That project doesn't exist.")
        if project.status != "Active":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team quests can only be set on active projects.")
        ends_at = data.ends_at.replace(tzinfo=None)
        if ends_at <= now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The end date must be in the future.")
        if ends_at > now + timedelta(days=MAX_TEAM_QUEST_DAYS):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Team quests can run for at most {MAX_TEAM_QUEST_DAYS} days.")

        noun = "task" if data.target == 1 else "tasks"
        quest = Quest(
            kind="team",
            title=(data.title or f"Finish {data.target} {project.name} {noun}").strip(),
            description=data.description,
            metric="tasks_completed",
            target=data.target,
            reward_xp=data.reward_xp,
            project_id=project.id,
            created_by_id=actor.id,
            starts_at=now,
            ends_at=ends_at,
            status="active",
        )
        db.add(quest)
        db.commit()
        db.refresh(quest)

        # Tell the people who work on this project.
        people = set(db.scalars(select(Task.assigned_to_id).where(Task.project_id == project.id, Task.assigned_to_id.is_not(None))))
        NotificationService.notify(
            db, people, f"quest-{quest.id}-new", f"New team quest: {quest.title}",
            f"+{quest.reward_xp} XP shared · ends {ends_at.strftime('%b %d').replace(' 0', ' ')}", "info", "/quests", actor_id=actor.id,
        )
        return quest

    @staticmethod
    def cancel_team_quest(db: Session, quest: Quest, actor: User) -> Quest:
        if quest.kind != "team":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Weekly quests can't be cancelled.")
        if not (actor.role == "Admin" or quest.created_by_id == actor.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied: Only the quest's creator or an admin can cancel it.")
        if quest.status != "active":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only active quests can be cancelled.")
        quest.status = "cancelled"
        db.commit()
        db.refresh(quest)
        return quest
