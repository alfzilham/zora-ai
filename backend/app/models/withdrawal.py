"""
ZORA AI - Withdrawal Model
==========================
SQLAlchemy model for local disbursement tracking.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Withdrawal(Base):
    """Local withdrawal request model — no external payment gateway required."""

    __tablename__ = "withdrawals"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
        index=True
    )
    amount = Column(Integer, nullable=False)
    bank_code = Column(String(20), nullable=False)
    account_number = Column(String(64), nullable=False)
    account_holder_name = Column(String(255), nullable=False)
    note = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="PENDING")
    # PENDING → COMPLETED → CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    confirmed_at = Column(DateTime, nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "amount": self.amount,
            "bank_code": self.bank_code,
            "account_number": self.account_number,
            "account_holder_name": self.account_holder_name,
            "note": self.note,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "confirmed_at": self.confirmed_at.isoformat() if self.confirmed_at else None,
        }