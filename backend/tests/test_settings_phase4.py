import json
import unittest

from fastapi import HTTPException

from app.routers.settings import (
    SUPPORTED_LANGUAGES,
    ensure_supported_language,
    is_developer_user,
    merge_preferences,
    serialize_preferences,
)


class SettingsHelperTests(unittest.TestCase):
    def test_supported_languages_include_expected_codes(self):
        self.assertIn("id", SUPPORTED_LANGUAGES)
        self.assertIn("zh", SUPPORTED_LANGUAGES)
        self.assertEqual(len(SUPPORTED_LANGUAGES), 11)

    def test_ensure_supported_language_accepts_known_code(self):
        self.assertEqual(ensure_supported_language("en"), "en")

    def test_ensure_supported_language_rejects_unknown_code(self):
        with self.assertRaises(HTTPException):
            ensure_supported_language("ru")

    def test_merge_preferences_overrides_existing_keys(self):
        merged = merge_preferences(
            {"appearance": {"dark_mode": True}, "security": {"placeholder": True}},
            {"appearance": {"dark_mode": False}},
        )

        self.assertFalse(merged["appearance"]["dark_mode"])
        self.assertTrue(merged["security"]["placeholder"])

    def test_preferences_serialize_to_json(self):
        serialized = serialize_preferences({"appearance": {"dark_mode": True}})
        self.assertEqual(json.loads(serialized), {"appearance": {"dark_mode": True}})

    def test_developer_check_uses_email_match(self):
        self.assertTrue(is_developer_user("dev@example.com", "dev@example.com"))
        self.assertFalse(is_developer_user("user@example.com", "dev@example.com"))
        self.assertFalse(is_developer_user("user@example.com", None))


if __name__ == "__main__":
    unittest.main()
