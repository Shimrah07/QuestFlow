from fastapi.testclient import TestClient
from app.models.user import User
from tests.conftest import get_auth_headers

def test_client_xp_endpoint_is_removed(client: TestClient, employee_user1: User):
    headers = get_auth_headers(employee_user1)
    # Attempting to call PUT /api/v1/users/me/xp must return 404 or 405 Method Not Allowed
    response = client.put("/api/v1/users/me/xp", json={"points": 99999}, headers=headers)
    assert response.status_code in [404, 405]

def test_manager_can_list_projects(client: TestClient, manager_user: User):
    headers = get_auth_headers(manager_user)
    response = client.get("/api/v1/projects/", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_employee_cannot_list_projects(client: TestClient, employee_user1: User):
    headers = get_auth_headers(employee_user1)
    response = client.get("/api/v1/projects/", headers=headers)
    assert response.status_code == 403
