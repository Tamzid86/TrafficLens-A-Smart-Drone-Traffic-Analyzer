import cv2
import os
import time

from ultralytics import YOLO

from app.core.state import jobs
from app.core.config import OUTPUT_DIR, REPORT_DIR


model = YOLO("yolov10s.pt")


#main processing function
def process_video(job_id, input_path):

    jobs[job_id]["status"] = "processing"
    start_time = time.time()

    cap = cv2.VideoCapture(input_path)

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    output_path = os.path.join(OUTPUT_DIR, f"{job_id}.mp4")

    writer = cv2.VideoWriter(
        output_path,
        cv2.VideoWriter_fourcc(*"H264"),
        fps,
        (width, height)
    )

    vehicle_labels = ["car", "bus", "truck", "motorcycle"]

    rows = []
    frame_id = 0


    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_id += 1
        timestamp = round(frame_id / fps, 2)


        results = model.track(
            frame,
            persist=True,
            tracker="bytetrack.yaml", #the algorithm
            verbose=False
        )[0]

        if results.boxes is not None:

            for box in results.boxes:

                cls = int(box.cls[0])
                conf = float(box.conf[0])
                label = model.names[cls]

                if label in vehicle_labels:

                    track_id = int(box.id[0]) if box.id is not None else -1

                    x1, y1, x2, y2 = map(int, box.xyxy[0])

                    cx = (x1 + x2) // 2
                    cy = (y1 + y2) // 2

                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2) #bounding box

                    label_text = f"{label} {conf:.2f} | ID:{track_id}"


                    (text_w, text_h), _ = cv2.getTextSize(
                        label_text,
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        2
                    )

                    cv2.rectangle(
                        frame,
                        (x1, y1 - text_h - 10),
                        (x1 + text_w, y1),
                        (0, 255, 0),
                        -1
                    )

                    cv2.putText(
                        frame,
                        label_text,
                        (x1, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0, 0, 0),
                        2,
                        cv2.LINE_AA
                    )

                    #report
                    rows.append([
                        frame_id,
                        timestamp,
                        track_id,
                        label,
                        round(conf, 2)
                    ])

        writer.write(frame)

    cap.release()
    writer.release()


    report_path = os.path.join(REPORT_DIR, f"{job_id}.csv")

    total_detections = len(rows)
    unique_vehicles = len(set(r[2] for r in rows))

    with open(report_path, "w") as f:

        # summary
        f.write("SUMMARY\n")
        f.write(f"Total Detections,{total_detections}\n")
        f.write(f"Total Unique Vehicles,{unique_vehicles}\n\n")

        # table header
        f.write("frame_index,timestamp,vehicle_id,vehicle_type,confidence\n")

        # data rows
        for r in rows:
            f.write(f"{r[0]},{r[1]},{r[2]},{r[3]},{r[4]}\n")


    jobs[job_id]["status"] = "completed"
    jobs[job_id]["video"] = os.path.basename(output_path)
    jobs[job_id]["report"] = os.path.basename(report_path)
    jobs[job_id]["time"] = round(time.time() - start_time, 2)