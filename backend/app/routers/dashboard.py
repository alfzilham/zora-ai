"""
ZORA AI - Dashboard Router
==========================
Developer-only dashboard stats and local disbursement endpoints.
Security is handled by the frontend password gate.
"""

from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.models.withdrawal import Withdrawal
from app.services.xendit import verify_webhook

router = APIRouter()

EARNING_PER_USER = 1_000_000


def api_success(data: dict, message: str) -> dict:
    return {
        "status": "success",
        "success": True,
        "data": data,
        "message": message,
    }


def calculate_total_earnings(total_users: int) -> int:
    return total_users * EARNING_PER_USER


def aggregate_users_by_country(users: list[dict]) -> list[dict]:
    counts = defaultdict(int)
    for user in users:
        country = (user.get("country") or "").strip() or "Unknown"
        counts[country] += 1
    return [
        {"country": country, "count": count}
        for country, count in sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    ]


def aggregate_users_by_month(users: list[dict]) -> list[dict]:
    counts = defaultdict(int)
    for user in users:
        created_at = user.get("created_at")
        if not created_at:
            continue
        counts[(created_at.year, created_at.month)] += 1
    return [
        {"year": year, "month": month, "count": count}
        for (year, month), count in sorted(counts.items())
    ]


def aggregate_recent_signups(users: list[dict], limit: int = 10) -> list[dict]:
    sorted_users = sorted(users, key=lambda item: item.get("created_at") or datetime.min, reverse=True)
    return [
        {
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "country": (user.get("country") or "").strip() or "Unknown",
            "created_at": user.get("created_at").isoformat() if user.get("created_at") else None,
        }
        for user in sorted_users[:limit]
    ]


# ── Request Models ─────────────────────────────────────────────────────────

class WithdrawLocalRequest(BaseModel):
    amount: int = Field(..., gt=0)
    bank_code: str = Field(..., min_length=2, max_length=20)
    account_number: str = Field(..., min_length=4, max_length=64)
    account_holder_name: str = Field(..., min_length=2, max_length=255)
    note: str | None = Field(None, max_length=500)

    @field_validator("bank_code", "account_number", "account_holder_name")
    @classmethod
    def strip_values(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field is required")
        return value


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        now = datetime.utcnow()
        result = await db.execute(select(User).order_by(User.created_at.desc()))
        users = result.scalars().all()

        user_rows = [
            {
                "name": user.name,
                "email": user.email,
                "country": user.country or "Unknown",
                "created_at": user.created_at,
            }
            for user in users
        ]

        total_users = len(user_rows)
        users_this_month = sum(
            1 for user in user_rows
            if user["created_at"] and user["created_at"].year == now.year and user["created_at"].month == now.month
        )
        users_this_year = sum(
            1 for user in user_rows if user["created_at"] and user["created_at"].year == now.year
        )

        return api_success(
            {
                "total_users": total_users,
                "total_earnings": calculate_total_earnings(total_users),
                "users_this_month": users_this_month,
                "users_this_year": users_this_year,
                "users_by_country": aggregate_users_by_country(user_rows),
                "users_by_month": aggregate_users_by_month(user_rows),
                "recent_signups": aggregate_recent_signups(user_rows),
            },
            "Dashboard stats retrieved successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load dashboard stats: {exc}") from exc


@router.post("/dashboard/withdraw")
async def create_withdrawal(
    request: WithdrawLocalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a local withdrawal request — no external gateway needed."""
    try:
        withdrawal = Withdrawal(
            amount=request.amount,
            bank_code=request.bank_code.upper(),
            account_number=request.account_number,
            account_holder_name=request.account_holder_name,
            note=request.note,
            status="PENDING",
        )
        db.add(withdrawal)
        await db.flush()

        return api_success(
            withdrawal.to_dict(),
            "Withdrawal request created. Transfer the amount manually then confirm.",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create withdrawal: {exc}") from exc


@router.get("/dashboard/withdrawals")
async def list_withdrawals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all withdrawal requests ordered by newest first."""
    try:
        result = await db.execute(
            select(Withdrawal).order_by(Withdrawal.created_at.desc())
        )
        withdrawals = result.scalars().all()

        total_amount     = sum(w.amount for w in withdrawals if w.status == "COMPLETED")
        pending_amount   = sum(w.amount for w in withdrawals if w.status == "PENDING")
        cancelled_amount = sum(w.amount for w in withdrawals if w.status == "CANCELLED")

        return api_success(
            {
                "withdrawals": [w.to_dict() for w in withdrawals],
                "total": len(withdrawals),
                "summary": {
                    "total_completed": total_amount,
                    "total_pending": pending_amount,
                    "total_cancelled": cancelled_amount,
                    "count_completed": sum(1 for w in withdrawals if w.status == "COMPLETED"),
                    "count_pending": sum(1 for w in withdrawals if w.status == "PENDING"),
                    "count_cancelled": sum(1 for w in withdrawals if w.status == "CANCELLED"),
                }
            },
            "Withdrawals retrieved successfully",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to list withdrawals: {exc}") from exc


@router.put("/dashboard/withdrawals/{withdrawal_id}/confirm")
async def confirm_withdrawal(
    withdrawal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a PENDING withdrawal as COMPLETED after manual transfer."""
    try:
        from uuid import UUID as PyUUID
        result = await db.execute(
            select(Withdrawal).where(Withdrawal.id == PyUUID(withdrawal_id))
        )
        withdrawal = result.scalar_one_or_none()

        if not withdrawal:
            raise HTTPException(status_code=404, detail="Withdrawal not found")

        if withdrawal.status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot confirm withdrawal with status: {withdrawal.status}"
            )

        withdrawal.status = "COMPLETED"
        withdrawal.confirmed_at = datetime.utcnow()
        await db.flush()

        return api_success(withdrawal.to_dict(), "Withdrawal confirmed successfully")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to confirm withdrawal: {exc}") from exc


@router.put("/dashboard/withdrawals/{withdrawal_id}/cancel")
async def cancel_withdrawal(
    withdrawal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a PENDING withdrawal request."""
    try:
        from uuid import UUID as PyUUID
        result = await db.execute(
            select(Withdrawal).where(Withdrawal.id == PyUUID(withdrawal_id))
        )
        withdrawal = result.scalar_one_or_none()

        if not withdrawal:
            raise HTTPException(status_code=404, detail="Withdrawal not found")

        if withdrawal.status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel withdrawal with status: {withdrawal.status}"
            )

        withdrawal.status = "CANCELLED"
        await db.flush()

        return api_success(withdrawal.to_dict(), "Withdrawal cancelled")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to cancel withdrawal: {exc}") from exc


@router.post("/dashboard/xendit-webhook")
async def handle_xendit_webhook(
    request: Request,
    x_callback_token: str | None = Header(default=None, alias="x-callback-token"),
):
    try:
        if not verify_webhook(x_callback_token or ""):
            raise HTTPException(status_code=401, detail="Invalid webhook token")
        payload = await request.json()
        return api_success(
            {"received": True, "status": payload.get("status", "UNKNOWN")},
            "Webhook processed successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to process webhook: {exc}") from exc