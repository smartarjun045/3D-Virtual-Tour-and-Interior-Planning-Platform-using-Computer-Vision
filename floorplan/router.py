import json
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from .ai_scan import (
    FloorplanTemporarilyUnavailable,
    analyze_floorplan,
    GEMINI_MODELS,
    OPENAI_MODELS,
)

router = APIRouter(prefix="/api/floorplan", tags=["floorplan"])

DIRECT_AI_FORMATS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
CONVERSION_REQUIRED_FORMATS = {".rvt", ".ifc", ".skp", ".dwg", ".dxf"}


@router.get("/status")
async def get_status():
    gemini_key = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("VITE_GEMINI_API_KEY"))
    openai_key = bool(os.environ.get("OPENAI_API_KEY"))
    return {
        "status": "online",
        "providers": {
            "gemini": {
                "configured": gemini_key,
                "models": list(GEMINI_MODELS),
                "primary": "gemini-3.8-flash",
            },
            "openai": {
                "configured": openai_key,
                "models": list(OPENAI_MODELS),
                "primary": "gpt-4o",
            },
        },
        "supported_formats": sorted(list(DIRECT_AI_FORMATS | CONVERSION_REQUIRED_FORMATS)),
    }


@router.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    provider: Optional[str] = Form("auto"),
):
    extension = Path(file.filename or "").suffix.lower()
    if extension not in DIRECT_AI_FORMATS | CONVERSION_REQUIRED_FORMATS:
        raise HTTPException(400, "Supported formats: .rvt, .ifc, .skp, .dwg, .dxf, .pdf, .jpg, .png, .webp.")
    if extension in CONVERSION_REQUIRED_FORMATS:
        raise HTTPException(
            422,
            f"{extension} was uploaded successfully, but this server needs a BIM/CAD converter to render it as a plan image before AI can analyze it. Export it to PDF or JPG, or configure a {extension[1:].upper()} conversion service.",
        )
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(400, "The uploaded image is empty.")
    try:
        mime_type = "application/pdf" if extension == ".pdf" else (file.content_type or "image/jpeg")
        return analyze_floorplan(image_bytes, mime_type, provider=provider or "auto")
    except json.JSONDecodeError as error:
        raise HTTPException(502, "AI engine returned an invalid floor-plan response.") from error
    except ValueError as error:
        raise HTTPException(400, str(error)) from error
    except FloorplanTemporarilyUnavailable as error:
        raise HTTPException(503, str(error)) from error
    except Exception as error:
        raise HTTPException(500, f"Floor-plan analysis failed: {error}") from error
