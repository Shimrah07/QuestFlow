from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.deps import get_db, check_role
from app.models.user import User
from app.schemas.auth import UserOut
from app.schemas.user_admin import UserStatusUpdate, UserRoleUpdate, XpUpdate

router = APIRouter()

@router.get("/", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(check_role(["Admin", "Manager"]))):
    """
    List all users in the system. (Admin and Manager only)
    """
    return db.scalars(select(User)).all()

@router.get("/leaderboard", response_model=list[UserOut])
def get_leaderboard(db: Session = Depends(get_db), current_user: User = Depends(check_role(["Admin", "Manager", "Employee"]))):
    """
    Get system standings sorted by XP/points descending. (All authenticated users)
    """
    return db.scalars(select(User).order_by(User.points.desc())).all()


@router.put("/{user_id}/status", response_model=UserOut)
def update_user_status(user_id: int, schema: UserStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(check_role(["Admin"]))):
    """
    Enable or disable user profile. (Admin only)
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_active = schema.is_active
    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}/role", response_model=UserOut)
def update_user_role(user_id: int, schema: UserRoleUpdate, db: Session = Depends(get_db), current_user: User = Depends(check_role(["Admin"]))):
    """
    Change user role hierarchy. (Admin only)
    """
    if schema.role not in ["Admin", "Manager", "Employee"]:
        raise HTTPException(status_code=400, detail="Invalid role specified.")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.role = schema.role
    db.commit()
    db.refresh(user)
    return user
