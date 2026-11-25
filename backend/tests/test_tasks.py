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

    # Verify XP and Level increased in database: 600 for the task, plus the weekly
    # "Earn 500 XP" quest bonus (+75) that this single task also completes.
    db_session.refresh(employee_user1)
    assert employee_user1.points == 600 + 75
    assert employee_user1.level == 2


def _seed_tasks_for_visibility(db_session: Session, employee_user1: User, employee_user2: User):
    tasks = [
        Task(title="Emp1 first", xp=100, status="Todo", assigned_to_id=employee_user1.id),
        Task(title="Emp1 second", xp=150, status="In Progress", assigned_to_id=employee_user1.id),
        Task(title="Emp2 only", xp=200, status="Todo", assigned_to_id=employee_user2.id),
        Task(title="Unassigned", xp=50, status="Todo", assigned_to_id=None),
    ]
    db_session.add_all(tasks)
    db_session.commit()
    for t in tasks:
        db_session.refresh(t)
    return tasks


def test_employee_lists_only_their_own_tasks(client: TestClient, db_session: Session, employee_user1: User, employee_user2: User):
    _seed_tasks_for_visibility(db_session, employee_user1, employee_user2)
    response = client.get("/api/v1/tasks/", headers=get_auth_headers(employee_user1))
    assert response.status_code == 200
    titles = sorted(t["title"] for t in response.json())
    assert titles == ["Emp1 first", "Emp1 second"]


def test_employee_filters_cannot_widen_their_view(client: TestClient, db_session: Session, employee_user1: User, employee_user2: User):
    _seed_tasks_for_visibility(db_session, employee_user1, employee_user2)
    # Asking for another person's tasks returns nothing rather than leaking them.
    response = client.get(f"/api/v1/tasks/?assigned_to_id={employee_user2.id}", headers=get_auth_headers(employee_user1))
    assert response.status_code == 200
    assert response.json() == []


def test_manager_and_admin_still_see_every_task(client: TestClient, db_session: Session, manager_user: User, admin_user: User, employee_user1: User, employee_user2: User):
    _seed_tasks_for_visibility(db_session, employee_user1, employee_user2)
    for user in (manager_user, admin_user):
        response = client.get("/api/v1/tasks/", headers=get_auth_headers(user))
        assert response.status_code == 200
        assert len(response.json()) == 4


def test_employee_cannot_open_someone_elses_task(client: TestClient, db_session: Session, employee_user1: User, employee_user2: User):
    tasks = _seed_tasks_for_visibility(db_session, employee_user1, employee_user2)
    own, other = tasks[0], tasks[2]
    headers = get_auth_headers(employee_user1)
    assert client.get(f"/api/v1/tasks/{own.id}", headers=headers).status_code == 200
    response = client.get(f"/api/v1/tasks/{other.id}", headers=headers)
    assert response.status_code == 403
    assert "Access Denied" in response.json()["detail"]


def test_employee_cannot_raise_xp_or_reassign_their_task(client: TestClient, db_session: Session, employee_user1: User, employee_user2: User):
    task = Task(title="Small fix", xp=50, status="In Progress", assigned_to_id=employee_user1.id)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    headers = get_auth_headers(employee_user1)

    # The exploit: bump XP and complete in one request.
    response = client.put(f"/api/v1/tasks/{task.id}", json={"xp": 5000, "status": "Completed"}, headers=headers)
    assert response.status_code == 403
    assert "only change a task's status" in response.json()["detail"]

    response = client.put(f"/api/v1/tasks/{task.id}", json={"assigned_to_id": employee_user2.id}, headers=headers)
    assert response.status_code == 403

    db_session.refresh(task)
    db_session.refresh(employee_user1)
    assert task.xp == 50
    assert task.status == "In Progress"
    assert task.assigned_to_id == employee_user1.id
    assert employee_user1.points == 0


def test_employee_can_still_complete_with_a_status_only_update(client: TestClient, db_session: Session, employee_user1: User):
    task = Task(title="Status only", xp=120, status="In Progress", assigned_to_id=employee_user1.id)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    response = client.put(f"/api/v1/tasks/{task.id}", json={"status": "Completed"}, headers=get_auth_headers(employee_user1))
    assert response.status_code == 200
    db_session.refresh(employee_user1)
    assert employee_user1.points == 120


def test_completed_task_cannot_be_reopened_to_farm_xp(client: TestClient, db_session: Session, manager_user: User, employee_user1: User):
    task = Task(title="Pay once", xp=300, status="In Progress", assigned_to_id=employee_user1.id)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    emp = get_auth_headers(employee_user1)
    mgr = get_auth_headers(manager_user)

    assert client.put(f"/api/v1/tasks/{task.id}/status", json={"status": "Completed"}, headers=emp).status_code == 200

    # Reopening is refused on both endpoints, for employees and managers alike.
    for headers in (emp, mgr):
        r1 = client.put(f"/api/v1/tasks/{task.id}/status", json={"status": "Todo"}, headers=headers)
        r2 = client.put(f"/api/v1/tasks/{task.id}", json={"status": "In Progress"}, headers=headers)
        assert r1.status_code == 400 and r2.status_code == 400
        assert "locked" in r1.json()["detail"]

    # Completing again is a no-op: no second payout.
    assert client.put(f"/api/v1/tasks/{task.id}/status", json={"status": "Completed"}, headers=emp).status_code == 200
    db_session.refresh(employee_user1)
    assert employee_user1.points == 300


def test_manager_can_still_edit_an_open_tasks_xp(client: TestClient, db_session: Session, manager_user: User, employee_user1: User):
    task = Task(title="Re-scoped", xp=100, status="Todo", assigned_to_id=employee_user1.id)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    response = client.put(f"/api/v1/tasks/{task.id}", json={"xp": 250}, headers=get_auth_headers(manager_user))
    assert response.status_code == 200
    assert response.json()["xp"] == 250
