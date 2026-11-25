from datetime import datetime, timedelta
from typing import Iterable, Optional
from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User
from app.models.task import Task

DUE_SOON_WINDOW = timedelta(hours=24)
# Only tasks that became overdue recently produce an "overdue" notification, so a first visit
# doesn't produce a pile of notes about work that has been late for weeks.
OVERDUE_LOOKBACK = timedelta(days=3)


class NotificationService:
    """
    Writes notifications when events happen. The person who caused an event is never notified
    about it (pass them as `actor_id`). Duplicates are ignored thanks to the (user_id, key) key.
    """

    @staticmethod
    def notify(
        db: Session,
        user_ids: Iterable[Optional[int]],
        key: str,
        title: str,
        description: Optional[str] = None,
        type: str = "info",
        link: Optional[str] = None,
        actor_id: Optional[int] = None,
        commit: bool = True,
    ) -> int:
        recipients = {uid for uid in user_ids if uid is not None and uid != actor_id}
        created = 0
        for uid in recipients:
            exists = db.scalar(select(Notification.id).where(Notification.user_id == uid, Notification.key == key))
            if exists:
                continue
            db.add(Notification(user_id=uid, key=key, title=title, description=description, type=type, link=link))
            created += 1
        if commit and created:
            db.commit()
        return created

    @staticmethod
    def reviewer_ids(db: Session) -> list[int]:
        """Active managers and admins: the people who review claims and oversee tasks."""
        return list(db.scalars(select(User.id).where(User.role.in_(["Admin", "Manager"]), User.is_active == True)))  # noqa: E712

    @staticmethod
    def remove_for_entity(db: Session, prefix: str, only_unread: bool = False, commit: bool = True) -> None:
        """Deletes notifications whose key starts with `prefix` (e.g. "claim-7-")."""
        stmt = delete(Notification).where(Notification.key.like(f"{prefix}%"))
        if only_unread:
            stmt = stmt.where(Notification.is_read == False)  # noqa: E712
        db.execute(stmt)
        if commit:
            db.commit()

    # ---------- task events ----------

    @staticmethod
    def task_assigned(db: Session, task: Task, actor: User) -> None:
        if not task.assigned_to_id:
            return
        project = f" · {task.project.name}" if getattr(task, "project", None) else ""
        NotificationService.notify(
            db, [task.assigned_to_id], f"task-{task.id}-assigned-{task.assigned_to_id}",
            "New task assigned to you", f"{task.title} · {task.xp} XP{project}", "info", "/tasks", actor_id=actor.id,
        )

    @staticmethod
    def task_completed(db: Session, task: Task, actor: User) -> None:
        assignee = db.get(User, task.assigned_to_id) if task.assigned_to_id else None
        name = assignee.first_name if assignee else "Someone"
        if assignee and assignee.id == actor.id:
            title, description = f"{name} finished a task", f"{task.title} · +{task.xp} XP"
        else:
            title, description = "Task marked done", f"{task.title} · {name} · +{task.xp} XP"
        NotificationService.notify(
            db, NotificationService.reviewer_ids(db), f"task-{task.id}-done", title, description, "success", "/tasks", actor_id=actor.id,
        )
        if assignee and assignee.id != actor.id:
            NotificationService.notify(
                db, [assignee.id], f"task-{task.id}-done-mine", "Your task was marked done",
                f"{task.title} · +{task.xp} XP", "success", "/tasks", actor_id=actor.id,
            )

    @staticmethod
    def level_up(db: Session, user: User, old_level: int) -> None:
        if user.level <= old_level:
            return
        NotificationService.notify(
            db, [user.id], f"level-{user.level}", f"You reached level {user.level}",
            f"{user.points:,} XP in total.", "success", "/gamification",
        )

    @staticmethod
    def deadline_notifications(db: Session, user: User, now: Optional[datetime] = None) -> int:
        """
        Generated lazily when a user loads their notifications: open tasks due within 24 hours,
        and tasks that became overdue in the last few days. No background scheduler needed.
        """
        now = now or datetime.now()
        tasks = db.scalars(
            select(Task).where(Task.assigned_to_id == user.id, Task.status != "Completed", Task.due_date.is_not(None))
        ).all()
        created = 0
        for t in tasks:
            due = t.due_date.replace(tzinfo=None)
            if now < due <= now + DUE_SOON_WINDOW:
                created += NotificationService.notify(
                    db, [user.id], f"task-{t.id}-due-soon", "Due within 24 hours", t.title, "warning", "/tasks", commit=False,
                )
            elif now - OVERDUE_LOOKBACK <= due <= now:
                created += NotificationService.notify(
                    db, [user.id], f"task-{t.id}-overdue", "Task overdue",
                    f"{t.title} was due {due.strftime('%b %d').replace(' 0', ' ')}.", "warning", "/tasks", commit=False,
                )
        if created:
            db.commit()
        return created

    # ---------- claim events ----------

    @staticmethod
    def claim_submitted(db: Session, expense, actor: User) -> None:
        NotificationService.notify(
            db, NotificationService.reviewer_ids(db), f"claim-{expense.id}-review", "New claim to review",
            f"{actor.first_name} · {expense.title} · ${expense.amount:,.2f}", "info", "/approvals", actor_id=actor.id,
        )

    @staticmethod
    def claim_decided(db: Session, expense, actor: User) -> None:
        if expense.status not in ("Approved", "Rejected"):
            return
        # The review request is settled; drop the unread "to review" notes everyone else still has.
        NotificationService.remove_for_entity(db, f"claim-{expense.id}-review", only_unread=True, commit=False)
        approved = expense.status == "Approved"
        NotificationService.notify(
            db, [expense.submitted_by_id], f"claim-{expense.id}-{expense.status.lower()}",
            "Claim approved" if approved else "Claim rejected",
            f"{expense.title} · ${expense.amount:,.2f}", "success" if approved else "warning", "/expenses", actor_id=actor.id, commit=False,
        )
        db.commit()

    # ---------- account events ----------

    @staticmethod
    def welcome(db: Session, user: User) -> None:
        NotificationService.notify(
            db, [user.id], "welcome", f"Welcome to QuestFlow, {user.first_name}",
            f"You're signed in as {user.role}. Finished tasks earn XP toward your next level.", "info", "/dashboard",
        )
