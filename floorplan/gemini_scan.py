"""Backward-compatible wrapper for floorplan AI scanning."""
from .ai_scan import (
    FloorplanTemporarilyUnavailable,
    analyze_floorplan,
    analyze_with_gemini,
    analyze_with_openai,
    PROMPT,
)

__all__ = [
    "FloorplanTemporarilyUnavailable",
    "analyze_floorplan",
    "analyze_with_gemini",
    "analyze_with_openai",
    "PROMPT",
]
