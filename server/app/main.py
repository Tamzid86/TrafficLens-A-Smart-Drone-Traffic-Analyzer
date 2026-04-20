import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes_upload import router as upload_router
from app.api.routes_jobs import router as jobs_router

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


OUTPUT_DIR = os.path.join(BASE_DIR, "data", "outputs")
REPORT_DIR = os.path.join(BASE_DIR, "data", "reports")

app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")
app.mount("/reports", StaticFiles(directory=REPORT_DIR), name="reports")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(jobs_router)