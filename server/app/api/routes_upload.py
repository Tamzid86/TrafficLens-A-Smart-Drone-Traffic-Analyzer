import uuid
import os
import threading

from fastapi import APIRouter, UploadFile, File

from app.core.state import jobs
from app.core.config import UPLOAD_DIR
from app.services.file_service import save_upload
from app.services.processor import process_video

router = APIRouter()


@router.post("/upload")
def upload_video(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())

    path = os.path.join(UPLOAD_DIR, file.filename)
    save_upload(file, path)

    jobs[job_id] = {
        "status": "queued"
    }

    threading.Thread(
        target=process_video,
        args=(job_id, path)
    ).start()

    return {"job_id": job_id}