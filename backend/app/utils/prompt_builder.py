"""
ZORA AI - Prompt Builder
========================
Helpers for loading system prompts and building final model messages.
"""

from pathlib import Path


PROMPTS_DIR = Path(__file__).resolve().parents[2] / "prompts"
SYSTEM_PROMPTS_DIR = PROMPTS_DIR / "system"


def load_prompt_file(relative_path: str) -> str:
    """Load a prompt file from the backend prompts directory."""
    file_path = PROMPTS_DIR / relative_path
    return file_path.read_text(encoding="utf-8").strip()


def load_system_prompts() -> tuple[str, str]:
    """Load the main and personality system prompts."""
    main_prompt = (SYSTEM_PROMPTS_DIR / "zora_main.txt").read_text(encoding="utf-8").strip()
    personality_prompt = (SYSTEM_PROMPTS_DIR / "zora_personality.txt").read_text(encoding="utf-8").strip()
    return main_prompt, personality_prompt


def format_chat_history(chat_history: list[dict]) -> str:
    """Render recent chat history into a plain-text transcript."""
    if not chat_history:
        return "No previous conversation."

    return "\n".join(
        f"{message.get('role', 'user')}: {message.get('content', '').strip()}"
        for message in chat_history
        if message.get("content")
    )


def normalize_user_memory(user_memory: dict | None) -> dict:
    """Provide stable user memory defaults for prompt templating."""
    user_memory = user_memory or {}
    topics = user_memory.get("user_topics") or []
    if isinstance(topics, list):
        topics_text = ", ".join(topics) if topics else "Unknown"
    else:
        topics_text = str(topics)

    return {
        "user_name": user_memory.get("user_name") or "there",
        "user_topics": topics_text,
        "user_language": user_memory.get("user_language") or "id",
    }


def build_system_prompt(user_memory: dict | None = None, chat_history: list[dict] | None = None) -> str:
    """Build the final system prompt with injected user memory and history."""
    main_prompt, personality_prompt = load_system_prompts()
    memory = normalize_user_memory(user_memory)
    history = format_chat_history(chat_history or [])

    combined_prompt = "\n\n".join([main_prompt, personality_prompt])
    return combined_prompt.format(
        user_name=memory["user_name"],
        user_topics=memory["user_topics"],
        user_language=memory["user_language"],
        chat_history=history,
    )


def build_api_messages(
    messages: list[dict],
    user_memory: dict | None = None,
    system_prompt: str | None = None,
) -> list[dict]:
    """Construct the full message array to send to a provider."""
    final_system_prompt = system_prompt or build_system_prompt(
        user_memory=user_memory,
        chat_history=messages[:-1] if messages else [],
    )

    return [{"role": "system", "content": final_system_prompt}, *messages]
