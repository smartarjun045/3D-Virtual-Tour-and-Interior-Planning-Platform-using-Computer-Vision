import io
import json
import os
import unittest
from unittest.mock import MagicMock, patch
from dotenv import load_dotenv

load_dotenv()

from floorplan.ai_scan import (
    _clean_json_text,
    _validate_and_normalize_blueprint,
    analyze_floorplan,
    analyze_with_gemini,
    analyze_with_openai,
    FloorplanTemporarilyUnavailable,
)


class TestAiFloorplanScan(unittest.TestCase):
    def test_clean_json_text_strips_markdown_code_blocks(self):
        text = "```json\n{\"walls\": []}\n```"
        cleaned = _clean_json_text(text)
        self.assertEqual(cleaned, "{\"walls\": []}")

    def test_validate_and_normalize_blueprint(self):
        raw = {
            "walls": [
                {"start": [0, 0], "end": [100, 0], "thickness": 0.2},
                {"start": [100, 0], "end": [100, 100]},
            ],
            "rooms": [
                {"name": "Master Bedroom", "polygon": [[0, 0], [100, 0], [100, 100], [0, 100]]}
            ],
            "doors": [{"position": [50, 0], "width": 0.9, "wall_index": 0}],
            "windows": [{"position": [50, 100], "width": 1.2, "wall_index": 1}],
        }
        res = _validate_and_normalize_blueprint(raw, provider="Google Gemini", model_used="gemini-3.8-flash")
        self.assertEqual(res["ai_provider"], "Google Gemini")
        self.assertEqual(res["ai_model"], "gemini-3.8-flash")
        self.assertEqual(len(res["walls"]), 2)
        self.assertEqual(res["walls"][0]["thickness"], 0.2)
        # Verify room polygon is properly closed
        self.assertEqual(res["rooms"][0]["polygon"][0], res["rooms"][0]["polygon"][-1])
        self.assertEqual(len(res["doors"]), 1)
        self.assertEqual(len(res["windows"]), 1)

    def test_auto_mode_falls_back_if_primary_fails(self):
        with patch("floorplan.ai_scan.analyze_with_gemini", side_effect=RuntimeError("Gemini busy")), \
             patch("floorplan.ai_scan.analyze_with_openai", return_value={"walls": [], "rooms": [], "doors": [], "windows": [], "ai_provider": "OpenAI", "ai_model": "gpt-4o"}):
            res = analyze_floorplan(b"fake_image_bytes", "image/jpeg", provider="auto")
            self.assertEqual(res["ai_provider"], "OpenAI")
            self.assertEqual(res["ai_model"], "gpt-4o")

    def test_invalid_provider_raises_value_error(self):
        with self.assertRaises(ValueError):
            analyze_floorplan(b"bytes", "image/jpeg", provider="unsupported_provider")


if __name__ == "__main__":
    unittest.main()
