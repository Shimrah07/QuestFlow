from sqlalchemy.orm import Session
from app.models.user import User
from app.services.notification_service import NotificationService

class GamificationService:
    """
    Centralized Gamification & XP Authority Service.
    Handles point accumulation, level progression calculation, and persistence.
    """

    @staticmethod
    def award_xp(db: Session, user: User, xp_amount: int) -> User:
        """
        Awards XP points to a target user and updates their operational level.
        Level progression formula: Level = (points // 500) + 1.
        Reaching a new level also leaves the user a notification.
        """
        if xp_amount < 0:
            return user

        previous_level = user.level
        user.points += xp_amount
        user.level = (user.points // 500) + 1

        db.add(user)
        db.commit()
        db.refresh(user)
        NotificationService.level_up(db, user, previous_level)
        return user
