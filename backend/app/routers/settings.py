"""
ZORA AI - Settings Router
=========================
Endpoints for user settings, language preferences, and feedback.
"""

import json
from copy import deepcopy

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config import settings
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.memory import Memory
from app.models.user import Feedback, User, UserProfile

router = APIRouter()

SUPPORTED_LANGUAGES = [
    "en", "fr", "de", "ja", "id", "it", "ko", "pt", "es-la", "es-es", "zh"
]

DEFAULT_PREFERENCES = {
    "appearance": {"dark_mode": True},
    "security": {"change_password_placeholder": True},
}


def api_success(data: dict, message: str) -> dict:
    return {
        "status": "success",
        "success": True,
        "data": data,
        "message": message,
    }


def ensure_supported_language(language: str) -> str:
    """Validate that a language code is supported."""
    normalized = (language or "").strip().lower()
    if normalized not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported language",
        )
    return normalized


def merge_preferences(existing: dict | None, incoming: dict | None) -> dict:
    """Merge nested preference dictionaries without losing untouched keys."""
    merged = deepcopy(existing or DEFAULT_PREFERENCES)

    for key, value in (incoming or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = {**merged[key], **value}
        else:
            merged[key] = value

    return merged


def serialize_preferences(preferences: dict) -> str:
    return json.dumps(preferences)


def is_developer_user(user_email: str, developer_email: str | None) -> bool:
    return bool(developer_email and user_email.lower() == developer_email.lower())


class LanguageRequest(BaseModel):
    language: str

    @field_validator("language")
    @classmethod
    def validate_language(cls, value: str) -> str:
        return ensure_supported_language(value)


class PreferencesRequest(BaseModel):
    preferences: dict = Field(default_factory=dict)


class FeedbackRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    rating: int | None = Field(default=None, ge=1, le=5)

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Feedback message is required")
        return value


async def get_or_create_profile(db: AsyncSession, user_id) -> UserProfile:
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = result.scalar_one_or_none()

    if profile is None:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        await db.flush()

    return profile


async def get_memory_entry(db: AsyncSession, user_id, key: str) -> Memory | None:
    result = await db.execute(
        select(Memory).where(Memory.user_id == user_id, Memory.key == key)
    )
    return result.scalar_one_or_none()


async def upsert_memory_entry(db: AsyncSession, user_id, key: str, value: str) -> Memory:
    memory_entry = await get_memory_entry(db, user_id, key)

    if memory_entry is None:
        memory_entry = Memory(user_id=user_id, key=key, value=value)
        db.add(memory_entry)
    else:
        memory_entry.value = value

    await db.flush()
    return memory_entry


async def load_preferences(db: AsyncSession, user_id) -> dict:
    memory_entry = await get_memory_entry(db, user_id, "user_preferences")
    if memory_entry is None:
        return deepcopy(DEFAULT_PREFERENCES)

    try:
        stored = json.loads(memory_entry.value)
    except json.JSONDecodeError:
        stored = {}

    return merge_preferences(DEFAULT_PREFERENCES, stored)


@router.get("/settings")
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current user's settings payload."""
    try:
        profile = await get_or_create_profile(db, current_user.id)
        preferences = await load_preferences(db, current_user.id)

        return api_success(
            {
                "general": {
                    "display_name": profile.display_name or current_user.name,
                    "email": current_user.email,
                    "avatar_url": current_user.avatar_url,
                },
                "language": profile.language,
                "preferences": preferences,
                "is_developer": is_developer_user(current_user.email, settings.DEVELOPER_EMAIL),
            },
            "Settings retrieved successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load settings: {exc}") from exc


@router.put("/settings/language")
async def update_language(
    request: LanguageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the user's preferred language."""
    try:
        profile = await get_or_create_profile(db, current_user.id)
        profile.language = request.language
        await db.flush()

        return api_success(
            {"language": profile.language},
            "Language updated successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update language: {exc}") from exc


@router.put("/settings/preferences")
async def update_preferences(
    request: PreferencesRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update general user preferences stored in memory."""
    try:
        profile = await get_or_create_profile(db, current_user.id)
        merged_preferences = merge_preferences(
            await load_preferences(db, current_user.id),
            request.preferences,
        )

        display_name = (
            request.preferences.get("general", {}).get("display_name")
            if isinstance(request.preferences.get("general"), dict)
            else None
        )
        if isinstance(display_name, str) and display_name.strip():
            profile.display_name = display_name.strip()

        await upsert_memory_entry(
            db,
            current_user.id,
            "user_preferences",
            serialize_preferences(merged_preferences),
        )
        await db.flush()

        return api_success(
            {
                "preferences": merged_preferences,
                "general": {
                    "display_name": profile.display_name or current_user.name,
                    "email": current_user.email,
                    "avatar_url": current_user.avatar_url,
                },
            },
            "Preferences updated successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {exc}") from exc


@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save user feedback."""
    try:
        feedback = Feedback(
            user_id=current_user.id,
            message=request.message,
            rating=request.rating,
        )
        db.add(feedback)
        await db.flush()

        return api_success(
            {"feedback_id": str(feedback.id)},
            "Feedback submitted successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {exc}") from exc


@router.get("/admin/feedback")
async def get_admin_feedback(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all feedback for the configured developer."""
    try:
        if not is_developer_user(current_user.email, settings.DEVELOPER_EMAIL):
            raise HTTPException(status_code=403, detail="Developer access required")

        result = await db.execute(select(Feedback).order_by(Feedback.created_at.desc()))
        feedback_items = [feedback.to_dict() for feedback in result.scalars().all()]

        return api_success(
            {"feedback": feedback_items},
            "Feedback list retrieved successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load feedback: {exc}") from exc
