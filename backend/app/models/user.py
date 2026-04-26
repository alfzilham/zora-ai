"""
ZORA AI - User Models
=====================
SQLAlchemy models for authentication and onboarding profile data.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    """User model for authentication and profile management."""

    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
        index=True
    )
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=True)
    google_id = Column(String(255), nullable=True, unique=True, index=True)
    github_id = Column(String(255), nullable=True, unique=True, index=True)
    phone = Column(String(20), nullable=True, unique=True, index=True)
    avatar_url = Column(String(500), nullable=True)
    country = Column(String(100), nullable=True, default="Unknown")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_user_email", "email"),
        Index("idx_user_google_id", "google_id"),
        Index("idx_user_github_id", "github_id"),
        Index("idx_user_phone", "phone"),
    )

    def __repr__(self) -> str:
        return f"User(id={self.id}, email={self.email}, name={self.name})"

    # Relationship
    feedbacks = relationship("Feedback", back_populates="user", lazy="select")

    def to_dict(self) -> dict:
        """Convert user model to dictionary (excludes sensitive data)."""
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
            "avatar_url": self.avatar_url,
            "country": self.country or "Unknown",
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class UserProfile(Base):
    """Per-user onboarding profile and preferences."""

    __tablename__ = "user_profiles"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False
    )
    display_name = Column(String(255), nullable=True)
    topics = Column(JSONB, nullable=False, default=list)
    language = Column(String(10), nullable=False, default="id")
    onboarding_done = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.topics is None:
            self.topics = []
        if self.language is None:
            self.language = "id"
        if self.onboarding_done is None:
            self.onboarding_done = False

    def to_dict(self) -> dict:
        return {
            "user_id": str(self.user_id) if self.user_id else None,
            "display_name": self.display_name,
            "topics": self.topics or [],
            "language": self.language,
            "onboarding_done": self.onboarding_done,
        }
