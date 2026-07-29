import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str = Field(min_length=2, max_length=30)
    role: str = Field(default="Employee", description="Role selection (Manager, Employee). Admin role cannot be self-registered.")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed_roles = {"Employee", "Manager"}
        if v == "Admin":
            raise ValueError("Admin accounts cannot be self-registered. Admin access is pre-configured by the system.")
        if v not in allowed_roles:
            raise ValueError(f"Invalid role. Allowed roles for registration are: {', '.join(sorted(allowed_roles))}.")
        return v

    @field_validator("first_name")
    @classmethod
    def validate_first_name(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z]{2,30}$", v):
            raise ValueError("First name must contain only alphabetic characters and be between 2 and 30 characters long.")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9._%+-]+@gmail\.com$", v.lower()):
            raise ValueError("Only valid Gmail addresses (e.g. user@gmail.com) are allowed.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.match(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$", v):
            raise ValueError("Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    captcha_code: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    role: str
    points: int
    level: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class TokenPayload(BaseModel):
    sub: str
    exp: int
    type: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class OTPVerificationRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, description="6-digit verification code")


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if not re.match(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$", v):
            raise ValueError("Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).")
        return v
