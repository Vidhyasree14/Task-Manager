from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from enum import Enum
from typing import Optional
from pymongo import MongoClient
import certifi
import uvicorn
import os
import sys
from pathlib import Path


# FastAPI Application with Face Mask Detection Engine
app = FastAPI(title="Task Manager & Face Mask Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = MongoClient(
    "mongodb+srv://vidhyasreemani6_db_user:M.sundari2006@cluster0.fgxk479.mongodb.net/?appName=Cluster0",
    tlsCAFile=certifi.where()
)
db = client["taskdb"]
collection = db["tasks"]

class Status(str, Enum):
    start = "start"
    pending = "pending"
    completed = "completed"

class Task(BaseModel):
    id: int
    type: str
    description: str
    status: Status
    date: str

@app.get("/tasks")
def get_tasks(status: Optional[Status] = Query(None)):
    query = {"status": status} if status else {}
    results = collection.find(query, {"_id": 0})
    return list(results)

@app.post("/tasks")
def create_task(task: Task):
    collection.insert_one(task.dict())
    return task

@app.put("/tasks/{task_id}")
def update_task(task_id: int, updated_task: Task):
    result = collection.update_one({"id": task_id}, {"$set": updated_task.dict()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated_task

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    result = collection.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

# Configure path to import face_mask_detection
FACE_DIR = Path(__file__).resolve().parent.parent / "face_mask_detection"
VENV_PKGS = FACE_DIR / "venv" / "Lib" / "site-packages"
if VENV_PKGS.exists() and str(VENV_PKGS) not in sys.path:
    sys.path.insert(0, str(VENV_PKGS))
if FACE_DIR.exists() and str(FACE_DIR) not in sys.path:
    sys.path.insert(0, str(FACE_DIR))

try:
    from detector import get_detector
    mask_detector = get_detector()
    print("[Backend] Face mask detection engine initialized successfully")
except Exception as e:
    mask_detector = None
    print(f"[Backend] Warning: Face mask detection engine could not be loaded: {e}")

class MaskDetectionRequest(BaseModel):
    image: str

@app.get("/api/mask-detect/info")
def get_mask_info():
    return {
        "status": "active" if mask_detector else "unavailable",
        "model": "MaskDetectorCNN (PyTorch)",
        "classes": ["WithMask", "WithoutMask"],
        "device": "CPU",
        "description": "Convolutional Neural Network for real-time Face Mask Detection with OpenCV Haar Cascade face localization"
    }

@app.post("/api/mask-detect")
def predict_mask_json(req: MaskDetectionRequest):
    if not mask_detector:
        raise HTTPException(status_code=500, detail="Mask detection engine not initialized")
    if not req.image:
        raise HTTPException(status_code=400, detail="No image provided")
    try:
        result = mask_detector.detect(req.image)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@app.post("/api/mask-detect/upload")
async def predict_mask_file(file: UploadFile = File(...)):
    if not mask_detector:
        raise HTTPException(status_code=500, detail="Mask detection engine not initialized")
    try:
        content = await file.read()
        result = mask_detector.detect(content)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

# Serve frontend build from dist folder at the base URL (/)
DIST_DIR = Path(__file__).resolve().parent.parent / "dist"
if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
















