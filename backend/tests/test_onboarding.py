import json
import unittest

from pydantic import ValidationError

from app.models.user import UserProfile
from app.routers.onboarding import (
    NameRequest,
    TopicsRequest,
    apply_topics_submission,
    onboarding_status_from_profile,
    serialize_topics_for_memory,
)


class OnboardingModelTests(unittest.TestCase):
    def test_user_profile_defaults_match_onboarding_requirements(self):
        profile = UserProfile()

        self.assertEqual(profile.language, "id")
        self.assertFalse(profile.onboarding_done)

    def test_topics_request_requires_at_least_two_topics(self):
        with self.assertRaises(ValidationError):
            TopicsRequest(topics=["Technology"])

    def test_topics_are_serialized_for_memory_storage(self):
        topics = ["Technology", "Science"]

        serialized = serialize_topics_for_memory(topics)

        self.assertEqual(json.loads(serialized), topics)

    def test_apply_topics_submission_marks_profile_complete(self):
        profile = UserProfile(display_name="Alya")

        apply_topics_submission(profile, ["Technology", "Science"])

        self.assertEqual(profile.topics, ["Technology", "Science"])
        self.assertTrue(profile.onboarding_done)

    def test_onboarding_status_defaults_to_false_when_profile_missing(self):
        self.assertFalse(onboarding_status_from_profile(None))

    def test_name_request_accepts_non_empty_display_name(self):
        request = NameRequest(display_name="Alya")

        self.assertEqual(request.display_name, "Alya")


if __name__ == "__main__":
    unittest.main()
