"""
ZORA AI - Gemini Service
========================
Adapter for Gemini responses with MVP-safe local fallback.
"""

import asyncio
import base64
import uuid
from pathlib import Path
from typing import AsyncGenerator

from app.config import settings


MODEL_NAME = "gemini-2.0-flash"
IMAGE_MODEL_NAME = "gemini-2.0-flash-exp-image-generation"
GENERATED_DIR = Path(__file__).resolve().parents[2] / "static" / "generated"


def _combine_messages(messages: list[dict]) -> str:
    return "\n".join(
        f"{message.get('role', 'user')}: {message.get('content', '').strip()}"
        for message in messages
        if message.get("content")
    )


def _fallback_response(messages: list[dict]) -> str:
    user_text = next(
        (message.get("content", "") for message in reversed(messages) if message.get("role") == "user"),
        "",
    ).strip()
    return (
        "ZORA research fallback is active in local MVP mode. "
        f"Here is a quick response to: {user_text or 'your message'}"
    )


def optimize_image_prompt(prompt: str, style: str, system_prompt: str | None = None) -> str:
    """Create the final prompt sent to Gemini image generation."""
    prefix = f"{system_prompt.strip()} " if system_prompt else ""
    return f"{prefix}{prompt.strip()}, {style} style, high quality, detailed, 4K"


def _save_base64_image(base64_data: str, extension: str = "png") -> str:
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}.{extension}"
    output_path = GENERATED_DIR / filename
    output_path.write_bytes(base64.b64decode(base64_data))
    return f"/static/generated/{filename}"


def _save_placeholder_svg(prompt: str, style: str) -> str:
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}.svg"
    output_path = GENERATED_DIR / filename
    label = f"{style.title()} render"
    subtitle = (prompt[:72] + "...") if len(prompt) > 72 else prompt
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<defs>
<linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#0a0a0f"/>
<stop offset="100%" stop-color="#0e2532"/>
</linearGradient>
</defs>
<rect width="1280" height="720" fill="url(#g)"/>
<circle cx="1050" cy="160" r="180" fill="rgba(0,212,255,0.12)"/>
<rect x="90" y="90" rx="32" ry="32" width="1100" height="540" fill="rgba(255,255,255,0.04)" stroke="rgba(0,212,255,0.35)" />
<text x="140" y="220" fill="#00D4FF" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="700">ZORA IMAGE MVP PREVIEW</text>
<text x="140" y="310" fill="#FFFFFF" font-family="Inter, Arial, sans-serif" font-size="64" font-weight="800">{label}</text>
<text x="140" y="390" fill="#A0A0B0" font-family="Inter, Arial, sans-serif" font-size="28">{subtitle}</text>
</svg>"""
    output_path.write_text(svg, encoding="utf-8")
    return f"/static/generated/{filename}"


async def generate_gemini_response(messages: list[dict]) -> str:
    """Generate Gemini text with graceful local fallback."""
    try:
        import google.generativeai as genai
    except ImportError:
        return _fallback_response(messages)

    if not settings.gemini_api_key:
        return _fallback_response(messages)

    prompt = _combine_messages(messages)

    def _call() -> str:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)
        return getattr(response, "text", "") or ""

    try:
        return await asyncio.to_thread(_call)
    except Exception:
        return _fallback_response(messages)


async def stream_gemini_response(messages: list[dict]) -> AsyncGenerator[str, None]:
    """Yield Gemini output in chunks, simulating streaming when needed."""
    text = await generate_gemini_response(messages)
    for index in range(0, len(text), 32):
        await asyncio.sleep(0)
        yield text[index:index + 32]


async def generate_image(prompt: str, style: str, system_prompt: str | None = None) -> dict:
    """Generate an image with Gemini or produce a local placeholder."""
    optimized_prompt = optimize_image_prompt(prompt, style, system_prompt)

    try:
        import google.generativeai as genai
    except ImportError:
        return {
            "image_url": _save_placeholder_svg(prompt, style),
            "optimized_prompt": optimized_prompt,
        }

    if not settings.gemini_api_key:
        return {
            "image_url": _save_placeholder_svg(prompt, style),
            "optimized_prompt": optimized_prompt,
        }

    def _call() -> dict:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(IMAGE_MODEL_NAME)
        response = model.generate_content(optimized_prompt)

        for candidate in getattr(response, "candidates", []) or []:
            for part in getattr(candidate.content, "parts", []) or []:
                inline_data = getattr(part, "inline_data", None)
                if inline_data and getattr(inline_data, "data", None):
                    image_url = _save_base64_image(inline_data.data)
                    return {
                        "image_url": image_url,
                        "optimized_prompt": optimized_prompt,
                    }

        return {
            "image_url": _save_placeholder_svg(prompt, style),
            "optimized_prompt": optimized_prompt,
        }

    try:
        return await asyncio.to_thread(_call)
    except Exception:
        return {
            "image_url": _save_placeholder_svg(prompt, style),
            "optimized_prompt": optimized_prompt,
        }
