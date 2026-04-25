"""
ZORA AI - Dashboard Router
==========================
Developer-only dashboard stats and monetization endpoints.
Security is handled by the frontend password gate.
"""

from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.services.xendit import create_disbursement, verify_webhook

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


class WithdrawRequest(BaseModel):
    amount: int = Field(..., gt=0)
    bank_code: str = Field(..., min_length=2, max_length=20)
    account_number: str = Field(..., min_length=4, max_length=64)
    account_holder_name: str = Field(..., min_length=2, max_length=255)

    @field_validator("bank_code", "account_number", "account_holder_name")
    @classmethod
    def strip_values(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field is required")
        return value


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
            1
            for user in user_rows
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
async def withdraw_earnings(
    request: WithdrawRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        result = await create_disbursement(
            amount=request.amount,
            bank_code=request.bank_code,
            account_number=request.account_number,
            account_holder_name=request.account_holder_name,
        )
        return api_success(result, "Withdrawal request submitted successfully")
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create withdrawal: {exc}") from exc


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
            {
                "received": True,
                "status": payload.get("status", "UNKNOWN"),
            },
            "Webhook processed successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to process webhook: {exc}") from exc