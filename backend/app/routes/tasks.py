from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.deps import get_db, get_current_user, check_role
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskOut, TaskStatusUpdate

router = APIRouter()

@router.get("/", response_model=list[TaskOut])
def list_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    List all tasks. Accessible by all authenticated users.
    """
    return db.scalars(select(Task)).all()

@router.post("/", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    schema: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Manager"]))
):
    """
    Assign a new task to an employee. (Managers and Admins only)
    """
    task = Task(
        title=schema.title,
        description=schema.description,
        xp=schema.xp,
        assigned_to_id=schema.assigned_to_id,
        project_id=schema.project_id,
        due_date=schema.due_date
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.put("/{task_id}/status", response_model=TaskOut)
def update_task_status(
    task_id: int,
    schema: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Employee"]))
):
    """
    Update the status of a task. (Employees and Admins only)
    """
    if schema.status not in ["Todo", "In Progress", "Completed"]:
        raise HTTPException(status_code=400, detail="Invalid status specified.")
    
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
        
    # Award points to assigned user if state transitioned to Completed
    if schema.status == "Completed" and task.status != "Completed" and task.assigned_to_id:
        assigned_user = db.get(User, task.assigned_to_id)
        if assigned_user:
            assigned_user.points += task.xp
            assigned_user.level = (assigned_user.points // 500) + 1
            db.add(assigned_user)
            
    task.status = schema.status
    db.commit()
    db.refresh(task)
    return task
