from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.core.deps import get_db, check_role
from app.models.user import User
from app.models.task import Task
from app.models.expense import Expense
from app.models.project import Project

router = APIRouter(dependencies=[Depends(check_role(["Admin"]))])

@router.get("/summary")
def get_system_summary(db: Session = Depends(get_db)):
    """
    Get aggregated system statistics for Admin.
    """
    total_users = db.scalar(select(func.count(User.id))) or 0
    total_projects = db.scalar(select(func.count(Project.id))) or 0
    
    # Task stats
    tasks_count = db.scalar(select(func.count(Task.id))) or 0
    completed_tasks = db.scalar(select(func.count(Task.id)).where(Task.status == "Completed")) or 0
    in_progress_tasks = db.scalar(select(func.count(Task.id)).where(Task.status == "In Progress")) or 0
    todo_tasks = db.scalar(select(func.count(Task.id)).where(Task.status == "Todo")) or 0
    
    # Expense stats
    approved_amount = db.scalar(select(func.sum(Expense.amount)).where(Expense.status == "Approved")) or 0.0
    pending_amount = db.scalar(select(func.sum(Expense.amount)).where(Expense.status == "Pending")) or 0.0
    rejected_amount = db.scalar(select(func.sum(Expense.amount)).where(Expense.status == "Rejected")) or 0.0
    total_expenses = db.scalar(select(func.count(Expense.id))) or 0
    
    return {
        "users_count": total_users,
        "projects_count": total_projects,
        "tasks": {
            "total": tasks_count,
            "todo": todo_tasks,
            "in_progress": in_progress_tasks,
            "completed": completed_tasks
        },
        "expenses": {
            "total_count": total_expenses,
            "approved_amount": approved_amount,
            "pending_amount": pending_amount,
            "rejected_amount": rejected_amount
        }
    }
