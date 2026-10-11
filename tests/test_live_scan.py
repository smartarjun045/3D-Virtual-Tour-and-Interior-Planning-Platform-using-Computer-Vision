import os
from dotenv import load_dotenv

load_dotenv()

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from floorplan.ai_scan import analyze_with_gemini

from PIL import Image, ImageDraw
import io

def test_live_gemini():
    # Create a simple synthetic floorplan image
    img = Image.new('RGB', (400, 300), color='white')
    draw = ImageDraw.Draw(img)
    # Draw walls (outer rectangle)
    draw.rectangle([20, 20, 380, 280], outline='black', width=4)
    # Draw an internal partition wall
    draw.line([200, 20, 200, 280], fill='black', width=4)
    # Draw room text
    draw.text((60, 140), "Living Room", fill='black')
    draw.text((260, 140), "Bedroom", fill='black')
    
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    image_bytes = buf.getvalue()

    print("Testing live Gemini multimodal floor plan recognition with gemini-3.8-flash...")
    try:
        res = analyze_with_gemini(image_bytes, "image/jpeg")
        print("Success! Result from Gemini:")
        print("Model used:", res.get("ai_model"))
        print("Provider:", res.get("ai_provider"))
        print("Walls detected:", len(res.get("walls", [])))
        print("Rooms detected:", [r.get("name") for r in res.get("rooms", [])])
        return True
    except Exception as e:
        print("Live Gemini test error:", e)
        return False

if __name__ == '__main__':
    test_live_gemini()
