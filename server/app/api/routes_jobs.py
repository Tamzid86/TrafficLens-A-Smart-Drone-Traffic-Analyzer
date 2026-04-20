from fastapi import APIRouter
from app.core.state import jobs

router = APIRouter()

@router.get("/jobs/{job_id}")
def get_status(job_id: str):
    return jobs.get(job_id, {"error": "not found"})