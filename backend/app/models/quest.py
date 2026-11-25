from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Quest(Base):
    """
    A goal that pays bonus XP once it is reached.

    - kind "weekly": created automatically each week from a template (`code`); progress is
      personal, one QuestProgress row per user.
    - kind "team": created by a Manager or Admin for a project; everyone who completes a task in
      that project contributes, and the bonus is split by contribution when the target is met.
    """
    __tablename__ = "quests"
    __table_args__ = (UniqueConstraint("kind", "code", "starts_at", name="uq_quest_kind_code_start"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    kind: Mapped[str] = mapped_column(String(10), nullable=False)  # weekly | team
    code: Mapped[str] = mapped_column(String(40), nullable=True)  # weekly template code
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(String(300), nullable=True)
    metric: Mapped[str] = mapped_column(String(30), nullable=False)  # tasks_completed | tasks_on_time | xp_earned
    target: Mapped[int] = mapped_column(Integer, nullable=False)
    reward_xp: Mapped[int] = mapped_column(Integer, nullable=False)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String(15), default="active", nullable=False)  # active | completed | expired | cancelled
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    project = relationship("Project")
    created_by = relationship("User", foreign_keys=[created_by_id])


class QuestProgress(Base):
    """One user's progress on one quest (their own count for weekly quests, their contribution for team quests)."""
    __tablename__ = "quest_progress"
    __table_args__ = (UniqueConstraint("quest_id", "user_id", name="uq_quest_progress_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    quest_id: Mapped[int] = mapped_column(Integer, ForeignKey("quests.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    reward_paid: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user = relationship("User")
