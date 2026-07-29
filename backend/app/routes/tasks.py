from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from app.core.deps import get_db, get_current_user, check_role
from app.models.task import Task
from app.models.user import User
from app.models.project import Project
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut, TaskStatusUpdate
from app.services.gamification_service import GamificationService

router = APIRouter()

def verify_task_references(db: Session, assigned_to_id: Optional[int], project_id: Optional[int]):
    """
    Data Integrity Verification Helper:
    Ensures assigned_to_id exists in User table and project_id exists in Project table.
    Prevents orphaned references and raises clean 400 Bad Request errors.
    """
    if assigned_to_id is not None:
        user = db.get(User, assigned_to_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Data Integrity Error: Assigned user ID '{assigned_to_id}' does not exist."
            )
    if project_id is not None:
        project = db.get(Project, project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Data Integrity Error: Target project ID '{project_id}' does not exist."
            )

@router.get("/", response_model=list[TaskOut])
def list_tasks(
    search: Optional[str] = Query(None, description="Search tasks by title or description"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Todo, In Progress, Completed)"),
    assigned_to_id: Optional[int] = Query(None, description="Filter by assigned user ID"),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List tasks with query search and filters. Accessible by all authenticated users.
    """
    query = select(Task)
    if status_filter:
        query = query.where(Task.status == status_filter)
    if assigned_to_id:
        query = query.where(Task.assigned_to_id == assigned_to_id)
    if project_id:
        query = query.where(Task.project_id == project_id)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Task.title.ilike(search_term),
                Task.description.ilike(search_term)
            )
        )
    return db.scalars(query).all()

@router.get("/{task_id}", response_model=TaskOut)
def get_task_detail(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information for a specific task.
    """
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return task

@router.post("/", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    schema: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Manager"]))
):
    """
    Assign a new task to an employee. (Managers and Admins only)
    Performs strict Data Integrity Verification on referenced entities.
    """
    verify_task_references(db, schema.assigned_to_id, schema.project_id)

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

@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    schema: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Full update of task details.
    Allowed: Admin, Manager, or Assigned Employee.
    Verifies reference integrity and triggers XP award if status changes to Completed.
    """
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    is_authorized = (
        current_user.role in ["Admin", "Manager"]
        or (current_user.role == "Employee" and task.assigned_to_id == current_user.id)
    )
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Operational tier lacks credentials to modify this task."
        )

    verify_task_references(db, schema.assigned_to_id, schema.project_id)

    if schema.title is not None:
        task.title = schema.title
    if schema.description is not None:
        task.description = schema.description
    if schema.xp is not None:
        task.xp = schema.xp
    if schema.assigned_to_id is not None:
        task.assigned_to_id = schema.assigned_to_id
    if schema.project_id is not None:
        task.project_id = schema.project_id
    if schema.due_date is not None:
        task.due_date = schema.due_date

    if schema.status is not None and schema.status != task.status:
        if schema.status not in ["Todo", "In Progress", "Completed"]:
            raise HTTPException(status_code=400, detail="Invalid status specified.")
        if schema.status == "Completed" and task.status != "Completed" and task.assigned_to_id:
            assigned_user = db.get(User, task.assigned_to_id)
            if assigned_user:
                GamificationService.award_xp(db=db, user=assigned_user, xp_amount=task.xp)
        task.status = schema.status

    db.commit()
    db.refresh(task)
    return task

@router.put("/{task_id}/status", response_model=TaskOut)
def update_task_status(
    task_id: int,
    schema: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update the status of a task.
    Allowed: Assigned Employee, Manager, or Admin.
    """
    if schema.status not in ["Todo", "In Progress", "Completed"]:
        raise HTTPException(status_code=400, detail="Invalid status specified.")
    
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    is_authorized = (
        current_user.role in ["Admin", "Manager"]
        or (current_user.role == "Employee" and task.assigned_to_id == current_user.id)
    )
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Operational tier lacks credentials to modify this task assignment."
        )

    if schema.status == "Completed" and task.status != "Completed" and task.assigned_to_id:
        assigned_user = db.get(User, task.assigned_to_id)
        if assigned_user:
            GamificationService.award_xp(db=db, user=assigned_user, xp_amount=task.xp)
            
    task.status = schema.status
    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Manager"]))
):
    """
    Delete a task. (Admin and Manager only)
    """
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    db.delete(task)
    db.commit()
    return None
