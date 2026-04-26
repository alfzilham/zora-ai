"""
ZORA AI - Feedback Model
========================
SQLAlchemy model for the feedback table.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id         = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    message         = Column(Text, nullable=False)
    category        = Column(String(50), nullable=False, default="suggestion")
    rating          = Column(Integer, nullable=False, default=0)
    screenshot_url  = Column(Text, nullable=True)
    reply           = Column(Text, nullable=True)
    reply_at        = Column(DateTime(timezone=True), nullable=True)
    read_by_admin   = Column(Boolean, default=False, nullable=False)
    created_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship back to user
    user = relationship("User", back_populates="feedbacks", lazy="select")

    def __repr__(self):
        return f"<Feedback id={self.id} user_id={self.user_id} category={self.category}>"