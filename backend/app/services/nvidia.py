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
    """Stream a response via NVIDIA NIM with robust SSE parsing and fallback."""
    import json
    import httpx

    model_id, _ = MODEL_CONFIG.get(model_name, MODEL_CONFIG["nemotron"])
    primary_key = _resolve_api_key(model_name)

    if not primary_key:
        async for chunk in _fallback_stream(model_name, messages):
            yield chunk
        return

    # Nemotron uses OpenAI client with reasoning support
    if model_name == "nemotron":
        async for chunk in _stream_nemotron(primary_key, model_id, messages, temperature):
            yield chunk
        return

    async def _stream_sse(api_key: str) -> AsyncGenerator[str, None]:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "text/event-stream",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model_id,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 2048,
            "stream": True,
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{NVIDIA_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                ) as response:
                    if response.status_code != 200:
                        # Fallback to non-streaming
                        fallback_text = await generate_nvidia_response(
                            model_name, messages, temperature
                        )
                        yield fallback_text
                        return

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        if not line.startswith("data: "):
                            continue

                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break

                        try:
                            data = json.loads(data_str)
                            choices = data.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {}).get("content", "")
                                if delta:
                                    yield delta
                        except (json.JSONDecodeError, IndexError, KeyError):
                            continue

        except httpx.TimeoutException:
            fallback_text = await generate_nvidia_response(model_name, messages, temperature)
            yield fallback_text
        except httpx.HTTPError:
            raise

    try:
        async for piece in _stream_sse(primary_key):
            yield piece
        return
    except Exception:
        fallback_key = settings.NVIDIA_API_KEY_FALLBACK
        if fallback_key and fallback_key != primary_key:
            try:
                async for piece in _stream_sse(fallback_key):
                    yield piece
                return
            except Exception:
                pass

    async for chunk in _fallback_stream(model_name, messages):
        yield chunk


async def _stream_nemotron(
    api_key: str,
    model_id: str,
    messages: list[dict],
    temperature: float = 0.4,
) -> AsyncGenerator[str, None]:
    """Nemotron streaming via OpenAI client with reasoning support."""
    try:
        from openai import AsyncOpenAI
    except ImportError:
        yield _fallback_response("nemotron", messages)
        return

    client = AsyncOpenAI(
        api_key=api_key,
        base_url=NVIDIA_BASE_URL,
    )

    try:
        stream = await client.chat.completions.create(
            model=model_id,
            messages=messages,
            temperature=1,
            top_p=0.95,
            max_tokens=4096,
            extra_body={
                "chat_template_kwargs": {"enable_thinking": True},
                "reasoning_budget": 4096,
            },
            stream=True,
        )

        async for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield delta

    except Exception:
        fallback_key = settings.NVIDIA_API_KEY_FALLBACK
        if fallback_key and fallback_key != api_key:
            try:
                client = AsyncOpenAI(
                    api_key=fallback_key,
                    base_url=NVIDIA_BASE_URL,
                )
                stream = await client.chat.completions.create(
                    model=model_id,
                    messages=messages,
                    temperature=1,
                    top_p=0.95,
                    max_tokens=4096,
                    extra_body={
                        "chat_template_kwargs": {"enable_thinking": True},
                        "reasoning_budget": 4096,
                    },
                    stream=True,
                )
                async for chunk in stream:
                    if not chunk.choices:
                        continue
                    delta = chunk.choices[0].delta.content or ""
                    if delta:
                        yield delta
                return
            except Exception:
                pass
        yield _fallback_response("nemotron", messages)
