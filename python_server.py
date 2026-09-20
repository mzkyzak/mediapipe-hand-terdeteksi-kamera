import asyncio
import json
import logging
import cv2
import math
import numpy as np
import websockets
import mediapipe as mp

logging.basicConfig(level=logging.INFO)

mp_hands = mp.solutions.hands
mp_face = mp.solutions.face_mesh

class TelemetryServer:
    def __init__(self, host="0.0.0.0", port=8765):
        self.host = host
        self.port = port
        self.clients = set()
        
        self.hands_detector = mp_hands.Hands(
            max_num_hands=2,
            min_detection_confidence=0.6,
            min_tracking_confidence=0.6
        )
        self.face_detector = mp_face.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

    async def register(self, websocket):
        self.clients.add(websocket)
        logging.info(f"Client connected: {websocket.remote_address}")
        try:
            await websocket.wait_closed()
        finally:
            self.clients.remove(websocket)

    async def broadcast(self, data):
        if not self.clients:
            return
        msg = json.dumps(data)
        await asyncio.gather(*[c.send(msg) for c in self.clients if c.open], return_exceptions=True)

    def count_fingers(self, lms):
        count = 0
        if lms[8].y < lms[6].y: count += 1
        if lms[12].y < lms[10].y: count += 1
        if lms[16].y < lms[14].y: count += 1
        if lms[20].y < lms[18].y: count += 1
        if lms[4].x < lms[3].x: count += 1
        return count

    def detect_gesture(self, lms, count):
        if count == 0: return "fist"
        if lms[8].y < lms[6].y and lms[12].y < lms[10].y and lms[16].y > lms[14].y: return "peace"
        if lms[8].y < lms[6].y and lms[20].y < lms[18].y and lms[12].y > lms[10].y: return "ily"
        if count >= 4: return "open_palm"
        return "unknown"

    def process_frame(self, frame_bgr):
        h, w, _ = frame_bgr.shape
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

        hand_res = self.hands_detector.process(rgb)
        hands_data = []
        if hand_res.multi_hand_landmarks and hand_res.multi_handedness:
            for i, hand_lms in enumerate(hand_res.multi_hand_landmarks):
                label = hand_res.multi_handedness[i].classification[0].label
                lms_list = [{"x": round(lm.x, 4), "y": round(lm.y, 4), "z": round(lm.z, 4)} for lm in hand_lms.landmark]
                fcount = self.count_fingers(hand_lms.landmark)
                gest = self.detect_gesture(hand_lms.landmark, fcount)
                hands_data.append({
                    "hand": label,
                    "gesture": gest,
                    "fingerCount": fcount,
                    "landmarks": lms_list
                })

        face_res = self.face_detector.process(rgb)
        face_data = {"detected": False}
        if face_res.multi_face_landmarks:
            flms = face_res.multi_face_landmarks[0].landmark
            xs = [p.x for p in flms]
            ys = [p.y for p in flms]
            u_lip, l_lip = flms[13], flms[14]
            mouth_dist = math.hypot(u_lip.x - l_lip.x, u_lip.y - l_lip.y)
            face_data = {
                "detected": True,
                "mouthOpen": mouth_dist > 0.04,
                "x": round((min(xs) + max(xs)) / 2.0, 4),
                "y": round((min(ys) + max(ys)) / 2.0, 4)
            }

        return {"hands": hands_data, "face": face_data}

    async def run(self):
        server = await websockets.serve(self.register, self.host, self.port)
        logging.info(f"🚀 Telemetry WebSocket running on ws://{self.host}:{self.port}")
        
        cap = cv2.VideoCapture(0)
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    await asyncio.sleep(0.01)
                    continue
                frame = cv2.flip(frame, 1)
                data = self.process_frame(frame)
                await self.broadcast(data)
                await asyncio.sleep(0.01)
        finally:
            cap.release()

if __name__ == "__main__":
    server = TelemetryServer()
    asyncio.run(server.run())
