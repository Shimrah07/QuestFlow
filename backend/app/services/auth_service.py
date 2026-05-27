from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.user import User, RefreshToken
from app.schemas.auth import UserRegister, UserLogin
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token
)

class AuthService:
    """
    Pure Business Logic Service for handling Authentication, Account Creation,
    and Active Token/Session Lifecycles.
    """

    @staticmethod
    def register_user(db: Session, schema: UserRegister) -> User:
        """
        Validates duplicate registrations and hashes passwords prior to database insertion.
        """
        # Search for email collisions
        existing_user = db.scalar(select(User).where(User.email == schema.email))
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists."
            )

        hashed_password = get_password_hash(schema.password)
        new_user = User(
            email=schema.email,
            first_name=schema.first_name,
            password_hash=hashed_password,
            role=schema.role
        )

        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def authenticate_user(db: Session, schema: UserLogin) -> User:
        """
        Verifies login credentials and evaluates user activation state.
        """
        user = db.scalar(select(User).where(User.email == schema.email))
        if not user or not verify_password(schema.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This user account has been deactivated."
            )

        return user

    @staticmethod
    def create_user_session(db: Session, user: User) -> dict:
        """
        Generates access and refresh tokens, registering the refresh token in MS SQL.
        """
        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id)

        # Decode exp timestamp from token to sync Database expiration
        payload = decode_token(refresh_token, is_refresh=True)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Token generation failure."
            )
            
        expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

        # Write active Refresh Token session
        db_session = RefreshToken(
            user_id=user.id,
            token=refresh_token,
            expires_at=expires_at.replace(tzinfo=None)  # Stored as local naive datetime in SQL
        )
        
        db.add(db_session)
        db.commit()

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user
        }

    @staticmethod
    def rotate_session(db: Session, refresh_token: str) -> dict:
        """
        Validates the incoming refresh token, revokes it, and issues a brand-new token pair.
        """
        payload = decode_token(refresh_token, is_refresh=True)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token."
            )

        user_id = int(payload["sub"])
        db_token = db.scalar(
            select(RefreshToken).where(
                RefreshToken.token == refresh_token,
                RefreshToken.is_revoked == False
            )
        )

        if not db_token or db_token.expires_at < datetime.now():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session session expired or revoked."
            )

        # Retrieve user
        user = db.get(User, user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account inactive or missing."
            )

        # Revoke the used Refresh Token (Token Rotation Pattern)
        db_token.is_revoked = True
        db.commit()

        # Issue fresh new session pair
        return AuthService.create_user_session(db, user)

    @staticmethod
    def revoke_session(db: Session, refresh_token: str) -> None:
        """
        Revokes the active Refresh Token database session (logout operation).
        """
        db_token = db.scalar(select(RefreshToken).where(RefreshToken.token == refresh_token))
        if db_token:
            db_token.is_revoked = True
            db.commit()
