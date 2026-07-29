import pytest
import os

# Set environment variables for testing before importing settings
os.environ["JWT_SECRET_KEY"] = "test_jwt_secret_key_for_unit_tests_only_32_bytes_min!"
os.environ["JWT_REFRESH_SECRET_KEY"] = "test_jwt_refresh_secret_key_for_unit_tests_only_32_bytes_min!"
os.environ["ENVIRONMENT"] = "testing"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.db.base import Base
from app.core.deps import get_db
from app.core.security import get_password_hash, create_access_token
from app.models.user import User

# In-memory SQLite engine for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    """Create tables, yield session, and drop tables for clean test isolation."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session: Session):
    """Override get_db dependency to use the isolated test database session."""
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def admin_user(db_session: Session):
    user = User(
        email="admin@gmail.com",
        first_name="AdminUser",
        password_hash=get_password_hash("AdminPass123!"),
        role="Admin",
        points=0,
        level=1,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def manager_user(db_session: Session):
    user = User(
        email="manager@gmail.com",
        first_name="ManagerUser",
        password_hash=get_password_hash("ManagerPass123!"),
        role="Manager",
        points=0,
        level=1,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def employee_user1(db_session: Session):
    user = User(
        email="emp1@gmail.com",
        first_name="EmployeeOne",
        password_hash=get_password_hash("EmpPass123!"),
        role="Employee",
        points=0,
        level=1,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def employee_user2(db_session: Session):
    user = User(
        email="emp2@gmail.com",
        first_name="EmployeeTwo",
        password_hash=get_password_hash("EmpPass123!"),
        role="Employee",
        points=0,
        level=1,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

def get_auth_headers(user: User) -> dict:
    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}"}
