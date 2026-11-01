from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    RefreshTokenRequest,
    MessageResponse,
)
from app.services.auth_service import auth_service
from app.core.security import create_access_token
from app.api.deps import get_current_user
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth"


def set_auth_cookie(response: Response, refresh_token: str) -> None:
    """Set HttpOnly, secure refresh token cookie."""
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=max_age,
        expires=max_age,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
    )


def clear_auth_cookie(response: Response) -> None:
    """Clear HttpOnly refresh token cookie on logout."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        domain=settings.COOKIE_DOMAIN,
        samesite=settings.COOKIE_SAMESITE,
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new Legal Helper user"
)
def register(
    payload: UserRegister,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Register a new user account with validated email, display name, and
    Argon2id-hashed password. Immediately issues an access token and refresh session.
    """
    user = auth_service.register_user(db=db, user_in=payload)
    raw_refresh_token, _ = auth_service.create_refresh_session(db=db, user_id=user.id)
    access_token = create_access_token(subject=str(user.id), email=user.email)

    set_auth_cookie(response, raw_refresh_token)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
        refresh_token=raw_refresh_token
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and issue tokens"
)
def login(
    payload: UserLogin,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Verify user credentials and issue an access token and refresh session.
    Returns a generic 401 error on invalid credentials without leaking whether
    the email or password was incorrect.
    """
    user = auth_service.authenticate_user(db=db, email=payload.email, password=payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    raw_refresh_token, _ = auth_service.create_refresh_session(db=db, user_id=user.id)
    access_token = create_access_token(subject=str(user.id), email=user.email)

    set_auth_cookie(response, raw_refresh_token)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
        refresh_token=raw_refresh_token
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Rotate refresh token and issue new access token"
)
def refresh_token(
    request: Request,
    response: Response,
    payload: Optional[RefreshTokenRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Rotates the refresh session. Replaces the current refresh token with a brand new one
    and revokes the old one, preventing token reuse.
    Accepts token via HttpOnly cookie or request body.
    """
    raw_token = None
    if payload and payload.refresh_token:
        raw_token = payload.refresh_token
    elif REFRESH_COOKIE_NAME in request.cookies:
        raw_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing. Please log in again."
        )

    new_access_token, new_raw_refresh, user = auth_service.refresh_session(db=db, raw_token=raw_token)
    set_auth_cookie(response, new_raw_refresh)

    return TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
        refresh_token=new_raw_refresh
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Revoke active session and logout"
)
def logout(
    request: Request,
    response: Response,
    payload: Optional[RefreshTokenRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Revokes the active refresh token session in the database and clears the HttpOnly cookie.
    """
    raw_token = None
    if payload and payload.refresh_token:
        raw_token = payload.refresh_token
    elif REFRESH_COOKIE_NAME in request.cookies:
        raw_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if raw_token:
        auth_service.revoke_refresh_session(db=db, raw_token=raw_token)

    clear_auth_cookie(response)
    return MessageResponse(message="Logged out successfully", success=True)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get authenticated user profile"
)
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Returns the authenticated user's safe profile fields.
    Does not expose password hashes, token secrets, or internal metadata.
    """
    return current_user
