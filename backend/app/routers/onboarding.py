"""
ZORA AI - Onboarding Router
===========================
Endpoints for collecting onboarding profile details.
"""

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.memory import Memory
from app.models.user import User, UserProfile

router = APIRouter()


def api_success(data: dict, message: str) -> dict:
    """Create a consistent success response payload."""
    return {
        "status": "success",
        "success": True,
        "data": data,
        "message": message,
    }


def serialize_topics_for_memory(topics: list[str]) -> str:
    """Serialize topics for storage in the memory table."""
    return json.dumps(topics)


def apply_topics_submission(profile: UserProfile, topics: list[str]) -> UserProfile:
    """Apply the final onboarding topics selection to a profile."""
    profile.topics = topics
    profile.onboarding_done = True
    return profile


def onboarding_status_from_profile(profile: Optional[UserProfile]) -> bool:
    """Return the onboarding completion state for a profile."""
    return bool(profile and profile.onboarding_done)


class NameRequest(BaseModel):
    """Request payload for saving onboarding name."""

    display_name: str = Field(..., min_length=1, max_length=255)

    @field_validator("display_name")
    @classmethod
    def strip_display_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Display name is required")
        return value


class TopicsRequest(BaseModel):
    """Request payload for saving onboarding topics."""

    topics: list[str] = Field(..., min_length=2, max_length=12)

    @field_validator("topics")
    @classmethod
    def validate_topics(cls, value: list[str]) -> list[str]:
        cleaned_topics = []
        for topic in value:
            cleaned = topic.strip()
            if not cleaned:
                raise ValueError("Topics cannot be empty")
            if cleaned not in cleaned_topics:
                cleaned_topics.append(cleaned)

        if len(cleaned_topics) < 2:
            raise ValueError("Please choose at least 2 topics")

        return cleaned_topics


async def get_or_create_profile(db: AsyncSession, user_id) -> UserProfile:
    """Fetch the user's profile or initialize a new one."""
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = result.scalar_one_or_none()

    if profile is None:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        await db.flush()

    return profile


async def upsert_memory_entry(db: AsyncSession, user_id, key: str, value: str) -> Memory:
    """Create or update a user memory entry."""
    result = await db.execute(
        select(Memory).where(Memory.user_id == user_id, Memory.key == key)
    )
    memory_entry = result.scalar_one_or_none()

    if memory_entry is None:
        memory_entry = Memory(user_id=user_id, key=key, value=value)
        db.add(memory_entry)
    else:
        memory_entry.value = value

    await db.flush()
    return memory_entry


@router.post("/name")
async def save_name(
    request: NameRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save or update the onboarding display name."""
    try:
        profile = await get_or_create_profile(db, current_user.id)
        profile.display_name = request.display_name
        await db.flush()

        return api_success(
            {
                "display_name": profile.display_name,
                "onboarding_done": profile.onboarding_done,
            },
            "Display name saved successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save display name: {exc}",
        ) from exc


@router.post("/topics")
async def save_topics(
    request: TopicsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save onboarding topics, complete onboarding, and persist memory."""
    try:
        profile = await get_or_create_profile(db, current_user.id)
        apply_topics_submission(profile, request.topics)
        await db.flush()

        if profile.display_name:
            await upsert_memory_entry(db, current_user.id, "user_name", profile.display_name)
        await upsert_memory_entry(
            db,
            current_user.id,
            "user_topics",
            serialize_topics_for_memory(request.topics),
        )

        return api_success(
            {
                "topics": profile.topics,
                "onboarding_done": profile.onboarding_done,
            },
            "Topics saved successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save topics: {exc}",
        ) from exc


@router.get("/status")
async def get_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the user's onboarding completion status."""
    try:
        result = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
        profile = result.scalar_one_or_none()

        return api_success(
            {"onboarding_done": onboarding_status_from_profile(profile)},
            "Onboarding status retrieved successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get onboarding status: {exc}",
        ) from exc
