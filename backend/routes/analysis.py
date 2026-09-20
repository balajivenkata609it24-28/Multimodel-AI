import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from backend.config import Config
import backend.hf_client as hf_client

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

class AnalysisRequest(BaseModel):
    file_path: str
    prompt: Optional[str] = None

@router.post("/upload")
async def upload_analysis_image(file: UploadFile = File(...)):
    """Uploads an image to analyze and returns its local access URL and physical path."""
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".png", ".jpg", ".jpeg", ".webp"]:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, JPEG, and WEBP formats are supported.")
        
    unique_filename = f"analysis_{uuid.uuid4()}{file_ext}"
    physical_path = os.path.join(Config.UPLOAD_DIR, unique_filename)
    
    with open(physical_path, "wb") as buffer:
        content_bytes = await file.read()
        buffer.write(content_bytes)
        
    # Analyze dominant colors and basic stats immediately
    meta = hf_client.analyze_image_locally(physical_path)
    
    # Format dominant colors as hex values
    color_palette = []
    for rgb in meta["dominant_rgbs"]:
        # Ensure values are ints
        r, g, b = [int(v) for v in rgb]
        color_palette.append(f"#{r:02x}{g:02x}{b:02x}")
        
    # Ensure we have at least 4 colors for the palette display
    if len(color_palette) < 4:
        # Fill in variations or default shades
        base = meta["dominant_rgbs"][0] if meta["dominant_rgbs"] else (30, 41, 59)
        for i in range(len(color_palette), 4):
            r = min(255, max(0, int(base[0] + (i * 20) - 30)))
            g = min(255, max(0, int(base[1] + (i * 15) - 20)))
            b = min(255, max(0, int(base[2] + (i * 25) - 40)))
            color_palette.append(f"#{r:02x}{g:02x}{b:02x}")
            
    return {
        "image_url": f"/api/uploads/{unique_filename}",
        "file_path": physical_path,
        "width": meta["width"],
        "height": meta["height"],
        "color_palette": color_palette
    }

@router.post("/describe")
def describe_image(req: AnalysisRequest):
    """Summarizes the contents of the image using the VLM."""
    if not os.path.exists(req.file_path):
        raise HTTPException(status_code=404, detail="Uploaded file not found.")
        
    prompt = req.prompt or "Describe the contents of this image in detail."
    result = hf_client.query_huggingface_vlm(req.file_path, prompt, action_type="describe")
    return {"result": result}

@router.post("/ocr")
def extract_text(req: AnalysisRequest):
    """Performs OCR text extraction on the image."""
    if not os.path.exists(req.file_path):
        raise HTTPException(status_code=404, detail="Uploaded file not found.")
        
    prompt = "Extract all readable text, characters, and headings from this image."
    result = hf_client.query_huggingface_vlm(req.file_path, prompt, action_type="ocr")
    return {"result": result}

@router.post("/detect")
def detect_objects(req: AnalysisRequest):
    """Detects objects inside the image and maps their coordinates."""
    if not os.path.exists(req.file_path):
        raise HTTPException(status_code=404, detail="Uploaded file not found.")
        
    # Get JSON structure of objects
    objects = hf_client.query_huggingface_vlm(req.file_path, "Detect all objects and their bounding box coordinate lists", action_type="detect_objects")
    return {"objects": objects}

@router.post("/chart")
def analyze_chart(req: AnalysisRequest):
    """Analyzes a chart or graph, identifying axes, growth rates, and trends."""
    if not os.path.exists(req.file_path):
        raise HTTPException(status_code=404, detail="Uploaded file not found.")
        
    prompt = "Perform a detailed analysis of this chart. Extract the data points, label axes, identify trends and anomalies."
    result = hf_client.query_huggingface_vlm(req.file_path, prompt, action_type="chart")
    return {"result": result}
