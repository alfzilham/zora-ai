"""
ZORA AI - Orchestrator
======================
Routes prepared chat messages to the correct provider adapter.
"""

from typing import AsyncGenerator

from app.services.gemini import generate_gemini_response, stream_gemini_response
from app.services.groq_service import complete_groq, prethink_with_groq, stream_groq_response
from app.services.nvidia import generate_nvidia_response, stream_nvidia_response
from app.utils.prompt_builder import build_api_messages, build_system_prompt


NVIDIA_MODELS = {"nemotron", "deepseek", "qwen", "kimi", "minimax", "glm", "gemma", "mistral"}


def prepare_messages(
    model_name: str,
    messages: list[dict],
    system_prompt: str | None = None,
    user_memory: dict | None = None,
) -> list[dict]:
    """Prepare provider-ready messages with the ZORA system prompt."""
    final_system_prompt = system_prompt or build_system_prompt(
        user_memory=user_memory,
        chat_history=messages[:-1] if messages else [],
    )
    return build_api_messages(messages=messages, user_memory=user_memory, system_prompt=final_system_prompt)


async def generate_response(
    model_name: str,
    messages: list[dict],
    system_prompt: str | None = None,
    user_memory: dict | None = None,
) -> str:
    """Generate a standard non-streaming response from the selected provider."""
    prepared_messages = prepare_messages(model_name, messages, system_prompt, user_memory)

    if model_name in NVIDIA_MODELS:
        return await generate_nvidia_response(model_name, prepared_messages)
    if model_name == "gemini":
        return await generate_gemini_response(prepared_messages)
    if model_name == "groq":
        return await complete_groq(prepared_messages)

    return await generate_nvidia_response("nemotron", prepared_messages)


async def stream_response(
    model_name: str,
    messages: list[dict],
    system_prompt: str | None = None,
    user_memory: dict | None = None,
) -> AsyncGenerator[str, None]:
    """Stream a response from the selected provider."""
    prepared_messages = prepare_messages(model_name, messages, system_prompt, user_memory)

    if model_name in NVIDIA_MODELS:
        async for chunk in stream_nvidia_response(model_name, prepared_messages):
            yield chunk
        return

    if model_name == "gemini":
        async for chunk in stream_gemini_response(prepared_messages):
            yield chunk
        return

    if model_name == "groq":
        async for chunk in stream_groq_response(prepared_messages):
            yield chunk
        return

    async for chunk in stream_nvidia_response("nemotron", prepared_messages):
        yield chunk


async def build_prethink_messages(messages: list[dict]) -> str:
    """Run the pre-thinking layer and return the intermediate summary."""
    return await prethink_with_groq(messages)
