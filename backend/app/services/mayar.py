"""
ZORA AI - Mayar Service
========================
Async helper untuk Mayar Single Payment Request API.
"""

import httpx
from datetime import datetime, timedelta

from app.config import settings

MAYAR_API_URL = "https://api.mayar.id/hl/v1/payment/create"


def verify_webhook(token: str) -> bool:
    expected = settings.MAYAR_WEBHOOK_TOKEN or ""
    return bool(expected and token == expected)


async def create_payment_request(
    amount: int,
    name: str,
    email: str,
    mobile: str,
    description: str,
) -> dict:
    api_key = settings.MAYAR_API_KEY
    if not api_key:
        raise ValueError("Mayar API key is not configured")

    expired_at = (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%dT%H:%M:%S.000Z")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "name": name,
        "email": email,
        "amount": amount,
        "mobile": mobile,
        "redirectUrl": settings.APP_URL,
        "description": description,
        "expiredAt": expired_at,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(MAYAR_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

    result_data = data.get("data", {})
    return {
        "mayar_id": result_data.get("id", ""),
        "transaction_id": result_data.get("transactionId", ""),
        "payment_link": result_data.get("link", ""),
        "status": "PENDING",
        "message": "Payment request created successfully",
    }