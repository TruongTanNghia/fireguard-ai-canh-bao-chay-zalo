"""Kiểm thử logic bỏ qua camera ảo (CyberLink YouCam, OBS Virtual Camera...) bằng webcam giả lập.

Cách chạy (tại thư mục gốc dự án): python tests/kiem_thu_camera_ao.py
Không cần webcam thật, không mở cổng mạng.
"""
import os, sys, logging
sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "backend"))
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
logging.basicConfig(level=logging.WARNING, format="   log: %(message)s")

import numpy as np
from app.services.fire import engine as E

rng = np.random.default_rng(0)
STILL = np.full((480, 640, 3), 70, np.uint8)  # ảnh "Please Start YouCam"


class FakeCap:
    def __init__(self, kind):
        self.kind, self.n, self.released = kind, 0, False
    def read(self):
        self.n += 1
        if self.kind == "static":
            return True, STILL.copy()
        if self.kind == "dark_then_real" and self.n <= 4:
            return True, np.zeros((480, 640, 3), np.uint8)
        noise = rng.integers(0, 4, (480, 640, 3), dtype=np.uint8)
        return True, (STILL // 2 + noise).astype(np.uint8)
    def set(self, *a): pass
    def release(self): self.released = True


results = []
def check(name, cond):
    results.append(cond); print(("PASS " if cond else "FAIL ") + name)

# 1. Hàm nhận biết ảnh tĩnh
c = FakeCap("static"); check("Ảnh tĩnh (YouCam) bị nhận là camera ảo", E._is_static_feed(c, c.read()[1]) is True)
c = FakeCap("real"); check("Webcam thật có nhiễu KHÔNG bị nhận nhầm", E._is_static_feed(c, c.read()[1]) is False)
c = FakeCap("dark_then_real"); check("Webcam thật đang khởi động (khung đen) KHÔNG bị nhận nhầm", E._is_static_feed(c, c.read()[1]) is False)
class DarkCap(FakeCap):
    def read(self): return True, np.zeros((480, 640, 3), np.uint8)
c = DarkCap("dark"); check("Webcam bị che kín (toàn khung đen) KHÔNG bị nhận nhầm", E._is_static_feed(c, c.read()[1]) is False)


def run_scenario(devices, requested=0):
    caps = {}
    def fake_try(idx):
        kind = devices.get(idx)
        if kind is None:
            return None, None, False
        cap = FakeCap(kind); caps[idx] = cap
        return cap, "DSHOW", kind == "static"
    E._try_open_webcam = fake_try
    w = E.CameraStreamWorker(1, "Camera 1", f"webcam:{requested}", "webcam", engine=None)
    chosen = w._open_capture(requested, is_file=False)
    idx = next((i for i, cp in caps.items() if cp is chosen), None)
    return idx, caps

# 2. Chọn webcam
idx, caps = run_scenario({0: "static", 1: "real"})
check("YouCam ở #0 + webcam thật ở #1 -> chọn #1", idx == 1)
check("   ...và đã giải phóng YouCam #0", caps[0].released)
idx, _ = run_scenario({0: "real", 1: "static"})
check("Webcam thật ở #0 -> giữ nguyên #0", idx == 0)
idx, _ = run_scenario({0: "static"})
check("Chỉ có YouCam -> vẫn dùng tạm #0 (kèm hướng dẫn)", idx == 0)
idx, _ = run_scenario({0: "static", 2: "static", 3: "real"})
check("2 camera ảo + webcam thật ở #3 -> chọn #3", idx == 3)
idx, _ = run_scenario({1: "real"})
check("Không có #0, webcam thật ở #1 -> chọn #1", idx == 1)
idx, _ = run_scenario({})
check("Không có webcam nào -> trả về None, không lỗi", idx is None)

print(f"\n==== {sum(results)}/{len(results)} PASS ====")
sys.exit(0 if all(results) else 1)
