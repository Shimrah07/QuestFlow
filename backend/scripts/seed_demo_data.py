"""
Seed realistic demo data (users, projects, ~3 months of tasks and expenses).

Run from the backend directory:
  .\\venv\\Scripts\\python.exe scripts/seed_demo_data.py            # seed an empty database
  .\\venv\\Scripts\\python.exe scripts/seed_demo_data.py --reset    # drop all tables and reseed (local only)

On Render it runs before the server starts (see docs/architecture.md, Deployment):
  python scripts/seed_demo_data.py --allow-remote; uvicorn app.main:app --host 0.0.0.0 --port $PORT

Safety:
- Refuses a non-local database unless --allow-remote is passed, because demo accounts use
  publicly documented passwords.
- --reset is refused on any non-local database, even with --allow-remote.
- Seeds only when the database has no projects; otherwise it exits successfully without changes,
  so it is safe to run on every start. Existing accounts are kept and never modified.
"""
import argparse
import os
import random
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import func, select
from sqlalchemy.engine import make_url

from app.core.security import get_password_hash
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.expense import Expense
from app.models.notification import Notification  # noqa: F401  (registers the notifications table for --reset)
from app.models.project import Project
from app.models.quest import Quest, QuestProgress
from app.models.task import Task
from app.models.user import RefreshToken, User  # noqa: F401  (registers refresh_tokens table)

XP_PER_LEVEL = 500
DAYS_OF_HISTORY = 90
rng = random.Random(42)  # deterministic: same data on every run
now = datetime.now().replace(microsecond=0)

USERS = [
    # email, first_name, password, role, is_active
    ("admin@gmail.com", "Admin", "Admin@123", "Admin", True),
    ("manager@gmail.com", "Manager", "Manager@123", "Manager", True),
    ("employee@gmail.com", "Employee", "Employee@123", "Employee", True),
    ("priya@gmail.com", "Priya", "Demo@1234", "Manager", True),
    ("rohan@gmail.com", "Rohan", "Demo@1234", "Employee", True),
    ("aisha@gmail.com", "Aisha", "Demo@1234", "Employee", True),
    ("arjun@gmail.com", "Arjun", "Demo@1234", "Employee", True),
    ("sara@gmail.com", "Sara", "Demo@1234", "Employee", True),
    ("meera@gmail.com", "Meera", "Demo@1234", "Employee", True),
    ("kabir@gmail.com", "Kabir", "Demo@1234", "Employee", False),  # deactivated account for admin demo
]

PROJECTS = {
    ("Website Revamp", "Redesign the marketing site with a faster, accessible frontend.", "Active"): [
        ("Audit current site performance", 150), ("Design new landing page in Figma", 300),
        ("Implement responsive navbar", 200), ("Migrate blog to headless CMS", 400),
        ("Set up image CDN and lazy loading", 250), ("Fix accessibility issues (WCAG AA)", 300),
        ("Write SEO meta tags for all pages", 100), ("Add analytics event tracking", 150),
    ],
    ("Mobile App Launch", "Ship v1 of the companion app on Android and iOS.", "Active"): [
        ("Build login and signup screens", 250), ("Integrate push notifications", 350),
        ("Offline caching for task list", 400), ("App store screenshots and listing", 100),
        ("Beta test with 20 internal users", 200), ("Crash reporting setup", 150),
        ("Dark mode support", 200), ("Performance profiling on low-end devices", 300),
    ],
    ("Data Platform Migration", "Move reporting from spreadsheets to a central warehouse.", "Active"): [
        ("Inventory existing reports", 100), ("Design warehouse schema", 450),
        ("Build nightly ETL pipeline", 500), ("Backfill 2 years of sales data", 350),
        ("Create revenue dashboard", 300), ("Document data dictionary", 150),
        ("Set up data quality alerts", 250),
    ],
    ("Customer Onboarding Portal", "Self-serve onboarding to cut support tickets in half.", "Active"): [
        ("Map current onboarding journey", 100), ("Build document upload flow", 300),
        ("Email verification and reminders", 200), ("Admin review queue", 350),
        ("Write help-center articles", 100), ("Usability test with 5 customers", 200),
    ],
    ("Legacy CRM Sunset", "Retire the old CRM after migrating all accounts.", "Archived"): [
        ("Export contacts from legacy CRM", 200), ("Map fields to new CRM", 250),
        ("Migrate historical deals", 400), ("Train sales team on new CRM", 150),
        ("Decommission legacy servers", 300),
    ],
}

EXPENSE_TEMPLATES = {
    "Software": [("Figma annual seat", 120, 180), ("GitHub Copilot subscription", 10, 20),
                 ("JetBrains license", 90, 250), ("AWS credits top-up", 50, 300),
                 ("Postman Pro plan", 12, 30), ("Notion team plan", 8, 20)],
    "Equipment": [("Mechanical keyboard", 60, 160), ("27-inch monitor", 180, 420),
                  ("USB-C docking station", 80, 220), ("Noise-cancelling headphones", 120, 350),
                  ("Laptop stand", 25, 70), ("HD webcam", 40, 120)],
    "Travel": [("Uber to client office", 12, 45), ("Flight to Bengaluru", 120, 380),
               ("Hotel stay - client visit", 90, 260), ("Train ticket to Pune", 15, 60),
               ("Airport cab", 20, 55)],
    "Meals": [("Team lunch", 40, 120), ("Client dinner", 60, 180),
              ("Coffee with stakeholders", 8, 25), ("Working lunch", 12, 35),
              ("Sprint retro snacks", 15, 50)],
}


def random_past(max_days: int, min_days: int = 0) -> datetime:
    seconds = rng.randint(min_days * 86400, max_days * 86400)
    return now - timedelta(seconds=seconds)


def ensure_safe_target(allow_remote: bool, reset: bool) -> None:
    host = make_url(engine.url).host or ""
    if host in ("localhost", "127.0.0.1", "::1"):
        return
    if reset:
        sys.exit(f"Refusing --reset on non-local database host '{host}'. It would delete real data.")
    if not allow_remote:
        sys.exit(f"Refusing to seed non-local database host '{host}'. Pass --allow-remote to override.")


def seed_users(db) -> dict[str, User]:
    users = {}
    for email, first_name, password, role, is_active in USERS:
        user = db.scalar(select(User).where(User.email == email))
        if not user:
            user = User(email=email, first_name=first_name, password_hash=get_password_hash(password),
                        role=role, is_active=is_active, points=0, level=1,
                        created_at=now - timedelta(days=DAYS_OF_HISTORY + rng.randint(1, 20)))
            db.add(user)
        users[email] = user
    db.flush()
    return users


def seed_tasks(db, users: dict[str, User]) -> list[Task]:
    employees = [u for u in users.values() if u.role == "Employee" and u.is_active]
    focus = users["employee@gmail.com"]
    tasks = []
    for (name, description, status), task_specs in PROJECTS.items():
        project = Project(name=name, description=description, status=status,
                          created_at=now - timedelta(days=DAYS_OF_HISTORY + 5))
        db.add(project)
        db.flush()
        for title, xp in task_specs:
            created = random_past(DAYS_OF_HISTORY, 2)
            due = created + timedelta(days=rng.randint(4, 21))
            if status == "Archived":
                task_status = "Completed"
            else:
                task_status = rng.choices(["Completed", "In Progress", "Todo"], weights=[55, 20, 25])[0]
            tasks.append(Task(title=title, description=f"{title} for the {name} project.", xp=xp,
                              status=task_status, created_at=created, due_date=due,
                              project_id=project.id, assigned_to_id=rng.choice(employees).id))

    # Give the main demo employee open work to complete live, and leave two tasks unassigned.
    open_tasks = [t for t in tasks if t.status != "Completed"]
    for t in open_tasks[:4]:
        t.assigned_to_id = focus.id
    for t in open_tasks[-2:]:
        t.assigned_to_id = None
    db.add_all(tasks)
    return tasks


def apply_xp(users: dict[str, User], tasks: list[Task]) -> None:
    by_id = {u.id: u for u in users.values()}
    for user in users.values():
        user.points = 0
    for task in tasks:
        if task.status == "Completed" and task.assigned_to_id in by_id:
            by_id[task.assigned_to_id].points += task.xp
    for user in users.values():
        user.level = user.points // XP_PER_LEVEL + 1


def seed_expenses(db, users: dict[str, User]) -> int:
    submitters = [u for u in users.values() if u.role in ("Employee", "Manager") and u.is_active]
    expenses = []
    for _ in range(70):
        category = rng.choice(list(EXPENSE_TEMPLATES))
        title, low, high = rng.choice(EXPENSE_TEMPLATES[category])
        created = random_past(DAYS_OF_HISTORY)
        recent = (now - created).days < 7
        status = rng.choices(["Approved", "Rejected", "Pending"],
                             weights=[15, 5, 80] if recent else [75, 15, 10])[0]
        expenses.append(Expense(title=title, category=category, amount=round(rng.uniform(low, high), 2),
                                status=status, created_at=created,
                                submitted_by_id=rng.choice(submitters).id))

    # Planted anomalies (all Pending) for the approvals queue and future anomaly detection.
    emp, rohan = users["employee@gmail.com"], users["rohan@gmail.com"]
    expenses += [
        Expense(title="Client dinner", category="Meals", amount=142.50, status="Pending",
                created_at=now - timedelta(days=3), submitted_by_id=rohan.id),
        Expense(title="Client dinner", category="Meals", amount=142.50, status="Pending",
                created_at=now - timedelta(days=2), submitted_by_id=rohan.id),  # duplicate
        Expense(title="Business class flight to Singapore", category="Travel", amount=2450.00,
                status="Pending", created_at=now - timedelta(days=1), submitted_by_id=emp.id),  # outlier
        Expense(title="Team offsite dinner", category="Meals", amount=500.00, status="Pending",
                created_at=now - timedelta(days=4), submitted_by_id=emp.id),  # round number
        Expense(title="27-inch monitor", category="Equipment", amount=289.99, status="Pending",
                created_at=now - timedelta(days=1), submitted_by_id=emp.id),
    ]
    db.add_all(expenses)
    return len(expenses)


def seed_quests(db, users: dict[str, User]) -> int:
    """Two team quests part-way done, plus some weekly progress, so the Quests page has a story."""
    from app.services.quest_service import QuestService

    projects = {p.name: p for p in db.query(Project).all()}
    manager = users["manager@gmail.com"]
    plan = [
        ("Website Revamp", 6, 300, 5, [("employee@gmail.com", 2), ("aisha@gmail.com", 1)]),
        ("Mobile App Launch", 4, 400, 7, [("meera@gmail.com", 1)]),
    ]
    for name, target, reward, days, progress in plan:
        noun = "task" if target == 1 else "tasks"
        quest = Quest(
            kind="team", title=f"Finish {target} {name} {noun}", metric="tasks_completed", target=target, reward_xp=reward,
            project_id=projects[name].id, created_by_id=manager.id, starts_at=now - timedelta(days=2),
            ends_at=(now + timedelta(days=days)).replace(hour=18, minute=0, second=0), status="active",
        )
        db.add(quest)
        db.flush()
        for email, count in progress:
            db.add(QuestProgress(quest_id=quest.id, user_id=users[email].id, progress=count))

    weekly = {q.code: q for q in QuestService.ensure_weekly_quests(db, now)}
    db.add(QuestProgress(quest_id=weekly["finish-3"].id, user_id=users["employee@gmail.com"].id, progress=2))
    db.add(QuestProgress(quest_id=weekly["earn-500"].id, user_id=users["employee@gmail.com"].id, progress=300))
    return len(plan)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reset", action="store_true", help="drop and recreate all tables first")
    parser.add_argument("--allow-remote", action="store_true", help="allow seeding a non-local database")
    args = parser.parse_args()

    ensure_safe_target(args.allow_remote, args.reset)
    if args.reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if db.scalar(select(func.count(Project.id))):
            print("Demo data skipped: the database already has projects (locally, --reset wipes and reseeds).")
            return
        users = seed_users(db)
        tasks = seed_tasks(db, users)
        db.flush()
        apply_xp(users, tasks)
        expense_count = seed_expenses(db, users)
        db.commit()
        quest_count = seed_quests(db, users)
        db.commit()
    finally:
        db.close()

    print(f"Seeded {len(users)} users, {len(PROJECTS)} projects, {len(tasks)} tasks, {expense_count} expenses, {quest_count} team quests.")
    print("Logins: admin@gmail.com / Admin@123 | manager@gmail.com / Manager@123 | "
          "employee@gmail.com / Employee@123 | others: <name>@gmail.com / Demo@1234")


if __name__ == "__main__":
    main()
