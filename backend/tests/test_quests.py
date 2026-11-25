from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.quest import Quest
from app.models.task import Task
from app.models.user import User
from app.models.notification import Notification
from app.services.quest_service import split_reward
from tests.conftest import get_auth_headers

API = "/api/v1/quests/"


def board(client: TestClient, user: User) -> dict:
    response = client.get(API, headers=get_auth_headers(user))
    assert response.status_code == 200
    return response.json()


def weekly(client: TestClient, user: User, code: str) -> dict:
    return next(q for q in board(client, user)["weekly"] if q["code"] == code)


def complete(client: TestClient, db: Session, user: User, xp: int = 10, due: datetime | None = None, project_id: int | None = None) -> Task:
    task = Task(title=f"Task {datetime.now().timestamp()}", xp=xp, status="In Progress", assigned_to_id=user.id, due_date=due, project_id=project_id)
    db.add(task)
    db.commit()
    db.refresh(task)
    response = client.put(f"/api/v1/tasks/{task.id}/status", json={"status": "Completed"}, headers=get_auth_headers(user))
    assert response.status_code == 200
    return task


def points(db: Session, user: User) -> int:
    db.expire_all()
    return db.get(User, user.id).points


def note_titles(db: Session, user: User) -> list[str]:
    return [n.title for n in db.scalars(select(Notification).where(Notification.user_id == user.id))]


def make_project(db: Session, name: str = "Website Revamp", status: str = "Active") -> Project:
    project = Project(name=name, description="", status=status)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def create_team_quest(client: TestClient, manager: User, project: Project, target: int = 3, reward: int = 300, days: int = 5):
    return client.post(
        API + "team",
        json={"project_id": project.id, "target": target, "reward_xp": reward, "ends_at": (datetime.now() + timedelta(days=days)).isoformat()},
        headers=get_auth_headers(manager),
    )


# ---------- weekly quests ----------

def test_weekly_quests_are_created_once_per_week(client: TestClient, db_session: Session, employee_user1: User):
    first = board(client, employee_user1)
    second = board(client, employee_user1)
    assert [q["code"] for q in first["weekly"]] == ["finish-3", "beat-deadline", "earn-500"]
    assert [q["id"] for q in first["weekly"]] == [q["id"] for q in second["weekly"]]
    assert len(db_session.scalars(select(Quest).where(Quest.kind == "weekly")).all()) == 3


def test_finishing_three_tasks_pays_the_bonus_exactly_once(client: TestClient, db_session: Session, employee_user1: User):
    for _ in range(2):
        complete(client, db_session, employee_user1)
    assert weekly(client, employee_user1, "finish-3")["progress"] == 2
    assert points(db_session, employee_user1) == 20

    complete(client, db_session, employee_user1)
    quest = weekly(client, employee_user1, "finish-3")
    assert quest["completed"] is True and quest["reward_paid"] == 100 and quest["progress"] == 3
    assert points(db_session, employee_user1) == 30 + 100
    assert "Quest complete: Finish 3 tasks" in note_titles(db_session, employee_user1)

    complete(client, db_session, employee_user1)  # a fourth task earns its own XP but no second bonus
    assert points(db_session, employee_user1) == 40 + 100


def test_beat_a_deadline_counts_only_on_time_work(client: TestClient, db_session: Session, employee_user1: User):
    complete(client, db_session, employee_user1, due=datetime.now() - timedelta(hours=2))  # late
    complete(client, db_session, employee_user1)  # no due date
    assert weekly(client, employee_user1, "beat-deadline")["completed"] is False
    complete(client, db_session, employee_user1, due=datetime.now() + timedelta(days=1))  # on time
    assert weekly(client, employee_user1, "beat-deadline")["completed"] is True
    assert points(db_session, employee_user1) == 30 + 50 + 100  # beat-deadline and, with 3 tasks, finish-3


def test_earning_500_xp_pays_and_can_level_you_up(client: TestClient, db_session: Session, employee_user1: User):
    complete(client, db_session, employee_user1, xp=500)
    assert weekly(client, employee_user1, "earn-500")["completed"] is True
    assert points(db_session, employee_user1) == 575
    assert "You reached level 2" in note_titles(db_session, employee_user1)


def test_weekly_progress_is_personal(client: TestClient, db_session: Session, employee_user1: User, employee_user2: User):
    complete(client, db_session, employee_user1)
    assert weekly(client, employee_user1, "finish-3")["progress"] == 1
    assert weekly(client, employee_user2, "finish-3")["progress"] == 0


# ---------- team quests ----------

def test_only_managers_and_admins_create_team_quests_and_input_is_checked(client: TestClient, db_session: Session, manager_user: User, employee_user1: User):
    project = make_project(db_session)
    assert create_team_quest(client, employee_user1, project).status_code == 403

    created = create_team_quest(client, manager_user, project, target=6, reward=300)
    assert created.status_code == 201
    assert created.json()["title"] == "Finish 6 Website Revamp tasks"

    archived = make_project(db_session, "Old CRM", status="Archived")
    assert create_team_quest(client, manager_user, archived).status_code == 400
    assert create_team_quest(client, manager_user, project, days=-1).status_code == 400
    assert create_team_quest(client, manager_user, project, days=120).status_code == 400
    assert create_team_quest(client, manager_user, project, target=0).status_code == 422


def test_project_members_hear_about_a_new_team_quest(client: TestClient, db_session: Session, manager_user: User, employee_user1: User, employee_user2: User):
    project = make_project(db_session)
    db_session.add(Task(title="Existing work", xp=10, status="Todo", assigned_to_id=employee_user1.id, project_id=project.id))
    db_session.commit()
    create_team_quest(client, manager_user, project)
    assert note_titles(db_session, employee_user1) == ["New team quest: Finish 3 Website Revamp tasks"]
    assert note_titles(db_session, employee_user2) == []  # not on that project


def test_team_quest_splits_the_bonus_by_contribution_and_pays_once(client: TestClient, db_session: Session, manager_user: User, employee_user1: User, employee_user2: User):
    project = make_project(db_session)
    other = make_project(db_session, "Mobile App")
    quest_id = create_team_quest(client, manager_user, project, target=3, reward=300).json()["id"]

    complete(client, db_session, employee_user1, project_id=project.id)
    complete(client, db_session, employee_user2, project_id=other.id)  # different project: no credit
    complete(client, db_session, employee_user1, project_id=project.id)
    mid = next(q for q in board(client, employee_user1)["team"] if q["id"] == quest_id)
    assert (mid["progress"], mid["my_contribution"], mid["status"]) == (2, 2, "active")

    complete(client, db_session, employee_user2, project_id=project.id)  # reaches the target
    done = next(q for q in board(client, employee_user1)["team"] if q["id"] == quest_id)
    assert done["status"] == "completed"
    assert [(c["name"], c["count"], c["reward_paid"]) for c in done["contributors"]] == [("EmployeeOne", 2, 200), ("EmployeeTwo", 1, 100)]
    assert points(db_session, employee_user1) == 20 + 200
    assert points(db_session, employee_user2) == 20 + 100
    assert "Team quest complete: Finish 3 Website Revamp tasks" in note_titles(db_session, employee_user1)
    assert "Team quest complete: Finish 3 Website Revamp tasks" in note_titles(db_session, manager_user)

    # After completion the team quest pays nothing more; only the task's own XP is added.
    # (This is EmployeeTwo's third task this week, so the weekly "Finish 3 tasks" bonus lands
    # here too; check the team part by comparing before and after a further task.)
    complete(client, db_session, employee_user2, project_id=project.id)
    before = points(db_session, employee_user2)
    assert before == 30 + 100 + 100  # three tasks, team share, weekly finish-3
    complete(client, db_session, employee_user2, project_id=project.id)
    assert points(db_session, employee_user2) == before + 10


def test_expired_and_cancelled_quests_stop_counting(client: TestClient, db_session: Session, manager_user: User, admin_user: User, employee_user1: User):
    project = make_project(db_session)
    expired_id = create_team_quest(client, manager_user, project, target=1, reward=100).json()["id"]
    quest = db_session.get(Quest, expired_id)
    quest.ends_at = datetime.now() - timedelta(minutes=1)
    db_session.commit()
    assert next(q for q in board(client, employee_user1)["team"] if q["id"] == expired_id)["status"] == "expired"

    cancelled_id = create_team_quest(client, manager_user, project, target=1, reward=100).json()["id"]
    assert client.delete(f"{API}{cancelled_id}", headers=get_auth_headers(manager_user)).json()["status"] == "cancelled"

    complete(client, db_session, employee_user1, project_id=project.id)
    assert points(db_session, employee_user1) == 10  # neither quest paid anything


def test_only_the_creator_or_an_admin_can_cancel(client: TestClient, db_session: Session, manager_user: User, admin_user: User, employee_user1: User):
    project = make_project(db_session)
    other_manager = User(email="m2@gmail.com", first_name="Priya", password_hash="x", role="Manager", points=0, level=1, is_active=True)
    db_session.add(other_manager)
    db_session.commit()
    quest_id = create_team_quest(client, manager_user, project).json()["id"]

    assert client.delete(f"{API}{quest_id}", headers=get_auth_headers(employee_user1)).status_code == 403
    assert client.delete(f"{API}{quest_id}", headers=get_auth_headers(other_manager)).status_code == 403
    mine = next(q for q in board(client, manager_user)["team"] if q["id"] == quest_id)
    assert mine["can_cancel"] is True
    assert next(q for q in board(client, other_manager)["team"] if q["id"] == quest_id)["can_cancel"] is False
    assert client.delete(f"{API}{quest_id}", headers=get_auth_headers(admin_user)).status_code == 200
    assert client.delete(f"{API}{quest_id}", headers=get_auth_headers(admin_user)).status_code == 400  # already cancelled


def test_quests_require_sign_in(client: TestClient):
    assert client.get(API).status_code == 401


# ---------- reward split ----------

def test_split_reward_is_proportional_and_adds_up_exactly():
    assert split_reward(300, {1: 2, 2: 1}) == {1: 200, 2: 100}
    shares = split_reward(100, {1: 1, 2: 1, 3: 1})
    assert sum(shares.values()) == 100 and sorted(shares.values()) == [33, 33, 34]
    assert split_reward(50, {}) == {}
