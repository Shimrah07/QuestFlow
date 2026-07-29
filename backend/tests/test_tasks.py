from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.user import User
from tests.conftest import get_auth_headers

def test_task_creation_by_manager(client: TestClient, manager_user: User, employee_user1: User):
    headers = get_auth_headers(manager_user)
    payload = {
        "title": "Database Optimization",
        "description": "Optimize indexes",
        "xp": 250,
        "assigned_to_id": employee_user1.id
    }
    response = client.post("/api/v1/tasks/", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Database Optimization"
    assert data["xp"] == 250
    assert data["assigned_to_id"] == employee_user1.id

def test_employee_cannot_create_task(client: TestClient, employee_user1: User):
    headers = get_auth_headers(employee_user1)
    payload = {
        "title": "Unauthorized Task Creation",
        "xp": 100
    }
    response = client.post("/api/v1/tasks/", json=payload, headers=headers)
    assert response.status_code == 403

def test_task_data_integrity_verification_invalid_user_or_project(client: TestClient, manager_user: User):
    headers = get_auth_headers(manager_user)
    # Invalid user reference -> 400 Bad Request
    payload = {
        "title": "Task with Invalid User",
        "xp": 100,
        "assigned_to_id": 99999
    }
    response = client.post("/api/v1/tasks/", json=payload, headers=headers)
    assert response.status_code == 400
    assert "Data Integrity Error" in response.json()["detail"]

def test_task_update_authorization_assigned_employee(client: TestClient, db_session: Session, manager_user: User, employee_user1: User):
    # Manager creates task assigned to employee 1
    task = Task(title="Employee 1 Task", xp=200, status="Todo", assigned_to_id=employee_user1.id)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    # Employee 1 updates task status -> Success (200)
    emp1_headers = get_auth_headers(employee_user1)
    response = client.put(f"/api/v1/tasks/{task.id}/status", json={"status": "In Progress"}, headers=emp1_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "In Progress"

def test_task_update_authorization_unassigned_employee_forbidden(client: TestClient, db_session: Session, employee_user1: User, employee_user2: User):
    # Task assigned to employee 1
    task = Task(title="Employee 1 Private Task", xp=200, status="Todo", assigned_to_id=employee_user1.id)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    # Employee 2 attempts to update employee 1's task -> Forbidden (403)
    emp2_headers = get_auth_headers(employee_user2)
    response = client.put(f"/api/v1/tasks/{task.id}/status", json={"status": "Completed"}, headers=emp2_headers)
    assert response.status_code == 403
    assert "Access Denied" in response.json()["detail"]

def test_task_full_edit_and_delete(client: TestClient, db_session: Session, manager_user: User):
    headers = get_auth_headers(manager_user)
    task = Task(title="Task to Edit", xp=100, status="Todo")
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    # Edit task
    edit_payload = {"title": "Edited Task Title", "xp": 300, "status": "In Progress"}
    res_edit = client.put(f"/api/v1/tasks/{task.id}", json=edit_payload, headers=headers)
    assert res_edit.status_code == 200
    assert res_edit.json()["title"] == "Edited Task Title"
    assert res_edit.json()["xp"] == 300

    # Delete task
    res_delete = client.delete(f"/api/v1/tasks/{task.id}", headers=headers)
    assert res_delete.status_code == 204

def test_server_side_xp_awarding_on_task_completion(client: TestClient, db_session: Session, employee_user1: User):
    # Initial XP and Level
    assert employee_user1.points == 0
    assert employee_user1.level == 1

    # Task assigned to employee 1 with 600 XP
    task = Task(title="Big Migration Task", xp=600, status="In Progress", assigned_to_id=employee_user1.id)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    # Complete task
    emp1_headers = get_auth_headers(employee_user1)
    response = client.put(f"/api/v1/tasks/{task.id}/status", json={"status": "Completed"}, headers=emp1_headers)
    assert response.status_code == 200

    # Verify XP and Level increased in database
    db_session.refresh(employee_user1)
    assert employee_user1.points == 600
    assert employee_user1.level == 2
