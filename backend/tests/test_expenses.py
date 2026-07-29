from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.expense import Expense
from app.models.user import User
from tests.conftest import get_auth_headers

def test_manager_can_submit_expense(client: TestClient, manager_user: User):
    headers = get_auth_headers(manager_user)
    payload = {
        "title": "Manager Conference Trip",
        "category": "Travel",
        "amount": 450.00
    }
    response = client.post("/api/v1/expenses/", json=payload, headers=headers)
    assert response.status_code == 201
    assert response.json()["title"] == "Manager Conference Trip"
    assert response.json()["submitted_by_id"] == manager_user.id

def test_expense_visibility_scoping_employee(client: TestClient, db_session: Session, employee_user1: User, employee_user2: User):
    # Expense 1 by Emp 1
    exp1 = Expense(title="Emp1 Expense", category="Meals", amount=50.0, submitted_by_id=employee_user1.id)
    # Expense 2 by Emp 2
    exp2 = Expense(title="Emp2 Expense", category="Software", amount=120.0, submitted_by_id=employee_user2.id)
    db_session.add_all([exp1, exp2])
    db_session.commit()

    # Employee 1 fetches expenses -> Sees only Exp1
    headers1 = get_auth_headers(employee_user1)
    res1 = client.get("/api/v1/expenses/", headers=headers1)
    assert res1.status_code == 200
    items1 = res1.json()
    assert len(items1) == 1
    assert items1[0]["title"] == "Emp1 Expense"

def test_expense_visibility_scoping_manager(client: TestClient, db_session: Session, manager_user: User, employee_user1: User, employee_user2: User):
    # Expense 1 (Pending by Emp1)
    exp1 = Expense(title="Emp1 Pending Expense", category="Meals", amount=50.0, status="Pending", submitted_by_id=employee_user1.id)
    # Expense 2 (Approved by Emp2)
    exp2 = Expense(title="Emp2 Approved Expense", category="Software", amount=120.0, status="Approved", submitted_by_id=employee_user2.id)
    # Expense 3 (Approved by Manager)
    exp3 = Expense(title="Manager Expense", category="Travel", amount=300.0, status="Approved", submitted_by_id=manager_user.id)
    db_session.add_all([exp1, exp2, exp3])
    db_session.commit()

    # Manager fetches expenses -> Sees Exp1 (Pending claim awaiting review) + Exp3 (Manager's own expense)
    headers_mgr = get_auth_headers(manager_user)
    res_mgr = client.get("/api/v1/expenses/", headers=headers_mgr)
    assert res_mgr.status_code == 200
    titles = [item["title"] for item in res_mgr.json()]
    assert "Emp1 Pending Expense" in titles
    assert "Manager Expense" in titles
    assert "Emp2 Approved Expense" not in titles

def test_expense_self_approval_prevented(client: TestClient, db_session: Session, manager_user: User):
    # Manager submits an expense claim
    exp = Expense(title="Manager Self Expense", category="Equipment", amount=500.0, status="Pending", submitted_by_id=manager_user.id)
    db_session.add(exp)
    db_session.commit()
    db_session.refresh(exp)

    # Manager attempts to approve their own expense -> Bad Request (400)
    headers = get_auth_headers(manager_user)
    response = client.put(f"/api/v1/expenses/{exp.id}/status", json={"status": "Approved"}, headers=headers)
    assert response.status_code == 400
    assert "Self-approval constraint" in response.json()["detail"]

def test_manager_can_approve_employee_expense(client: TestClient, db_session: Session, manager_user: User, employee_user1: User):
    # Employee submits expense
    exp = Expense(title="Employee Claim", category="Travel", amount=80.0, status="Pending", submitted_by_id=employee_user1.id)
    db_session.add(exp)
    db_session.commit()
    db_session.refresh(exp)

    # Manager approves employee expense -> Success (200)
    headers = get_auth_headers(manager_user)
    response = client.put(f"/api/v1/expenses/{exp.id}/status", json={"status": "Approved"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "Approved"
