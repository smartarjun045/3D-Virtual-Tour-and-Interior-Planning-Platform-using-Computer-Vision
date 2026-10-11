from fastapi import FastAPI
from dotenv import load_dotenv

from floorplan.router import router as floorplan_router

load_dotenv()
app = FastAPI(
    title="3D Virtual Tour and Interior Planning Platform using Computer Vision API",
    description="Multimodal Computer Vision Floorplan Recognition, 3D Geometry Synthesis, and Spatial Interior Planning Engine",
    version="1.0.0"
)
app.include_router(floorplan_router)
