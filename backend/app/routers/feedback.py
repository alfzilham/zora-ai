"""
ZORA AI - Feedback Router
=========================
Handles all feedback-related endpoints:
- POST /feedback          → submit feedback (user)
- GET  /feedback/my       → get own feedback (user)
- GET  /feedback/all      → get all feedback (admin)
- POST /feedback/reply/{user_id} → reply to user feedback (admin)
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User

router = APIRouter()


# ── MODELS ────────────────────────────────────────────
class FeedbackSubmit(BaseModel):
    category:   str
    rating:     int
    message:    str
    screenshot: Optional[str] = None   # base64 string


class FeedbackReply(BaseModel):
    reply: str


# ── HELPER: build response dict ───────────────────────
def feedback_to_dict(fb, user: User = None) -> dict:
    return {
        "id":              str(fb.id),
        "user_id":         str(fb.user_id),
        "user_name":       user.name        if user else None,
        "user_email":      user.email       if user else None,
        "avatar_url":      user.avatar_url  if user else None,
        "message":         fb.message,
        "category":        fb.category,
        "rating":          fb.rating,
        "screenshot_url":  fb.screenshot_url,
        "reply":           fb.reply,
        "reply_at":        fb.reply_at.isoformat() if fb.reply_at else None,
        "read_by_admin":   fb.read_by_admin,
        "created_at":      fb.created_at.isoformat() if fb.created_at else None,
    }


# ── POST /feedback ────────────────────────────────────
@router.post("")
async def submit_feedback(
    payload: FeedbackSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a new feedback from the current user."""

    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Rating must be between 1 and 5",
        )

    if not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message cannot be empty",
        )

    # Import here to avoid circular imports
    from app.models.feedback import Feedback

    fb = Feedback(
        id=uuid.uuid4(),
        user_id=current_user.id,
        message=payload.message.strip(),
        category=payload.category,
        rating=payload.rating,
        screenshot_url=payload.screenshot,   # store base64 or URL
        reply=None,
        reply_at=None,
        read_by_admin=False,
        created_at=datetime.now(timezone.utc),
    )

    db.add(fb)
    await db.commit()
    await db.refresh(fb)

    return {
        "success": True,
        "data":    feedback_to_dict(fb, current_user),
        "message": "Feedback submitted successfully",
    }


# ── GET /feedback/my ──────────────────────────────────
@router.get("/my")
async def get_my_feedback(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all feedback submitted by the current user."""

    from app.models.feedback import Feedback

    result = await db.execute(
        select(Feedback)
        .where(Feedback.user_id == current_user.id)
        .order_by(Feedback.created_at.asc())
    )
    feedbacks = result.scalars().all()

    return {
        "success": True,
        "data": [feedback_to_dict(fb, current_user) for fb in feedbacks],
    }


# ── GET /feedback/all ─────────────────────────────────
@router.get("/all")
async def get_all_feedback(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all feedback from all users (admin use)."""

    from app.models.feedback import Feedback

    # Fetch all feedbacks with their users
    result = await db.execute(
        select(Feedback, User)
        .join(User, Feedback.user_id == User.id)
        .order_by(Feedback.created_at.desc())
    )
    rows = result.all()

    data = [feedback_to_dict(fb, user) for fb, user in rows]

    return {
        "success": True,
        "data": data,
    }


# ── POST /feedback/reply/{user_id} ────────────────────
@router.post("/reply/{user_id}")
async def reply_to_feedback(
    user_id: str,
    payload: FeedbackReply,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reply to the latest feedback from a specific user."""

    from app.models.feedback import Feedback

    if not payload.reply.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Reply cannot be empty",
        )

    # Get the latest feedback from this user
    result = await db.execute(
        select(Feedback)
        .where(Feedback.user_id == uuid.UUID(user_id))
        .order_by(Feedback.created_at.desc())
        .limit(1)
    )
    fb = result.scalar_one_or_none()

    if not fb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No feedback found for this user",
        )

    fb.reply          = payload.reply.strip()
    fb.reply_at       = datetime.now(timezone.utc)
    fb.read_by_admin  = True

    await db.commit()
    await db.refresh(fb)

    # Get user info for response
    user_result = await db.execute(select(User).where(User.id == fb.user_id))
    user = user_result.scalar_one_or_none()

    return {
        "success": True,
        "data":    feedback_to_dict(fb, user),
        "message": "Reply sent successfully",
    }


# ── POST /feedback/read/{feedback_id} ─────────────────
@router.post("/read/{feedback_id}")
async def mark_feedback_read(
    feedback_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a specific feedback as read by admin."""

    from app.models.feedback import Feedback

    result = await db.execute(
        select(Feedback).where(Feedback.id == uuid.UUID(feedback_id))
    )
    fb = result.scalar_one_or_none()

    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")

    fb.read_by_admin = True
    await db.commit()

    return {"success": True, "message": "Marked as read"}