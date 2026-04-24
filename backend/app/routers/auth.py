"""
ZORA AI - Authentication Router
===================================
Endpoints for user registration, login, logout, and Google OAuth.
"""

from datetime import datetime
from typing import Optional
import secrets
import smtplib
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

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

# ── In-memory Email OTP store (use Redis in production) ──────────────
# Structure: { email: { "code": str, "expires": float } }
_email_otp_store: dict = {}
_EMAIL_OTP_TTL = 600  # 10 minutes


def _generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)  # 6-digit


def _store_email_otp(email: str, code: str) -> None:
    _email_otp_store[email] = {"code": code, "expires": time.time() + _EMAIL_OTP_TTL}


def _verify_email_otp(email: str, code: str) -> bool:
    entry = _email_otp_store.get(email)
    if not entry:
        return False
    if time.time() > entry["expires"]:
        _email_otp_store.pop(email, None)
        return False
    if entry["code"] != code:
        return False
    _email_otp_store.pop(email, None)
    return True


def _send_email_otp(to_email: str, code: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"{code} — Your ZORA AI Login Code"
    msg["From"] = settings.SMTP_USER
    msg["To"] = to_email

    html = f"""
    <div style="font-family:'Sora',sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#F5F5F5;border-radius:16px;">
      <h2 style="color:#111111;font-size:20px;margin-bottom:8px;">ZORA AI</h2>
      <p style="color:#555555;font-size:14px;margin-bottom:24px;">Your one-time login code:</p>
      <div style="background:#FFFFFF;border:1.5px solid #E5E5E5;border-radius:12px;padding:24px;text-align:center;letter-spacing:12px;font-size:32px;font-weight:700;color:#0099CC;">{code}</div>
      <p style="color:#999999;font-size:12px;margin-top:20px;">Expires in 10 minutes. Do not share this code.</p>
    </div>
    """
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.sendmail(settings.SMTP_USER, to_email, msg.as_string())


async def _twilio_send_otp(phone: str) -> None:
    url = f"https://verify.twilio.com/v2/Services/{settings.TWILIO_VERIFY_SERVICE_SID}/Verifications"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            data={"To": phone, "Channel": "sms"},
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            timeout=15.0
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail="Failed to send SMS OTP")


async def _twilio_verify_otp(phone: str, code: str) -> bool:
    url = f"https://verify.twilio.com/v2/Services/{settings.TWILIO_VERIFY_SERVICE_SID}/VerificationChecks"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            data={"To": phone, "Code": code},
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            timeout=15.0
        )
        if resp.status_code not in (200, 201):
            return False
        return resp.json().get("status") == "approved"


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


class EmailOtpSendRequest(BaseModel):
    email: EmailStr

class EmailOtpVerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)

class PhoneOtpSendRequest(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20)

class PhoneOtpVerifyRequest(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20)
    code: str = Field(..., min_length=6, max_length=6)

class GithubAuthRequest(BaseModel):
    code: str

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

# ── Email OTP ─────────────────────────────────────────────────────────

@router.post("/email-otp/send")
@limiter.limit("5/minute", key_func=ip_key)
async def email_otp_send(request: Request, payload: EmailOtpSendRequest):
    """Send 6-digit OTP to email via SMTP."""
    code = _generate_otp()
    try:
        _send_email_otp(payload.email, code)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to send email: {str(e)}")
    _store_email_otp(payload.email, code)
    return {"success": True, "message": f"OTP sent to {payload.email}"}


@router.post("/email-otp/verify", response_model=AuthResponse)
async def email_otp_verify(
    payload: EmailOtpVerifyRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Verify email OTP and return JWT. Creates user if not exists."""
    if not _verify_email_otp(payload.email, payload.code):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    is_new_user = False

    if not user:
        user = User(
            name=payload.email.split("@")[0],
            email=payload.email,
            country=await detect_country_from_ip(get_request_ip(http_request)),
            is_active=True,
        )
        db.add(user)
        await db.flush()
        is_new_user = True

    return create_auth_response(user, is_new_user=is_new_user)


# ── Phone OTP ─────────────────────────────────────────────────────────

@router.post("/phone-otp/send")
@limiter.limit("5/minute", key_func=ip_key)
async def phone_otp_send(request: Request, payload: PhoneOtpSendRequest):
    """Send OTP SMS via Twilio Verify."""
    await _twilio_send_otp(payload.phone)
    return {"success": True, "message": f"OTP sent to {payload.phone}"}


@router.post("/phone-otp/verify", response_model=AuthResponse)
async def phone_otp_verify(
    payload: PhoneOtpVerifyRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Verify phone OTP via Twilio and return JWT. Creates user if not exists."""
    approved = await _twilio_verify_otp(payload.phone, payload.code)
    if not approved:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    result = await db.execute(select(User).where(User.phone == payload.phone))
    user = result.scalar_one_or_none()
    is_new_user = False

    if not user:
        user = User(
            name=f"user_{payload.phone[-4:]}",
            email=f"phone_{payload.phone.lstrip('+')}@zora.local",  # placeholder
            phone=payload.phone,
            country=await detect_country_from_ip(get_request_ip(http_request)),
            is_active=True,
        )
        db.add(user)
        await db.flush()
        is_new_user = True

    return create_auth_response(user, is_new_user=is_new_user)


# ── GitHub OAuth ──────────────────────────────────────────────────────

@router.post("/github", response_model=AuthResponse)
async def github_auth(
    payload: GithubAuthRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Exchange GitHub OAuth code for JWT. Creates/links user as needed."""
    async with httpx.AsyncClient() as client:
        # 1. Exchange code → access token
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": payload.code,
            },
            headers={"Accept": "application/json"},
            timeout=15.0,
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="GitHub OAuth failed: invalid code")

        # 2. Get user profile
        gh_headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
        user_resp = await client.get("https://api.github.com/user", headers=gh_headers, timeout=10.0)
        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch GitHub user")
        gh_user = user_resp.json()

        # 3. Get primary verified email (profile email may be null)
        email = gh_user.get("email")
        if not email:
            emails_resp = await client.get("https://api.github.com/user/emails", headers=gh_headers, timeout=10.0)
            if emails_resp.status_code == 200:
                emails = emails_resp.json()
                primary = next((e for e in emails if e.get("primary") and e.get("verified")), None)
                email = primary["email"] if primary else None

        github_id = str(gh_user["id"])
        name = gh_user.get("name") or gh_user.get("login") or "GitHub User"
        avatar_url = gh_user.get("avatar_url")

    # 4. Upsert user
    result = await db.execute(select(User).where(User.github_id == github_id))
    user = result.scalar_one_or_none()
    is_new_user = False

    if user:
        user.name = name
        user.avatar_url = avatar_url
        await db.flush()
    else:
        # Try linking by email
        if email:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()

        if user:
            user.github_id = github_id
            user.avatar_url = avatar_url
            await db.flush()
        else:
            user = User(
                name=name,
                email=email or f"github_{github_id}@zora.local",
                github_id=github_id,
                avatar_url=avatar_url,
                country=await detect_country_from_ip(get_request_ip(http_request)),
                is_active=True,
            )
            db.add(user)
            await db.flush()
            is_new_user = True

    return create_auth_response(user, is_new_user=is_new_user)
