from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from app.core.deps import get_db, check_role
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut

router = APIRouter()

@router.get("/", response_model=list[ProjectOut])
def list_projects(
    search: Optional[str] = Query(None, description="Filter projects by name or description"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Active, Archived)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Manager"]))
):
    """
    List active/archived projects with search and filter support. (Admin and Manager)
    """
    query = select(Project)
    if status_filter:
        query = query.where(Project.status == status_filter)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Project.name.ilike(search_term),
                Project.description.ilike(search_term)
            )
        )
    return db.scalars(query).all()

@router.get("/{project_id}", response_model=ProjectOut)
def get_project_detail(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Manager"]))
):
    """
    Get detailed information for a specific project. (Admin and Manager)
    """
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project

@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    schema: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Manager"]))
):
    """
    Create a new project. (Admin and Manager)
    """
    project = Project(
        name=schema.name,
        description=schema.description
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    schema: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Manager"]))
):
    """
    Update project details (name, description, status). (Admin and Manager)
    """
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    if schema.name is not None:
        project.name = schema.name
    if schema.description is not None:
        project.description = schema.description
    if schema.status is not None:
        if schema.status not in ["Active", "Archived"]:
            raise HTTPException(status_code=400, detail="Invalid status specified. Must be 'Active' or 'Archived'.")
        project.status = schema.status

    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}", response_model=ProjectOut)
def archive_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin"]))
):
    """
    Soft-delete / Archive a project. (Admin only)
    Sets status to 'Archived' to preserve task relationships and data integrity.
    """
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    
    project.status = "Archived"
    db.commit()
    db.refresh(project)
    return project
