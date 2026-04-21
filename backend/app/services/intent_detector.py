"""
ZORA AI - Intent Detector
=========================
Routing helper that selects the best model for a message.
"""

import json
import re

from app.services.groq_service import complete_groq
from app.utils.prompt_builder import load_prompt_file


DEFAULT_DECISION = {
    "primary_model": "nemotron",
    "pre_think": False,
    "confidence": 0.6,
    "reason": "Fallback general chat decision.",
}


def detect_intent_locally(user_message: str) -> dict:
    """Local routing heuristic used when Groq is unavailable."""
    message = (user_message or "").lower()

    if any(term in message for term in ["python", "javascript", "bug", "code", "debug", "api", "function"]):
        return {
            "primary_model": "qwen",
            "pre_think": False,
            "confidence": 0.92,
            "reason": "Code-related request detected.",
        }

    if any(term in message for term in ["equation", "solve", "math", "calculate", "logic", "step by step"]):
        return {
            "primary_model": "deepseek",
            "pre_think": True,
            "confidence": 0.9,
            "reason": "Analytical or mathematical request detected.",
        }

    if any(term in message for term in ["research", "latest", "news", "source", "citation", "trend"]):
        return {
            "primary_model": "gemini",
            "pre_think": False,
            "confidence": 0.88,
            "reason": "Research-oriented request detected.",
        }

    if any(term in message for term in ["story", "poem", "copy", "creative", "design brief", "headline"]):
        return {
            "primary_model": "minimax",
            "pre_think": False,
            "confidence": 0.87,
            "reason": "Creative generation request detected.",
        }

    if re.search(r"[\u4e00-\u9fff]", user_message or ""):
        return {
            "primary_model": "glm",
            "pre_think": False,
            "confidence": 0.9,
            "reason": "Chinese-language content detected.",
        }

    return DEFAULT_DECISION.copy()


def parse_routing_decision(raw_text: str) -> dict:
    """Parse a JSON routing decision, tolerating fenced responses."""
    cleaned = (raw_text or "").strip()
    cleaned = cleaned.replace("```json", "").replace("```", "").strip()

    try:
        parsed = json.loads(cleaned)
        return {
            "primary_model": parsed.get("primary_model", DEFAULT_DECISION["primary_model"]),
            "pre_think": bool(parsed.get("pre_think", DEFAULT_DECISION["pre_think"])),
            "confidence": float(parsed.get("confidence", DEFAULT_DECISION["confidence"])),
            "reason": parsed.get("reason", DEFAULT_DECISION["reason"]),
        }
    except (json.JSONDecodeError, TypeError, ValueError):
        return DEFAULT_DECISION.copy()


async def detect_intent(user_message: str) -> dict:
    """Use Groq routing if available, otherwise local heuristics."""
    classifier_prompt = load_prompt_file("routing/intent_classifier.txt")
    messages = [
        {"role": "system", "content": classifier_prompt},
        {"role": "user", "content": user_message},
    ]

    raw_response = await complete_groq(messages, temperature=0.1)
    decision = parse_routing_decision(raw_response)

    if decision == DEFAULT_DECISION:
        return detect_intent_locally(user_message)

    return decision
