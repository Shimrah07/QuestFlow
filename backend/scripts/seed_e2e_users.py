"""
Seed script for E2E test users.
Run from the backend directory:
  .\venv\Scripts\python.exe scripts/seed_e2e_users.py
"""
import os
import sys

# Set required env vars
os.environ["JWT_SECRET_KEY"] = "test_jwt_secret_key_for_unit_tests_only_32_bytes_min!"
os.environ["JWT_REFRESH_SECRET_KEY"] = "test_jwt_refresh_secret_key_for_unit_tests_only_32_bytes_min!"

# Ensure parent directory is in sys.path when running from scripts/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()

users_to_seed = [
    {"email": "admin@gmail.com", "first_name": "Admin", "password": "Admin@123", "role": "Admin"},
    {"email": "manager@gmail.com", "first_name": "Manager", "password": "Manager@123", "role": "Manager"},
    {"email": "employee@gmail.com", "first_name": "Employee", "password": "Employee@123", "role": "Employee"},
]

for u in users_to_seed:
    existing = db.query(User).filter(User.email == u["email"]).first()
    if not existing:
        user = User(
            email=u["email"],
            first_name=u["first_name"],
            password_hash=get_password_hash(u["password"]),
            role=u["role"],
            points=0,
            level=1,
            is_active=True,
        )
        db.add(user)
        print(f"CREATED: {u['email']} ({u['role']})")
    else:
        existing.password_hash = get_password_hash(u["password"])
        existing.role = u["role"]
        print(f"UPDATED: {u['email']} ({u['role']})")

db.commit()
db.close()
print("Seed complete!")
