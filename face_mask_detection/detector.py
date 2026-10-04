import os
import io
import time
import base64
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import numpy as np
import cv2

# Define Model Architecture (matches Kaggle trained CNN)
class MaskDetectorCNN(nn.Module):
    def __init__(self):
        super(MaskDetectorCNN, self).__init__()
        self.conv1 = nn.Conv2d(3, 16, kernel_size=3, padding=1)
        self.pool  = nn.MaxPool2d(2, 2)
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.conv3 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.fc1   = nn.Linear(64 * 28 * 28, 128)
        self.fc2   = nn.Linear(128, 2)

    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = self.pool(F.relu(self.conv3(x)))
        x = x.view(x.size(0), -1)
        x = F.relu(self.fc1(x))
        x = self.fc2(x)
        return x

class FaceMaskEngine:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.model_path = os.path.join(self.base_dir, "mask_detector.pth")
        self.cascade_path = os.path.join(self.base_dir, "haarcascade_frontalface_default.txt")
        self.class_names = ['WithMask', 'WithoutMask']

        self.device = torch.device("cpu")
        self.model = MaskDetectorCNN().to(self.device)
        if os.path.exists(self.model_path):
            self.model.load_state_dict(torch.load(self.model_path, map_location=self.device))
            self.model.eval()
            print(f"[FaceMaskEngine] Loaded model weights from {self.model_path}")
        else:
            raise FileNotFoundError(f"Model file not found at {self.model_path}")

        if os.path.exists(self.cascade_path):
            self.face_cascade = cv2.CascadeClassifier(self.cascade_path)
            print(f"[FaceMaskEngine] Loaded Haar cascade from {self.cascade_path}")
        else:
            raise FileNotFoundError(f"Cascade file not found at {self.cascade_path}")

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def predict_pil_crop(self, pil_crop):
        """Predict WithMask or WithoutMask for a cropped face PIL image."""
        img_tensor = self.transform(pil_crop).unsqueeze(0).to(self.device)
        with torch.no_grad():
            outputs = self.model(img_tensor)
            probs = F.softmax(outputs, dim=1)
            confidence, pred = torch.max(probs, 1)

        label = self.class_names[pred.item()]
        score = float(confidence.item()) * 100.0
        prob_with_mask = float(probs[0][0].item()) * 100.0
        prob_without_mask = float(probs[0][1].item()) * 100.0
        return label, score, prob_with_mask, prob_without_mask

    def detect(self, image_input):
        """
        Accepts:
          - numpy array (BGR or RGB)
          - PIL Image
          - bytes
          - base64 string
        Returns:
          dict with detection results, bounding boxes, labels, and annotated base64 image.
        """
        t0 = time.time()

        # 1. Parse input into cv2 BGR frame and PIL RGB
        if isinstance(image_input, str):
            if "," in image_input:
                image_input = image_input.split(",", 1)[1]
            image_bytes = base64.b64decode(image_input)
            np_arr = np.frombuffer(image_bytes, np.uint8)
            frame_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        elif isinstance(image_input, bytes):
            np_arr = np.frombuffer(image_input, np.uint8)
            frame_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        elif isinstance(image_input, Image.Image):
            frame_rgb = np.array(image_input)
            frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
        elif isinstance(image_input, np.ndarray):
            frame_bgr = image_input.copy()
        else:
            raise ValueError("Unsupported image input type")

        if frame_bgr is None or frame_bgr.size == 0:
            raise ValueError("Could not decode image")

        h_img, w_img = frame_bgr.shape[:2]
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)

        # 2. Run Haar cascade face detector
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(60, 60)
        )

        detected_faces = []
        annotated_bgr = frame_bgr.copy()

        # Filter false positives: sort by area descending, reject lower torso artifacts
        valid_faces = []
        if len(faces) > 0:
            # Sort by area descending
            sorted_faces = sorted(faces, key=lambda b: b[2] * b[3], reverse=True)
            max_area = sorted_faces[0][2] * sorted_faces[0][3]
            for (x, y, w, h) in sorted_faces:
                area = w * h
                # If area is too small relative to dominant face (< 35%) and positioned near bottom, skip
                if len(valid_faces) >= 1 and area < 0.45 * max_area and (y + h) > 0.85 * h_img:
                    continue
                valid_faces.append((x, y, w, h))

        if len(valid_faces) > 0:
            for (x, y, w, h) in valid_faces:
                # Add a slight margin around face crop if possible
                pad_x = int(w * 0.05)
                pad_y = int(h * 0.05)
                x1 = max(0, x - pad_x)
                y1 = max(0, y - pad_y)
                x2 = min(w_img, x + w + pad_x)
                y2 = min(h_img, y + h + pad_y)

                face_crop = frame_bgr[y1:y2, x1:x2]
                face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
                pil_crop = Image.fromarray(face_rgb)

                label, score, p_with, p_without = self.predict_pil_crop(pil_crop)

                # Draw bounding box and label
                # WithMask = Vibrant Green, WithoutMask = Crisp Coral Red
                color = (46, 204, 113) if label == 'WithMask' else (52, 73, 235)  # BGR
                cv2.rectangle(annotated_bgr, (x, y), (x + w, y + h), color, 3)

                label_text = f"{label} {score:.1f}%"
                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = max(0.5, w / 250.0)
                thickness = 2
                (tw, th), baseline = cv2.getTextSize(label_text, font, font_scale, thickness)

                # Draw label background box
                cv2.rectangle(
                    annotated_bgr,
                    (x, max(0, y - th - 12)),
                    (x + tw + 10, y),
                    color,
                    -1
                )
                cv2.putText(
                    annotated_bgr,
                    label_text,
                    (x + 5, y - 5),
                    font,
                    font_scale,
                    (255, 255, 255),
                    thickness,
                    cv2.LINE_AA
                )

                detected_faces.append({
                    "box": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)},
                    "label": label,
                    "confidence": round(score, 1),
                    "probabilities": {
                        "WithMask": round(p_with, 1),
                        "WithoutMask": round(p_without, 1)
                    }
                })

            # Overall result is WithMask if all or majority have mask, otherwise WithoutMask
            with_mask_count = sum(1 for f in detected_faces if f["label"] == "WithMask")
            overall_result = "WithMask" if with_mask_count == len(detected_faces) else ("Mixed" if with_mask_count > 0 else "WithoutMask")
            primary_label = detected_faces[0]["label"]
            primary_confidence = detected_faces[0]["confidence"]

        else:
            # Fallback: Whole image evaluated if no cascade face found
            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(frame_rgb)
            label, score, p_with, p_without = self.predict_pil_crop(pil_img)
            overall_result = label
            primary_label = label
            primary_confidence = round(score, 1)

            detected_faces.append({
                "box": {"x": 0, "y": 0, "w": int(w_img), "h": int(h_img)},
                "label": label,
                "confidence": round(score, 1),
                "probabilities": {
                    "WithMask": round(p_with, 1),
                    "WithoutMask": round(p_without, 1)
                },
                "fallback": True
            })

            color = (46, 204, 113) if label == 'WithMask' else (52, 73, 235)
            label_text = f"{label} (Full Frame) {score:.1f}%"
            cv2.putText(
                annotated_bgr,
                label_text,
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.9,
                color,
                2,
                cv2.LINE_AA
            )

        # Encode annotated image to JPEG base64
        _, buffer = cv2.imencode('.jpg', annotated_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

        inference_time_ms = round((time.time() - t0) * 1000, 2)

        return {
            "status": "success",
            "faces_count": len(detected_faces),
            "overall_result": overall_result,
            "primary_label": primary_label,
            "confidence": primary_confidence,
            "faces": detected_faces,
            "annotated_image": annotated_b64,
            "inference_time_ms": inference_time_ms,
            "image_size": {"width": w_img, "height": h_img}
        }

# Singleton accessor
def get_detector():
    return FaceMaskEngine.get_instance()

if __name__ == "__main__":
    print("Initializing detector engine...")
    detector = get_detector()
    print("Detector engine ready! Creating test image...")
    dummy = np.zeros((300, 300, 3), dtype=np.uint8)
    res = detector.detect(dummy)
    print("Test inference result:", res["primary_label"], "Confidence:", res["confidence"], "Time:", res["inference_time_ms"], "ms")
