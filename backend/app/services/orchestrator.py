"""
ZORA AI - Orchestrator
======================
Routes prepared chat messages to the correct provider adapter.
"""

import re
from typing import AsyncGenerator

from app.services.gemini import generate_gemini_response, stream_gemini_response
from app.services.groq_service import complete_groq, prethink_with_groq, stream_groq_response
from app.services.nvidia import generate_nvidia_response, stream_nvidia_response
from app.utils.prompt_builder import build_api_messages, build_system_prompt


NVIDIA_MODELS = {"nemotron", "deepseek", "qwen", "kimi", "minimax", "glm", "gemma", "mistral"}

_THINKING_PROMPT = """Before answering, think deeply inside <think>...</think> tags.
Use this space to break down the problem, consider approaches, and plan your response.
After </think>, provide your actual answer directly without any preamble.

"""


def _extract_thinking(text: str) -> tuple[str, str]:
    """
    Separate <think>...</think> blocks from the final answer.
    Returns: (thinking, answer)
    """
    think_blocks = re.findall(r'<think>(.*?)</think>', text, re.DOTALL | re.IGNORECASE)
    answer = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL | re.IGNORECASE).strip()
    thinking = "\n\n".join(block.strip() for block in think_blocks)
    return thinking, answer


def _strip_thinking_from_chunk(buffer: str, in_think: bool) -> tuple[str, str, bool]:
    """
    Process a streaming chunk and strip <think> blocks on the fly.
    Returns: (clean_chunk, remaining_buffer, in_think_state)
    """
    result = ""

    while buffer:
        if in_think:
            end_idx = buffer.find("</think>")
            if end_idx == -1:
                # Still inside think block, consume all
                return result, "", True
            else:
                # Found end of think block
                buffer = buffer[end_idx + len("</think>"):]
                in_think = False
        else:
            start_idx = buffer.find("<think>")
            if start_idx == -1:
                # No think block, yield everything
                result += buffer
                return result, "", False
            else:
                # Yield content before think block
                result += buffer[:start_idx]
                buffer = buffer[start_idx + len("<think>"):]
                in_think = True

    return result, "", in_think


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
    """Stream a response from the selected provider, stripping <think> blocks."""
    prepared_messages = prepare_messages(model_name, messages, system_prompt, user_memory)

    async def _stream_source() -> AsyncGenerator[str, None]:
        if model_name in NVIDIA_MODELS:
            async for chunk in stream_nvidia_response(model_name, prepared_messages):
                yield chunk
        elif model_name == "gemini":
            async for chunk in stream_gemini_response(prepared_messages):
                yield chunk
        elif model_name == "groq":
            async for chunk in stream_groq_response(prepared_messages):
                yield chunk
        else:
            async for chunk in stream_nvidia_response("nemotron", prepared_messages):
                yield chunk

    # Strip <think> blocks on the fly during streaming
    buffer = ""
    in_think = False

    async for raw_chunk in _stream_source():
        buffer += raw_chunk
        clean_chunk, buffer, in_think = _strip_thinking_from_chunk(buffer, in_think)
        if clean_chunk:
            yield clean_chunk

    # Flush remaining buffer
    if buffer and not in_think:
        clean_chunk, _, _ = _strip_thinking_from_chunk(buffer, in_think)
        if clean_chunk:
            yield clean_chunk


async def build_prethink_messages(messages: list[dict]) -> str:
    """Run the pre-thinking layer and return the intermediate summary."""
    thinking_messages = [
        {
            "role": "system",
            "content": _THINKING_PROMPT,
        },
        *messages,
    ]
    raw = await prethink_with_groq(thinking_messages)
    _, answer = _extract_thinking(raw)
    return answer or raw
