import os
import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Ensure face_mask_detection directory is on path
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from detector import get_detector

app = FastAPI(title="AI Face Mask Detection Service")

# Allow CORS for React dev server (5173), production port (8000), and all local ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = get_detector()

class MaskDetectRequest(BaseModel):
    image: str

@app.get("/")
def root():
    return {
        "service": "AI Face Mask Detection Service",
        "status": "online",
        "model": "MaskDetectorCNN (3 Conv + 2 FC layers)",
        "classes": ["WithMask", "WithoutMask"]
    }

@app.get("/api/mask-detect/info")
def get_info():
    return {
        "status": "active",
        "model": "MaskDetectorCNN (PyTorch)",
        "classes": ["WithMask", "WithoutMask"],
        "device": str(engine.device),
        "weights": "mask_detector.pth",
        "cascade": "haarcascade_frontalface_default.txt"
    }

@app.post("/api/mask-detect")
@app.post("/predict-mask")
def detect_mask_json(req: MaskDetectRequest):
    if not req.image:
        raise HTTPException(status_code=400, detail="No image provided")
    try:
        result = engine.detect(req.image)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@app.post("/api/mask-detect/upload")
async def detect_mask_upload(file: UploadFile = File(...)):
    try:
        content = await file.read()
        result = engine.detect(content)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    print(f"Starting Face Mask Detection Server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
