import os
import unittest

from app.routers.labs import (
    DESIGN_TYPES,
    IMAGE_STYLES,
    build_vid_response,
    parse_code_result,
    parse_design_result,
)
from app.services.gemini import optimize_image_prompt


class LabsHelperTests(unittest.TestCase):
    def test_supported_image_styles_include_requested_values(self):
        self.assertIn("photorealistic", IMAGE_STYLES)
        self.assertIn("cinematic", IMAGE_STYLES)
        self.assertEqual(len(IMAGE_STYLES), 9)

    def test_supported_design_types_include_requested_values(self):
        self.assertEqual(DESIGN_TYPES, {"brief", "copy", "concept"})

    def test_image_prompt_optimization_appends_style_and_quality(self):
        optimized = optimize_image_prompt("a cat on a rooftop", "anime")

        self.assertIn("a cat on a rooftop", optimized)
        self.assertIn("anime style", optimized)
        self.assertIn("high quality", optimized)
        self.assertIn("4K", optimized)

    def test_code_result_parser_extracts_code_and_explanation(self):
        raw = """```python\nprint('hello')\n```\nExplanation: Prints hello."""

        parsed = parse_code_result(raw, "Python")

        self.assertIn("print('hello')", parsed["code"])
        self.assertIn("Prints hello", parsed["explanation"])
        self.assertEqual(parsed["language"], "Python")

    def test_design_result_parser_falls_back_to_sections(self):
        raw = (
            "Concept: Bold AI brand\n"
            "Colors: Cyan, Black\n"
            "Typography: Inter, Space Grotesk\n"
            "Tone: Confident\n"
            "Copy: Build faster"
        )

        parsed = parse_design_result(raw)

        self.assertEqual(parsed["concept"], "Bold AI brand")
        self.assertEqual(parsed["colors"], "Cyan, Black")
        self.assertEqual(parsed["typography"], "Inter, Space Grotesk")
        self.assertEqual(parsed["tone"], "Confident")
        self.assertEqual(parsed["copy"], "Build faster")

    def test_vid_response_is_coming_soon(self):
        payload = build_vid_response()

        self.assertFalse(payload["enabled"])
        self.assertEqual(payload["message"], "Coming Soon")


if __name__ == "__main__":
    unittest.main()
