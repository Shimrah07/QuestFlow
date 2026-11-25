from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.task import Task
from app.models.user import User
from tests.conftest import get_auth_headers

API = "/api/v1/notifications/"


def titles(client: TestClient, user: User) -> list[str]:
    response = client.get(API, headers=get_auth_headers(user))
    assert response.status_code == 200
    return [n["title"] for n in response.json()]


def stored(db: Session, user: User) -> list[Notification]:
    return list(db.scalars(select(Notification).where(Notification.user_id == user.id)))


# ---------- tasks ----------

def test_assignee_is_told_about_a_new_task_and_the_manager_is_not(client: TestClient, db_session: Session, manager_user: User, employee_user1: User):
    response = client.post("/api/v1/tasks/", json={"title": "Write release notes", "xp": 150, "assigned_to_id": employee_user1.id}, headers=get_auth_headers(manager_user))
    assert response.status_code == 201
    notes = client.get(API, headers=get_auth_headers(employee_user1)).json()
    assert notes[0]["title"] == "New task assigned to you"
    assert notes[0]["description"] == "Write release notes · 150 XP"
    assert notes[0]["link"] == "/tasks" and notes[0]["is_read"] is False
    assert titles(client, manager_user) == []


def test_reassigning_a_task_tells_the_new_assignee(client: TestClient, db_session: Session, manager_user: User, employee_user1: User, employee_user2: User):
    task = client.post("/api/v1/tasks/", json={"title": "Audit", "xp": 100, "assigned_to_id": employee_user1.id}, headers=get_auth_headers(manager_user)).json()
    client.put(f"/api/v1/tasks/{task['id']}", json={"assigned_to_id": employee_user2.id}, headers=get_auth_headers(manager_user))
    assert "New task assigned to you" in titles(client, employee_user2)


def test_reviewers_hear_when_an_employee_finishes_and_the_employee_levels_up(client: TestClient, db_session: Session, manager_user: User, admin_user: User, employee_user1: User):
    task = Task(title="Big migration", xp=600, status="In Progress", assigned_to_id=employee_user1.id)
    db_session.add(task)
    db_session.commit()
    client.put(f"/api/v1/tasks/{task.id}/status", json={"status": "Completed"}, headers=get_auth_headers(employee_user1))

    for reviewer in (manager_user, admin_user):
        notes = client.get(API, headers=get_auth_headers(reviewer)).json()
        assert notes[0]["title"] == "EmployeeOne finished a task"
        assert notes[0]["description"] == "Big migration · +600 XP"
    # The employee is not told they finished it, but does get the level-up (and the weekly
    # "Earn 500 XP" quest this 600 XP task completes).
    mine = titles(client, employee_user1)
    assert "You reached level 2" in mine
    assert "Quest complete: Earn 500 XP" in mine
    assert not any("finished a task" in t for t in mine)


def test_assignee_hears_when_a_manager_marks_their_task_done(client: TestClient, db_session: Session, manager_user: User, admin_user: User, employee_user1: User):
    task = Task(title="Fix login", xp=50, status="In Progress", assigned_to_id=employee_user1.id)
    db_session.add(task)
    db_session.commit()
    client.put(f"/api/v1/tasks/{task.id}/status", json={"status": "Completed"}, headers=get_auth_headers(manager_user))
    assert titles(client, employee_user1) == ["Your task was marked done"]
    assert titles(client, admin_user) == ["Task marked done"]
    assert titles(client, manager_user) == []  # never notified about your own action


def test_deleting_a_task_removes_its_notifications(client: TestClient, db_session: Session, manager_user: User, employee_user1: User):
    task = client.post("/api/v1/tasks/", json={"title": "Temp", "xp": 20, "assigned_to_id": employee_user1.id}, headers=get_auth_headers(manager_user)).json()
    assert len(stored(db_session, employee_user1)) == 1
    client.delete(f"/api/v1/tasks/{task['id']}", headers=get_auth_headers(manager_user))
    db_session.expire_all()
    assert stored(db_session, employee_user1) == []


# ---------- claims ----------

def test_reviewers_are_asked_to_review_a_new_claim_but_not_the_submitter(client: TestClient, db_session: Session, manager_user: User, admin_user: User, employee_user1: User):
    client.post("/api/v1/expenses/", json={"title": "Taxi", "category": "Travel", "amount": 18.2}, headers=get_auth_headers(employee_user1))
    for reviewer in (manager_user, admin_user):
        notes = client.get(API, headers=get_auth_headers(reviewer)).json()
        assert notes[0]["title"] == "New claim to review"
        assert notes[0]["description"] == "EmployeeOne · Taxi · $18.20"
        assert notes[0]["link"] == "/approvals"
    assert titles(client, employee_user1) == []


def test_a_managers_own_claim_goes_to_other_reviewers_only(client: TestClient, db_session: Session, manager_user: User, admin_user: User):
    client.post("/api/v1/expenses/", json={"title": "Hotel", "category": "Travel", "amount": 180}, headers=get_auth_headers(manager_user))
    assert titles(client, manager_user) == []
    assert titles(client, admin_user) == ["New claim to review"]


def test_decision_tells_the_submitter_and_clears_unread_review_requests(client: TestClient, db_session: Session, manager_user: User, admin_user: User, employee_user1: User):
    claim = client.post("/api/v1/expenses/", json={"title": "Lunch", "category": "Meals", "amount": 31.5}, headers=get_auth_headers(employee_user1)).json()
    client.put(f"/api/v1/expenses/{claim['id']}/status", json={"status": "Approved"}, headers=get_auth_headers(manager_user))

    notes = client.get(API, headers=get_auth_headers(employee_user1)).json()
    assert notes[0]["title"] == "Claim approved"
    assert notes[0]["description"] == "Lunch · $31.50"
    assert notes[0]["type"] == "success"
    # The admin's "to review" note for this claim is gone now that it's decided.
    assert titles(client, admin_user) == []


def test_rejection_is_a_warning(client: TestClient, db_session: Session, manager_user: User, employee_user1: User):
    claim = client.post("/api/v1/expenses/", json={"title": "Gadget", "category": "Equipment", "amount": 999}, headers=get_auth_headers(employee_user1)).json()
    client.put(f"/api/v1/expenses/{claim['id']}/status", json={"status": "Rejected"}, headers=get_auth_headers(manager_user))
    notes = client.get(API, headers=get_auth_headers(employee_user1)).json()
    assert (notes[0]["title"], notes[0]["type"]) == ("Claim rejected", "warning")


# ---------- deadlines ----------

def test_deadline_reminders_are_generated_once_and_skip_old_overdue_work(client: TestClient, db_session: Session, employee_user1: User):
    now = datetime.now()
    db_session.add_all([
        Task(title="Due soon", xp=10, status="Todo", assigned_to_id=employee_user1.id, due_date=now + timedelta(hours=6)),
        Task(title="Just late", xp=10, status="In Progress", assigned_to_id=employee_user1.id, due_date=now - timedelta(hours=10)),
        Task(title="Late for weeks", xp=10, status="Todo", assigned_to_id=employee_user1.id, due_date=now - timedelta(days=20)),
        Task(title="Done anyway", xp=10, status="Completed", assigned_to_id=employee_user1.id, due_date=now + timedelta(hours=2)),
        Task(title="Next month", xp=10, status="Todo", assigned_to_id=employee_user1.id, due_date=now + timedelta(days=30)),
    ])
    db_session.commit()

    first = client.get(API, headers=get_auth_headers(employee_user1)).json()
    assert sorted((n["title"], n["description"].split(" was")[0]) for n in first) == [("Due within 24 hours", "Due soon"), ("Task overdue", "Just late")]
    second = client.get(API, headers=get_auth_headers(employee_user1)).json()
    assert len(second) == 2  # no duplicates on later loads


# ---------- account ----------

def test_new_accounts_get_a_welcome_note(client: TestClient, db_session: Session):
    response = client.post("/api/v1/auth/register", json={"email": "newbie@gmail.com", "first_name": "Newbie", "password": "Secure@123", "role": "Employee"})
    assert response.status_code == 201
    user = db_session.get(User, response.json()["id"])
    assert [n.title for n in stored(db_session, user)] == ["Welcome to QuestFlow, Newbie"]


# ---------- endpoints ----------

def test_read_state_count_and_clear(client: TestClient, db_session: Session, manager_user: User, employee_user1: User):
    for title in ("A", "B", "C"):
        client.post("/api/v1/tasks/", json={"title": title, "xp": 10, "assigned_to_id": employee_user1.id}, headers=get_auth_headers(manager_user))
    headers = get_auth_headers(employee_user1)
    assert client.get(API + "unread-count", headers=headers).json() == {"count": 3}

    first_id = client.get(API, headers=headers).json()[0]["id"]
    assert client.put(f"{API}{first_id}/read", headers=headers).json()["is_read"] is True
    assert client.get(API + "unread-count", headers=headers).json() == {"count": 2}

    assert client.put(API + "read-all", headers=headers).json() == {"count": 0}
    assert all(n["is_read"] for n in client.get(API, headers=headers).json())

    assert client.delete(API, headers=headers).status_code == 204
    assert client.get(API, headers=headers).json() == []


def test_people_cannot_touch_each_others_notifications(client: TestClient, db_session: Session, manager_user: User, employee_user1: User, employee_user2: User):
    client.post("/api/v1/tasks/", json={"title": "Private", "xp": 10, "assigned_to_id": employee_user1.id}, headers=get_auth_headers(manager_user))
    note_id = client.get(API, headers=get_auth_headers(employee_user1)).json()[0]["id"]
    assert client.put(f"{API}{note_id}/read", headers=get_auth_headers(employee_user2)).status_code == 404
    assert client.get(API, headers=get_auth_headers(employee_user2)).json() == []
    # Clearing only clears your own list.
    client.delete(API, headers=get_auth_headers(employee_user2))
    assert len(client.get(API, headers=get_auth_headers(employee_user1)).json()) == 1


def test_timestamps_are_sent_with_a_timezone(client: TestClient, db_session: Session, manager_user: User, employee_user1: User):
    client.post("/api/v1/tasks/", json={"title": "TZ", "xp": 10, "assigned_to_id": employee_user1.id}, headers=get_auth_headers(manager_user))
    created = client.get(API, headers=get_auth_headers(employee_user1)).json()[0]["created_at"]
    assert created.endswith("+00:00")


def test_notifications_require_sign_in(client: TestClient):
    assert client.get(API).status_code == 401
