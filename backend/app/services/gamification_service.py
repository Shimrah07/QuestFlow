from sqlalchemy.orm import Session
from app.models.user import User

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
        """
        if xp_amount < 0:
            return user
            
        user.points += xp_amount
        user.level = (user.points // 500) + 1
        
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
