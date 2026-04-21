"""
ZORA AI - Authentication Router
===================================
Endpoints for user registration, login, logout, and Google OAuth.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, EmailStr, Field
import httpx

from app.database import get_db
from app.models.user import User
from app.middleware.auth_middleware import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
    security
)
from app.config import settings
from app.utils.rate_limit import ip_key, limiter

router = APIRouter()


# Pydantic models for request/response
class RegisterRequest(BaseModel):
    """Request model for user registration."""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


class LoginRequest(BaseModel):
    """Request model for user login."""
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    """Request model for Google OAuth."""
    google_token: str


class AuthResponse(BaseModel):
    """Response model for successful authentication."""
    success: bool
    data: dict
    message: str


class UserResponse(BaseModel):
    """Response model for user data."""
    success: bool
    data: dict
    message: str


# Helper function to generate auth response
def create_auth_response(user: User, is_new_user: bool = False) -> dict:
    """Create standardized auth response with token."""
    access_token = create_access_token(data={"sub": str(user.id)})

    return {
        "success": True,
        "data": {
            "token": access_token,
            "token_type": "bearer",
            "user": user.to_dict(),
            "is_new_user": is_new_user
        },
        "message": "Authentication successful"
    }


def get_request_ip(request: Request) -> str:
    """Extract the most likely client IP from the request."""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return ""


async def detect_country_from_ip(ip_address: str) -> str:
    """Resolve country from IP with Unknown fallback."""
    if not ip_address or ip_address in {"127.0.0.1", "::1", "localhost"}:
        return "Unknown"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"http://ip-api.com/json/{ip_address}")
            response.raise_for_status()
            data = response.json()
            return data.get("country") or "Unknown"
    except Exception:
        return "Unknown"


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user account.

    Args:
        request: Registration data (name, email, password)
        db: Database session

    Returns:
        JWT token and user data

    Raises:
        HTTPException: 400 if email already registered
    """
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == request.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    new_user = User(
        name=request.name,
        email=request.email,
        password_hash=get_password_hash(request.password),
        country=await detect_country_from_ip(get_request_ip(http_request)),
        is_active=True
    )

    db.add(new_user)
    await db.flush()

    return create_auth_response(new_user, is_new_user=True)


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute", key_func=ip_key)
async def login(
    request: Request,
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate existing user.

    Args:
        request: Login credentials (email, password)
        db: Database session

    Returns:
        JWT token and user data

    Raises:
        HTTPException: 401 if credentials invalid
    """
    # Find user by email
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Verify password (handle OAuth users without password)
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please login with Google for this account"
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    return create_auth_response(user, is_new_user=False)


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Logout user (client-side token removal).

    Note: JWT tokens are stateless. Full logout requires client to delete token.
    This endpoint validates the token and confirms logout.

    Returns:
        Success message
    """
    return {
        "success": True,
        "data": {},
        "message": "Logged out successfully"
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user data.

    Returns:
        User profile data

    Requires:
        Valid JWT token in Authorization header
    """
    return {
        "success": True,
        "data": current_user.to_dict(),
        "message": "User data retrieved successfully"
    }


@router.post("/google", response_model=AuthResponse)
async def google_auth(
    request: GoogleAuthRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate or register via Google OAuth.

    Args:
        request: Google OAuth token
        db: Database session

    Returns:
        JWT token, user data, and is_new_user flag

    Raises:
        HTTPException: 400 if Google token invalid
    """
    # Verify Google token
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {request.google_token}"}
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Google token"
                )

            google_data = response.json()
            google_id = google_data.get("sub")
            email = google_data.get("email")
            name = google_data.get("name", email.split("@")[0])
            avatar_url = google_data.get("picture")

            if not google_id or not email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Google user data"
                )

    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify Google token"
        )

    # Check if user exists by Google ID
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    is_new_user = False

    if user:
        # Existing user - update info
        user.name = name
        user.avatar_url = avatar_url
        await db.flush()
    else:
        # Check if email exists (link Google to existing account)
        result = await db.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            existing_user.google_id = google_id
            existing_user.avatar_url = avatar_url
            await db.flush()
            user = existing_user
        else:
            # Create new user
            user = User(
                name=name,
                email=email,
                google_id=google_id,
                avatar_url=avatar_url,
                country=await detect_country_from_ip(get_request_ip(http_request)),
                is_active=True
            )
            db.add(user)
            await db.flush()
            is_new_user = True

    return create_auth_response(user, is_new_user=is_new_user)
