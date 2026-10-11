import io
import unittest
from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app


class TestFloorplanApi(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_status_endpoint(self):
        response = self.client.get("/api/floorplan/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")
        self.assertIn("gemini", data["providers"])
        self.assertIn("openai", data["providers"])
        self.assertTrue(data["providers"]["gemini"]["configured"])
        self.assertTrue(data["providers"]["openai"]["configured"])

    def test_analyze_unsupported_format(self):
        response = self.client.post(
            "/api/floorplan/analyze",
            files={"file": ("plan.exe", b"binary content", "application/octet-stream")},
        )
        self.assertEqual(response.status_code, 400)

    def test_analyze_conversion_required_format(self):
        response = self.client.post(
            "/api/floorplan/analyze",
            files={"file": ("building.rvt", b"rvt content", "application/octet-stream")},
        )
        self.assertEqual(response.status_code, 422)

    def test_analyze_with_mock_ai(self):
        mock_blueprint = {
            "walls": [{"start": [0, 0], "end": [500, 0], "thickness": 0.15}],
            "rooms": [{"name": "Living Room", "polygon": [[0, 0], [500, 0], [500, 400], [0, 400], [0, 0]]}],
            "doors": [],
            "windows": [],
            "ai_provider": "Google Gemini",
            "ai_model": "gemini-3.8-flash",
        }
        with patch("floorplan.router.analyze_floorplan", return_value=mock_blueprint):
            response = self.client.post(
                "/api/floorplan/analyze",
                files={"file": ("plan.jpg", b"fake jpeg image data", "image/jpeg")},
                data={"provider": "auto"},
            )
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["ai_provider"], "Google Gemini")
            self.assertEqual(len(data["walls"]), 1)
            self.assertEqual(len(data["rooms"]), 1)


if __name__ == "__main__":
    unittest.main()
