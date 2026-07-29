from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.user import User
from tests.conftest import get_auth_headers

def test_project_crud_and_soft_delete(client: TestClient, db_session: Session, admin_user: User, manager_user: User):
    admin_headers = get_auth_headers(admin_user)
    mgr_headers = get_auth_headers(manager_user)

    # 1. Create project
    res_create = client.post("/api/v1/projects/", json={"name": "New Alpha Project", "description": "Scope details"}, headers=mgr_headers)
    assert res_create.status_code == 201
    prj_id = res_create.json()["id"]

    # 2. Get detail
    res_detail = client.get(f"/api/v1/projects/{prj_id}", headers=mgr_headers)
    assert res_detail.status_code == 200
    assert res_detail.json()["name"] == "New Alpha Project"

    # 3. Edit project
    res_edit = client.put(f"/api/v1/projects/{prj_id}", json={"name": "Updated Alpha Project", "description": "Updated scope"}, headers=mgr_headers)
    assert res_edit.status_code == 200
    assert res_edit.json()["name"] == "Updated Alpha Project"

    # 4. Soft Delete / Archive project (Admin only)
    res_archive = client.delete(f"/api/v1/projects/{prj_id}", headers=admin_headers)
    assert res_archive.status_code == 200
    assert res_archive.json()["status"] == "Archived"

    # Verify project still exists in DB with status "Archived"
    project_in_db = db_session.get(Project, prj_id)
    assert project_in_db is not None
    assert project_in_db.status == "Archived"
