import unittest
from datetime import datetime

from app.routers.dashboard import (
    EARNING_PER_USER,
    aggregate_recent_signups,
    aggregate_users_by_country,
    aggregate_users_by_month,
    calculate_total_earnings,
    is_developer_email,
)
from app.services.xendit import verify_webhook


class DashboardHelperTests(unittest.TestCase):
    def test_total_earnings_uses_per_user_constant(self):
        self.assertEqual(calculate_total_earnings(3), 3 * EARNING_PER_USER)

    def test_is_developer_email_requires_exact_match(self):
        self.assertTrue(is_developer_email("dev@example.com", "dev@example.com"))
        self.assertFalse(is_developer_email("user@example.com", "dev@example.com"))
        self.assertFalse(is_developer_email("user@example.com", ""))

    def test_country_aggregation_groups_unknown(self):
        users = [
            {"country": "Indonesia"},
            {"country": None},
            {"country": "Indonesia"},
            {"country": ""},
        ]

        grouped = aggregate_users_by_country(users)

        self.assertEqual(grouped[0]["country"], "Indonesia")
        self.assertEqual(grouped[0]["count"], 2)
        self.assertEqual(grouped[1]["country"], "Unknown")
        self.assertEqual(grouped[1]["count"], 2)

    def test_month_aggregation_groups_by_year_and_month(self):
        users = [
            {"created_at": datetime(2026, 4, 1)},
            {"created_at": datetime(2026, 4, 15)},
            {"created_at": datetime(2026, 3, 10)},
        ]

        grouped = aggregate_users_by_month(users)

        self.assertEqual(grouped[0]["month"], 3)
        self.assertEqual(grouped[0]["year"], 2026)
        self.assertEqual(grouped[0]["count"], 1)
        self.assertEqual(grouped[1]["month"], 4)
        self.assertEqual(grouped[1]["count"], 2)

    def test_recent_signups_include_unknown_country(self):
        users = [
            {
                "name": "Alya",
                "email": "alya@example.com",
                "country": None,
                "created_at": datetime(2026, 4, 20, 8, 30),
            }
        ]

        signups = aggregate_recent_signups(users)

        self.assertEqual(signups[0]["country"], "Unknown")
        self.assertEqual(signups[0]["email"], "alya@example.com")

    def test_verify_webhook_matches_expected_token(self):
        self.assertTrue(verify_webhook("abc", "abc"))
        self.assertFalse(verify_webhook("abc", "xyz"))


if __name__ == "__main__":
    unittest.main()
