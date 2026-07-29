from fastapi.testclient import TestClient

def test_register_user_success(client: TestClient):
    payload = {
        "email": "newuser@gmail.com",
        "first_name": "NewUser",
        "password": "SecurePassword123!",
        "role": "Employee"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == payload["email"]
    assert data["first_name"] == payload["first_name"]
    assert data["role"] == "Employee"

def test_register_duplicate_email_fails(client: TestClient):
    payload = {
        "email": "dupe@gmail.com",
        "first_name": "DupeUser",
        "password": "SecurePassword123!",
        "role": "Employee"
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]

def test_login_success(client: TestClient):
    # Register first
    client.post("/api/v1/auth/register", json={
        "email": "logintest@gmail.com",
        "first_name": "LoginTest",
        "password": "SecurePassword123!",
        "role": "Employee"
    })

    # Login
    response = client.post("/api/v1/auth/login", json={
        "email": "logintest@gmail.com",
        "password": "SecurePassword123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "logintest@gmail.com"

def test_login_invalid_password_fails(client: TestClient):
    client.post("/api/v1/auth/register", json={
        "email": "wrongpass@gmail.com",
        "first_name": "WrongPass",
        "password": "SecurePassword123!",
        "role": "Employee"
    })

    response = client.post("/api/v1/auth/login", json={
        "email": "wrongpass@gmail.com",
        "password": "WrongPassword123!"
    })
    assert response.status_code == 401
