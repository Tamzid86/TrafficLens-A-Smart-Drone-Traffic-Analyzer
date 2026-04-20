# TrafficLens-A-Smart-Drone-Traffic-Analyzer


TrafficLens is an AI-powered traffic monitoring system that analyzes aerial/drone traffic footage using computer vision. It detects, tracks, counts, and classifies vehicles from uploaded videos, then generates an annotated output video and a detailed CSV report.

---
# Installation & Setup Guide

##  Clone the Repository

```bash
git clone https://github.com/Tamzid86/TrafficLens-A-Smart-Drone-Traffic-Analyzer.git
cd TrafficLens-A-Smart-Drone-Traffic-Analyzer

## Backend
cd server
Create a virtual environment.
pip install -r requirements.txt
To run the application: python run.py

##Frontend
cd client
npm install
npm run dev
(use 'npm install framer-motion' if error occurs) 

# 🏗 System Design & Engineering Explanation

---

# System Architecture Breakdown

TrafficLens follows a **client–server architecture** with a clear separation between frontend, backend and AI processing pipeline.

##  Overall Flow

```text
Frontend (Next.js)
        ↓ REST API (HTTP)
Backend (FastAPI)
        ↓
Video Processor (YOLO + ByteTrack)
        ↓
Output Generation (Video + CSV + Summary)
        ↓
Backend Response
        ↓
Frontend UI Update

#Frontend Layer

**Built with:**
Next.js (React-based framework)
Tailwind CSS
Framer Motion

**Responsibilities:**
Upload video file via HTTP POST (/upload)
Poll job status via GET (/jobs/{job_id})
Summary statistics

**Display:**
Processing progress
Output video
CSV download link
Final summary

**Communication Method:**
REST API (no WebSockets used)

#Backend Layer

**Built with:**

FastAPI
OpenCV
Python multiprocessing/threading (light async job handling)
YOLO model inference
ByteTrack tracking module

**Responsibilities:**
Accept video uploads
Assign unique job ID
Store job state in memory (jobs dictionary)
Process video asynchronously

**Generate:**
Annotated video
CSV report

**ByteTrack Algorithm and Edge case handling:**
The system uses a tracking system, which relies on a detection-to-tracking pipeline. Object detection starts with a YOLO-based model. The system uses ByteTrack-style logic in its tracking layer to maintain identity consistency across multiple frames. Each detected vehicle is assigned a unique track ID, which continues until the object becomes unidentifiable through spatial proximity and motion pattern matching in subsequent frames. The tracker establishes continuous vehicle paths by connecting time-based detections instead of analyzing each detection as a separate event. The system starts counting when a tracked object crosses a virtual counting line but does not count vehicles that appear in multiple frames because it counts each vehicle only one time.

The system prevents double-counting through its persistent track ID system and its counted set mechanism. The system stores a vehicle track ID in memory after it has crossed the counting boundary. The system prevents multiple frame counting of the same vehicle through this method. The tracking logic delivers extra robustness because it enables object identification to persist through temporary occlusions and short detection failures. The tracker uses motion continuity to track a vehicle, which disappears behind another object or loses detection confidence, instead of creating a new ID. The system decreases duplicate entries through this method, which also enhances stability in areas with heavy traffic congestion.

**Engineering Assumptions**
The system development process required engineers to establish multiple fundamental engineering principles which they needed to create a stable operational framework for the system. The system maintains its operation because it accepts only one video stream input which prevents it from working with multiple cameras that need to track different locations. The system requires camera operators to maintain steady camera positions which they must execute through either drone operation or fixed roadside camera usage because the system prohibits any sudden camera movements or zoom operations. The YOLO model used in this research preserves its original pre-trained state because it has not undergone specific regional fine-tuning, which enables the model to accurately identify typical vehicle types. The system uses a Python dictionary to manage job states because it operates entirely in memory without needing a database system, which results in the loss of all processing states whenever the backend system undergoes a restart.

## Supported Vehicle Classes

- Car
- Bus
- Truck
- Motorcycle

## Output Video Includes

- Bounding boxes
- Vehicle labels
- Confidence scores
- Vehicle IDs
- Counting logic overlay

## CSV Report Includes

- Total vehicles detected
- Total unique vehicles counted
- Frame index
- Timestamp
- Vehicle ID
- Vehicle type
- Confidence score

## Frontend Dashboard

- Upload video file
- Animated progress state
- Processing status
- Output video preview
- Summary analytics
- CSV download button

---

# Tech Stack

## Backend

- Python
- FastAPI
- OpenCV
- Ultralytics YOLO
- ByteTrack
- Pandas

## Frontend

- Next.js
- React
- Tailwind CSS
- Framer Motion





