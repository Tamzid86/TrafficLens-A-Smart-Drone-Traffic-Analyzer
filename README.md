# TrafficLens-A-Smart-Drone-Traffic-Analyzer


TrafficLens is an AI-powered traffic monitoring system that analyzes aerial/drone traffic footage using computer vision. It detects, tracks, counts, and classifies vehicles from uploaded videos, then generates an annotated output video and a detailed CSV report.

---
# ⚙️ Installation & Setup Guide

## 1️⃣ Clone the Repository

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
#  Features

## AI Detection
Uses YOLO for high-speed vehicle detection.

## Smart Tracking
Uses ByteTrack to maintain stable vehicle IDs and prevent double counting.

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

---



