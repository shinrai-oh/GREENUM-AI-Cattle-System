"""
Python Sidecar - RTSP 视频流处理服务
负责 OpenCV 摄像头帧捕获，供统一后端调用
"""
import base64
import io
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

app = FastAPI(title="Cattle Vision Sidecar", version="1.0.0")


class CaptureRequest(BaseModel):
    rtsp_url: str
    timeout: Optional[int] = 5


class AnalyzeRequest(BaseModel):
    rtsp_url: str
    roi: Optional[dict] = None


@app.get("/health")
def health():
    return {"status": "ok", "opencv": CV2_AVAILABLE}


@app.post("/capture")
def capture_frame(req: CaptureRequest):
    """从 RTSP 流捕获单帧，返回 base64 编码的 JPEG 图像"""
    if not CV2_AVAILABLE:
        raise HTTPException(status_code=503, detail="OpenCV 未安装")

    cap = cv2.VideoCapture(req.rtsp_url)
    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, req.timeout * 1000)

    if not cap.isOpened():
        raise HTTPException(status_code=400, detail=f"无法连接到 RTSP 流: {req.rtsp_url}")

    ret, frame = cap.read()
    cap.release()

    if not ret or frame is None:
        raise HTTPException(status_code=400, detail="无法读取视频帧")

    # 压缩并编码为 base64
    _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    frame_b64 = base64.b64encode(buffer).decode("utf-8")

    h, w = frame.shape[:2]
    return {
        "success": True,
        "frame": frame_b64,
        "width": w,
        "height": h,
        "format": "jpeg",
    }


@app.post("/analyze")
def analyze_frame(req: AnalyzeRequest):
    """从 RTSP 流捕获帧并分析 ROI 区域（预留接口，可对接行为识别模型）"""
    if not CV2_AVAILABLE:
        raise HTTPException(status_code=503, detail="OpenCV 未安装")

    cap = cv2.VideoCapture(req.rtsp_url)
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail=f"无法连接到 RTSP 流: {req.rtsp_url}")

    ret, frame = cap.read()
    cap.release()

    if not ret or frame is None:
        raise HTTPException(status_code=400, detail="无法读取视频帧")

    result = {"success": True, "behaviors": []}

    # 如果提供了 ROI，裁剪并编码
    if req.roi:
        x, y, w, h = int(req.roi.get("x", 0)), int(req.roi.get("y", 0)), \
                     int(req.roi.get("width", frame.shape[1])), int(req.roi.get("height", frame.shape[0]))
        roi_frame = frame[y:y+h, x:x+w]
        _, buf = cv2.imencode(".jpg", roi_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        result["roi_frame"] = base64.b64encode(buf).decode("utf-8")

    # 此处可接入行为识别模型，当前返回占位结果
    result["behaviors"] = [{"type": "standing", "confidence": 0.85}]
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
