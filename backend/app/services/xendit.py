"""
ZORA AI - Xendit Service
========================
Async helpers for Xendit disbursement and webhook validation.
"""

import base64

import httpx

from app.config import settings


XENDIT_DISBURSEMENT_URL = "https://api.xendit.co/disbursements"


def verify_webhook(token: str, expected_token: str | None = None) -> bool:
    """Verify the incoming Xendit webhook token."""
    expected = expected_token if expected_token is not None else settings.XENDIT_WEBHOOK_TOKEN
    return bool(expected and token == expected)


async def create_disbursement(
    amount: int,
    bank_code: str,
    account_number: str,
    account_holder_name: str,
) -> dict:
    """Create a Xendit disbursement request."""
    secret_key = settings.XENDIT_SECRET_KEY or settings.xendit_secret_key
    if not secret_key:
        raise ValueError("Xendit secret key is not configured")

    auth_value = base64.b64encode(f"{secret_key}:".encode("utf-8")).decode("utf-8")
    headers = {
        "Authorization": f"Basic {auth_value}",
        "Content-Type": "application/json",
    }
    payload = {
        "external_id": f"zora-disbursement-{amount}-{account_number}",
        "amount": amount,
        "bank_code": bank_code,
        "account_holder_name": account_holder_name,
        "account_number": account_number,
        "description": "ZORA AI developer withdrawal",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(XENDIT_DISBURSEMENT_URL, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

    return {
        "disbursement_id": data.get("id", ""),
        "status": data.get("status", "PENDING"),
        "message": "Disbursement created successfully",
    }


async def get_disbursements(limit: int = 20) -> list:
    """Fetch list of disbursements from Xendit."""
    secret_key = settings.XENDIT_SECRET_KEY or settings.xendit_secret_key
    if not secret_key:
        raise ValueError("Xendit secret key is not configured")

    auth_value = base64.b64encode(f"{secret_key}:".encode("utf-8")).decode("utf-8")
    headers = {
        "Authorization": f"Basic {auth_value}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(
            XENDIT_DISBURSEMENT_URL,
            headers=headers,
            params={"limit": limit},
        )
        response.raise_for_status()
        data = response.json()

    # Xendit returns a list directly
    items = data if isinstance(data, list) else data.get("data", [])

    return [
        {
            "id": item.get("id", ""),
            "external_id": item.get("external_id", ""),
            "amount": item.get("amount", 0),
            "bank_code": item.get("bank_code", ""),
            "account_number": item.get("account_number", ""),
            "account_holder_name": item.get("account_holder_name", ""),
            "status": item.get("status", "UNKNOWN"),
            "description": item.get("description", ""),
            "created": item.get("created", ""),
            "updated": item.get("updated", ""),
        }
        for item in items
    ]