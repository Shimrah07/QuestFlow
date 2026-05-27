from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.deps import get_db, check_role
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectOut

router = APIRouter(dependencies=[Depends(check_role(["Admin"]))])

@router.get("/", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    """
    List all active projects. (Admin only)
    """
    return db.scalars(select(Project)).all()

@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(schema: ProjectCreate, db: Session = Depends(get_db)):
    """
    Create a new project. (Admin only)
    """
    project = Project(
        name=schema.name,
        description=schema.description
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """
    Delete a project. (Admin only)
    """
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    db.delete(project)
    db.commit()
    return None
