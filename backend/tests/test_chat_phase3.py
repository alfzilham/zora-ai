import asyncio
import json
import unittest

from app.models.chat import Conversation
from app.routers.chat import (
    build_conversation_title,
    format_sse_event,
    should_persist_conversation,
)
from app.services.intent_detector import detect_intent_locally, parse_routing_decision
from app.utils.prompt_builder import build_system_prompt, format_chat_history


class PromptBuilderTests(unittest.TestCase):
    def test_system_prompt_injects_user_memory(self):
        prompt = build_system_prompt(
            user_memory={
                "user_name": "Alya",
                "user_topics": ["Technology", "Science"],
                "user_language": "id",
            },
            chat_history=[
                {"role": "user", "content": "Hi"},
                {"role": "assistant", "content": "Hello"},
            ],
        )

        self.assertIn("Alya", prompt)
        self.assertIn("Technology, Science", prompt)
        self.assertIn("id", prompt)
        self.assertIn("user: Hi", prompt)

    def test_format_chat_history_falls_back_when_empty(self):
        self.assertEqual(format_chat_history([]), "No previous conversation.")


class IntentDetectorTests(unittest.TestCase):
    def test_local_detector_routes_code_to_qwen(self):
        decision = detect_intent_locally("Fix this Python bug in my API")

        self.assertEqual(decision["primary_model"], "qwen")
        self.assertFalse(decision["pre_think"])

    def test_local_detector_uses_prethink_for_complex_math(self):
        decision = detect_intent_locally("Solve this equation and explain each step carefully")

        self.assertEqual(decision["primary_model"], "deepseek")
        self.assertTrue(decision["pre_think"])

    def test_parse_routing_decision_extracts_json_payload(self):
        raw = '```json\n{"primary_model":"nemotron","pre_think":false,"confidence":0.88,"reason":"General chat."}\n```'

        decision = parse_routing_decision(raw)

        self.assertEqual(decision["primary_model"], "nemotron")
        self.assertEqual(decision["confidence"], 0.88)


class ChatRouterHelperTests(unittest.TestCase):
    def test_first_message_title_is_trimmed(self):
        title = build_conversation_title(
            "This is a fairly long first message that should become a short title for the chat."
        )

        self.assertLessEqual(len(title), 60)
        self.assertTrue(title.startswith("This is a fairly long first message"))

    def test_incognito_skips_persistence(self):
        conversation = Conversation(is_incognito=True)

        self.assertFalse(should_persist_conversation(conversation, incognito_override=False))
        self.assertFalse(should_persist_conversation(None, incognito_override=True))
        self.assertTrue(should_persist_conversation(None, incognito_override=False))

    def test_sse_event_contains_json_data_line(self):
        payload = format_sse_event("chunk", {"delta": "Hello"})

        self.assertIn("event: chunk", payload)
        self.assertIn('"delta": "Hello"', payload)

    def test_sse_event_generator_shape(self):
        async def collect():
            return format_sse_event("done", {"completed": True})

        payload = asyncio.run(collect())
        self.assertTrue(payload.endswith("\n\n"))


if __name__ == "__main__":
    unittest.main()
