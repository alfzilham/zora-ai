"""
ZORA AI - Groq Service
======================
Groq adapter for intent detection and optional pre-thinking.
"""

import asyncio
from typing import AsyncGenerator

from app.config import settings


MODEL_NAME = "llama-3.3-70b-versatile"


def _split_text_chunks(text: str, chunk_size: int = 32) -> list[str]:
    return [text[index:index + chunk_size] for index in range(0, len(text), chunk_size)] or [""]


async def _fallback_stream(text: str) -> AsyncGenerator[str, None]:
    for chunk in _split_text_chunks(text):
        await asyncio.sleep(0)
        yield chunk


def _build_local_response(messages: list[dict], mode: str = "chat") -> str:
    user_text = next(
        (message.get("content", "") for message in reversed(messages) if message.get("role") == "user"),
        "",
    ).strip()

    if mode == "prethink":
        return (
            "Pre-thinking summary:\n"
            f"- Intent analyzed for: {user_text or 'general request'}\n"
            "- Focus on a concise, helpful final answer.\n"
            "- Keep the response aligned with ZORA's unified voice."
        )

    return f"ZORA fallback response via Groq path: {user_text or 'Hello.'}"


async def complete_groq(messages: list[dict], temperature: float = 0.2) -> str:
    """Return a non-streaming Groq completion or local fallback."""
    try:
        from groq import AsyncGroq
    except ImportError:
        return _build_local_response(messages)

    if not settings.groq_api_key:
        return _build_local_response(messages)

    client = AsyncGroq(api_key=settings.groq_api_key)

    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=temperature,
        )
        return response.choices[0].message.content or ""
    except Exception:
        return _build_local_response(messages)


async def prethink_with_groq(messages: list[dict]) -> str:
    """Run a pre-thinking pass before the primary model."""
    system_message = {
        "role": "system",
        "content": (
            "Think through the user's request and produce a short internal summary "
            "with useful context for the final answering model."
        ),
    }
    augmented_messages = [system_message, *messages]

    try:
        from groq import AsyncGroq
    except ImportError:
        return _build_local_response(messages, mode="prethink")

    if not settings.groq_api_key:
        return _build_local_response(messages, mode="prethink")

    client = AsyncGroq(api_key=settings.groq_api_key)

    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=augmented_messages,
            temperature=0.3,
        )
        return response.choices[0].message.content or ""
    except Exception:
        return _build_local_response(messages, mode="prethink")


async def stream_groq_response(messages: list[dict], temperature: float = 0.4) -> AsyncGenerator[str, None]:
    """Stream Groq output or local fallback text."""
    try:
        from groq import AsyncGroq
    except ImportError:
        async for chunk in _fallback_stream(_build_local_response(messages)):
            yield chunk
        return

    if not settings.groq_api_key:
        async for chunk in _fallback_stream(_build_local_response(messages)):
            yield chunk
        return

    client = AsyncGroq(api_key=settings.groq_api_key)

    try:
        stream = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=temperature,
            stream=True,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield delta
    except Exception:
        async for chunk in _fallback_stream(_build_local_response(messages)):
            yield chunk
