"""
ZORA AI - NVIDIA Service
========================
Adapter for NVIDIA NIM-compatible chat models with fallback handling.
"""

import asyncio
from typing import AsyncGenerator

from app.config import settings


NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"

# (model_id, settings_field_name)
MODEL_CONFIG = {
    "nemotron": ("nvidia/nemotron-3-super-120b-a12b",    "NVIDIA_API_KEY_NEMOTRON"),
    "deepseek": ("deepseek-ai/deepseek-v3.2",             "NVIDIA_API_KEY_DEEPSEEK"),
    "qwen":     ("qwen/qwen3.5-122b-a10b",                "NVIDIA_API_KEY_QWEN"),
    "kimi":     ("moonshotai/kimi-k2.5",                  "NVIDIA_API_KEY_KIMI"),
    "minimax":  ("minimax/minimax-m2.7",                  "NVIDIA_API_KEY_MINIMAX"),
    "glm":      ("z-ai/glm-5.1",                          "NVIDIA_API_KEY_GLM"),
    "gemma":    ("google/gemma-4-31b-it",                 "NVIDIA_API_KEY_GEMMA"),
    "mistral":  ("mistralai/mistral-small-4-119b-2603",   "NVIDIA_API_KEY_MISTRAL"),
}


def _split_text_chunks(text: str, chunk_size: int = 32) -> list[str]:
    return [text[index:index + chunk_size] for index in range(0, len(text), chunk_size)] or [""]


def _resolve_api_key(model_name: str) -> str | None:
    _, field_name = MODEL_CONFIG.get(model_name, MODEL_CONFIG["nemotron"])
    return getattr(settings, field_name, None) or settings.NVIDIA_API_KEY_FALLBACK


def _fallback_response(model_name: str, messages: list[dict]) -> str:
    user_text = next(
        (message.get("content", "") for message in reversed(messages) if message.get("role") == "user"),
        "",
    ).strip()
    return (
        f"ZORA ({model_name}) is running in local MVP mode. "
        f"I received: {user_text or 'your message'}"
    )


async def _fallback_stream(model_name: str, messages: list[dict]) -> AsyncGenerator[str, None]:
    text = _fallback_response(model_name, messages)
    for chunk in _split_text_chunks(text):
        await asyncio.sleep(0)
        yield chunk


async def generate_nvidia_response(model_name: str, messages: list[dict], temperature: float = 0.4) -> str:
    """Generate a standard text response via NVIDIA NIM or fallback."""
    try:
        from openai import AsyncOpenAI, RateLimitError
    except ImportError:
        return _fallback_response(model_name, messages)

    model_id, _ = MODEL_CONFIG.get(model_name, MODEL_CONFIG["nemotron"])
    primary_key = _resolve_api_key(model_name)

    if not primary_key:
        return _fallback_response(model_name, messages)

    async def _call(api_key: str) -> str:
        client = AsyncOpenAI(api_key=api_key, base_url=NVIDIA_BASE_URL)
        response = await client.chat.completions.create(
            model=model_id,
            messages=messages,
            temperature=temperature,
        )
        return response.choices[0].message.content or ""

    try:
        return await _call(primary_key)
    except Exception:
        fallback_key = settings.nvidia_api_key_fallback
        if fallback_key and fallback_key != primary_key:
            try:
                return await _call(fallback_key)
            except Exception:
                pass
        return _fallback_response(model_name, messages)


async def stream_nvidia_response(
    model_name: str,
    messages: list[dict],
    temperature: float = 0.4,
) -> AsyncGenerator[str, None]:
    """Stream a response via NVIDIA NIM or fallback."""
    try:
        from openai import AsyncOpenAI
    except ImportError:
        async for chunk in _fallback_stream(model_name, messages):
            yield chunk
        return

    model_id, _ = MODEL_CONFIG.get(model_name, MODEL_CONFIG["nemotron"])
    primary_key = _resolve_api_key(model_name)

    if not primary_key:
        async for chunk in _fallback_stream(model_name, messages):
            yield chunk
        return

    async def _stream(api_key: str) -> AsyncGenerator[str, None]:
        client = AsyncOpenAI(api_key=api_key, base_url=NVIDIA_BASE_URL)
        stream = await client.chat.completions.create(
            model=model_id,
            messages=messages,
            temperature=temperature,
            stream=True,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield delta

    try:
        async for piece in _stream(primary_key):
            yield piece
        return
    except Exception:
        fallback_key = settings.nvidia_api_key_fallback
        if fallback_key and fallback_key != primary_key:
            try:
                async for piece in _stream(fallback_key):
                    yield piece
                return
            except Exception:
                pass

    async for chunk in _fallback_stream(model_name, messages):
        yield chunk
