import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User, RefreshToken
from app.schemas.auth import UserRegister
from app.core.security import (
    hash_password,
    verify_password,
    hash_token,
    generate_refresh_token,
    create_access_token,
)
from app.config import settings


class AuthService:
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        normalized = email.strip().lower()
        return db.query(User).filter(User.email == normalized).first()

    @staticmethod
    def get_user_by_id(db: Session, user_id: uuid.UUID) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @classmethod
    def register_user(cls, db: Session, user_in: UserRegister) -> User:
        existing = cls.get_user_by_email(db, user_in.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists."
            )

        hashed = hash_password(user_in.password)
        user = User(
            email=user_in.email,
            hashed_password=hashed,
            display_name=user_in.display_name,
            is_active=True,
            is_verified=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @classmethod
    def authenticate_user(cls, db: Session, email: str, password: str) -> Optional[User]:
        user = cls.get_user_by_email(db, email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated."
            )
        return user

    @staticmethod
    def create_refresh_session(db: Session, user_id: uuid.UUID) -> Tuple[str, RefreshToken]:
        raw_token, token_hash, expires_at = generate_refresh_token()
        session_record = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_revoked=False
        )
        db.add(session_record)
        db.commit()
        db.refresh(session_record)
        return raw_token, session_record

    @classmethod
    def refresh_session(cls, db: Session, raw_token: str) -> Tuple[str, str, User]:
        """
        Validate the refresh token, revoke it, and issue a fresh pair (Rotation).
        Returns:
            (new_access_token, new_raw_refresh_token, user)
        """
        token_hash = hash_token(raw_token)
        stored_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

        if not stored_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session. Please log in again."
            )

        # If a revoked token is reused, security alert: revoke all active tokens for this user
        if stored_token.is_revoked:
            db.query(RefreshToken).filter(
                RefreshToken.user_id == stored_token.user_id,
                RefreshToken.is_revoked == False
            ).update({"is_revoked": True})
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been revoked. Please log in again."
            )

        now = datetime.now(timezone.utc)
        if stored_token.expires_at < now:
            stored_token.is_revoked = True
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired. Please log in again."
            )

        user = cls.get_user_by_id(db, stored_token.user_id)
        if not user or not user.is_active:
            stored_token.is_revoked = True
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found or deactivated."
            )

        # Token Rotation: Revoke current refresh token
        stored_token.is_revoked = True

        # Issue new refresh token
        new_raw_token, new_token_hash, new_expires_at = generate_refresh_token()
        new_session = RefreshToken(
            user_id=user.id,
            token_hash=new_token_hash,
            expires_at=new_expires_at,
            is_revoked=False
        )
        db.add(new_session)
        db.commit()

        # Issue new access token
        new_access_token = create_access_token(
            subject=str(user.id),
            email=user.email
        )

        return new_access_token, new_raw_token, user

    @staticmethod
    def revoke_refresh_session(db: Session, raw_token: str) -> bool:
        """Revoke a refresh session by its raw token."""
        token_hash = hash_token(raw_token)
        stored_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if stored_token and not stored_token.is_revoked:
            stored_token.is_revoked = True
            db.commit()
            return True
        return False


auth_service = AuthService()
