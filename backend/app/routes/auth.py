from fastapi import APIRouter, Depends, status, Body
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token,
    UserOut,
    PasswordResetRequest,
    OTPVerificationRequest,
    PasswordResetConfirm
)
from app.services.auth_service import AuthService

router = APIRouter()

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(schema: UserRegister, db: Session = Depends(get_db)):
    """
    Registers a new Employee account into the system.
    """
    return AuthService.register_user(db=db, schema=schema)

@router.post("/login", response_model=Token)
def login(schema: UserLogin, db: Session = Depends(get_db)):
    """
    Validates credentials and establishes an active JWT session.
    """
    user = AuthService.authenticate_user(db=db, schema=schema)
    return AuthService.create_user_session(db=db, user=user)

@router.post("/refresh", response_model=Token)
def refresh(refresh_token: str = Body(..., embed=True), db: Session = Depends(get_db)):
    """
    Rotates active token sessions using a valid, unrevoked Refresh Token.
    """
    return AuthService.rotate_session(db=db, refresh_token=refresh_token)

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(refresh_token: str = Body(..., embed=True), db: Session = Depends(get_db)):
    """
    Revokes the active session token, logging the user out.
    """
    AuthService.revoke_session(db=db, refresh_token=refresh_token)
    return None

@router.post("/forgot-password")
def forgot_password(schema: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Requests a 6-digit OTP verification code for password reset.
    """
    return AuthService.request_password_reset(db=db, schema=schema)

@router.post("/verify-otp")
def verify_otp(schema: OTPVerificationRequest):
    """
    Validates the 6-digit OTP code.
    """
    return AuthService.verify_otp(schema=schema)

@router.post("/reset-password")
def reset_password(schema: PasswordResetConfirm, db: Session = Depends(get_db)):
    """
    Resets the user password using verified OTP.
    """
    return AuthService.confirm_password_reset(db=db, schema=schema)
