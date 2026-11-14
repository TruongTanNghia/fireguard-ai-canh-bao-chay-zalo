"""Kiểm thử toàn diện backend FireGuard AI: 44 mục, chạy trên CSDL tạm (Bot Zalo tắt, không gửi tin thật)."""
import os, sys, time, json, subprocess, asyncio, requests, sqlite3
sys.stdout.reconfigure(encoding="utf-8")
import tempfile
# Cách chạy (tại thư mục gốc dự án):  python tests/kiem_thu_toan_dien.py
# Dùng CSDL tạm trong thư mục Temp và tắt gửi Zalo, nên KHÔNG đụng dữ liệu thật và KHÔNG gửi tin thật.
# Cần cổng 8899 trống. Webcam là tùy chọn (không có webcam thì mục Camera 1 sẽ FAIL).
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix="fireguard_test_")
BACKEND = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "backend")
PORT = 8899
BASE = f"http://127.0.0.1:{PORT}"
DB = f"{S}/full_test.db"
if os.path.exists(DB):
    os.remove(DB)
SNAP_DIR = os.path.join(BACKEND, "data", "fire_snapshots")
os.makedirs(SNAP_DIR, exist_ok=True)  # bản clone mới chưa có thư mục này
snaps_before = set(os.listdir(SNAP_DIR))

results = []
def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail else ""), flush=True)

env = dict(os.environ, DATABASE_URL=f"sqlite:///{DB}", PYTHONIOENCODING="utf-8", ENABLE_FIRE_ZALO="false")
log = open(f"{S}/full_test_backend.log", "w", encoding="utf-8")
proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(PORT)],
                        cwd=BACKEND, env=env, stdout=log, stderr=subprocess.STDOUT)
try:
    for _ in range(120):
        try:
            if requests.get(BASE + "/api/system/health", timeout=2).ok:
                break
        except Exception:
            pass
        time.sleep(1)

    # Khóa chặt: tắt gửi Zalo trong CSDL tạm trước mọi thao tác
    con = sqlite3.connect(DB)
    con.execute("UPDATE zalo_bot_configs SET is_active=0") if con.execute(
        "SELECT name FROM sqlite_master WHERE name='zalo_bot_configs'").fetchone() else None
    con.commit(); con.close()

    h = requests.get(BASE + "/api/system/health").json()
    check("Health check", h.get("status") in ("ok", "healthy", "running") or "ai_engine" in h, json.dumps(h)[:160])

    # ---------- Xác thực ----------
    r = requests.post(BASE + "/api/auth/login", json={"username": "admin", "password": "sai_mat_khau"})
    check("Đăng nhập sai mật khẩu bị từ chối", r.status_code in (400, 401), r.status_code)
    r = requests.get(BASE + "/api/fire-cameras")
    check("API camera chặn khi chưa đăng nhập", r.status_code in (401, 403), r.status_code)
    r = requests.post(BASE + "/api/auth/login", json={"username": "admin", "password": "admin123"})
    check("Đăng nhập admin/admin123", r.ok, r.status_code)
    H = {"Authorization": f"Bearer {r.json()['access_token']}"}
    me = requests.get(BASE + "/api/auth/me", headers=H).json()
    check("/auth/me trả về admin", me.get("username") == "admin" and me.get("role") == "admin")

    # ---------- Cấu hình hệ thống ----------
    st = requests.get(BASE + "/api/settings", headers=H)
    check("Đọc cấu hình", st.ok)
    r = requests.put(BASE + "/api/settings", headers=H, json={"enable_fire_zalo": False, "fire_alert_cooldown": 5})
    check("Cập nhật cấu hình (tắt Zalo, cooldown 5s)", r.ok and r.json()["enable_fire_zalo"] is False, r.status_code)

    # ---------- Bot Zalo ----------
    bots = requests.get(BASE + "/api/zalo-bots", headers=H)
    check("Danh sách Bot Zalo", bots.ok and all(not b["is_active"] for b in bots.json()), f"{len(bots.json())} bot, đều tắt")
    r = requests.post(BASE + "/api/zalo-bots", headers=H, json={"name": "Bot kiểm thử", "is_active": False})
    check("Tạo Bot Zalo", r.ok, r.status_code)
    if r.ok:
        bid = r.json()["id"]
        r2 = requests.put(BASE + f"/api/zalo-bots/{bid}", headers=H, json={"name": "Bot kiểm thử 2"})
        check("Sửa Bot Zalo", r2.ok and r2.json()["name"] == "Bot kiểm thử 2")
        check("Xóa Bot Zalo", requests.delete(BASE + f"/api/zalo-bots/{bid}", headers=H).ok)

    # ---------- Người dùng ----------
    r = requests.post(BASE + "/api/users", headers=H, json={"username": "vanhanh_test", "password": "matkhau123",
                                                              "full_name": "Vận hành thử", "role": "operator"})
    check("Tạo người dùng", r.ok, r.status_code)
    if r.ok:
        uid = r.json()["id"]
        r2 = requests.post(BASE + "/api/auth/login", json={"username": "vanhanh_test", "password": "matkhau123"})
        check("Người dùng mới đăng nhập được", r2.ok)
        UH = {"Authorization": f"Bearer {r2.json()['access_token']}"}
        r3 = requests.post(BASE + "/api/auth/change-password", headers=UH,
                           json={"old_password": "matkhau123", "new_password": "matkhau456"})
        check("Đổi mật khẩu", r3.ok, r3.status_code)
        r4 = requests.post(BASE + "/api/auth/login", json={"username": "vanhanh_test", "password": "matkhau456"})
        check("Đăng nhập bằng mật khẩu mới", r4.ok)
        check("Sửa người dùng", requests.put(BASE + f"/api/users/{uid}", headers=H, json={"full_name": "Đã sửa"}).ok)
        check("Xóa người dùng", requests.delete(BASE + f"/api/users/{uid}", headers=H).ok)

    # ---------- Sơ đồ & camera ----------
    sm = requests.get(BASE + "/api/site-map", headers=H)
    check("Sơ đồ mặc định là ảnh vệ tinh Học viện", sm.ok and "Học viện" in sm.json()["name"]
          and sm.json()["image_path"].endswith("site_map.png"), sm.json().get("name"))
    img = requests.get(BASE + sm.json()["image_path"])
    check("Ảnh sơ đồ tải được", img.ok and img.content[:4] == b"\x89PNG", f"{len(img.content)} bytes")

    cams = requests.get(BASE + "/api/fire-cameras", headers=H).json()
    check("Có 5 camera mẫu, đều ghim trên bản đồ", len(cams) == 5 and all(c["map_pin_x"] is not None for c in cams))
    check("Camera 2-5 trỏ vào luồng RTSP giả lập", [c["rtsp_url"] for c in cams[1:]] ==
          [f"rtsp://127.0.0.1:8554/cam{i}" for i in range(2, 6)])

    r = requests.post(BASE + "/api/fire-cameras", headers=H, json={"name": "Cam kiểm thử", "rtsp_url": "rtsp://127.0.0.1:9/khongton",
                                                                    "camera_type": "rtsp", "is_active": False})
    check("Thêm camera", r.ok, r.status_code)
    if r.ok:
        cid = r.json()["id"]
        check("Sửa camera", requests.put(BASE + f"/api/fire-cameras/{cid}", headers=H, json={"location": "Kho"}).ok)
        check("Bật/tắt camera", requests.post(BASE + f"/api/fire-cameras/{cid}/toggle", headers=H).ok)
        p = requests.post(BASE + "/api/site-map/pin", headers=H, json={"camera_id": cid, "map_pin_x": 50, "map_pin_y": 50})
        check("Ghim camera lên bản đồ", p.ok, p.status_code)
        check("Gỡ ghim camera", requests.delete(BASE + f"/api/site-map/pin/{cid}", headers=H).ok)
        check("Xóa camera", requests.delete(BASE + f"/api/fire-cameras/{cid}", headers=H).ok)

    vids = requests.get(BASE + "/api/demo-feed/videos", headers=H)
    check("Danh sách video demo", vids.ok and "fire1.mp4" in vids.json(), vids.json() if vids.ok else vids.status_code)

    # ---------- Giám sát trực tiếp: webcam + RTSP chưa bật bộ phát ----------
    requests.post(BASE + "/api/fire-cameras/2/toggle", headers=H)  # bật camera 2 (RTSP)
    r = requests.post(BASE + "/api/ai/live/start", headers=H)
    check("Bật giám sát trực tiếp", r.ok, r.status_code)
    cam1_ok = False
    for _ in range(25):
        st = requests.get(BASE + "/api/ai/status", headers=H).json()
        c1 = next((c for c in st["cameras"] if c["id"] == 1), None)
        if c1 and c1["is_connected"] and c1["fps"] > 0:
            cam1_ok = True
            break
        time.sleep(1)
    check("Camera 1 (webcam) kết nối và có khung hình", cam1_ok, c1)
    c2 = next((c for c in st["cameras"] if c["id"] == 2), None)
    check("Camera 2 (RTSP, bộ phát chưa chạy) không làm sập hệ thống", c2 is not None and requests.get(BASE + "/api/system/health").ok, c2)

    with requests.get(BASE + "/api/stream/1", stream=True, timeout=10) as resp:
        buf = b""
        for chunk in resp.iter_content(4096):
            buf += chunk
            a = buf.find(b"\xff\xd8"); b = buf.find(b"\xff\xd9", a + 2)
            if a != -1 and b != -1:
                break
    check("Luồng MJPEG camera 1 trả về ảnh JPEG", a != -1 and b != -1)
    with requests.get(BASE + "/api/stream/2", stream=True, timeout=10) as resp:
        first = next(resp.iter_content(8192))
    check("Luồng MJPEG camera 2 trả ảnh chờ khi chưa có tín hiệu", resp.ok and b"\xff\xd8" in first)
    r = requests.post(BASE + "/api/ai/live/stop", headers=H)
    check("Tắt giám sát trực tiếp", r.ok)

    # ---------- AI thật: chạy video cháy, chờ FIRE_ALERT qua WebSocket ----------
    import websockets
    async def wait_ws(trigger, timeout):
        async with websockets.connect(f"ws://127.0.0.1:{PORT}/ws/events") as ws:
            await asyncio.sleep(0.5)
            await asyncio.to_thread(trigger)
            end = time.time() + timeout
            while time.time() < end:
                msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=end - time.time()))
                if msg.get("type") == "FIRE_ALERT":
                    return msg
    t0 = time.time()
    try:
        m = asyncio.run(wait_ws(lambda: requests.post(BASE + "/api/ai/demo/start", headers=H, json={"clip_name": "fire1.mp4"}), 90))
    except Exception as e:
        m = None
        print("   ws err:", e)
    check("YOLO phát hiện cháy trong video fire1.mp4 và đẩy FIRE_ALERT", m is not None,
          f"{time.time()-t0:.1f}s, {m['data'].get('alert_type')} conf={m['data'].get('confidence')}" if m else "")
    requests.post(BASE + "/api/ai/demo/stop", headers=H)

    try:
        m = asyncio.run(wait_ws(lambda: requests.post(BASE + "/api/ai/simulate", headers=H, json={"alert_type": "smoke"}), 15))
    except Exception:
        m = None
    check("Nút giả lập báo cháy đẩy FIRE_ALERT", m is not None)

    # ---------- Lịch sử sự cố ----------
    al = requests.get(BASE + "/api/fire-alerts", headers=H).json()
    items = al.get("items") or al.get("data") or al.get("alerts") or []
    check("Danh sách sự cố có dữ liệu", al.get("total", len(items)) >= 2, f"total={al.get('total')}")
    if items:
        aid = items[0]["id"]
        d = requests.get(BASE + f"/api/fire-alerts/{aid}", headers=H)
        check("Xem chi tiết sự cố", d.ok)
        snap = d.json().get("snapshot_path")
        if snap:
            check("Ảnh chụp sự cố tải được", requests.get(BASE + snap if snap.startswith("/") else BASE + "/" + snap).ok, snap)
        u = requests.put(BASE + f"/api/fire-alerts/{aid}", headers=H, json={"status": "verified", "admin_notes": "kiểm thử"})
        check("Xác nhận sự cố", u.ok and u.json()["status"] == "verified")
    check("Thống kê sự cố", requests.get(BASE + "/api/fire-alerts/stats", headers=H).ok)
    x = requests.get(BASE + "/api/fire-alerts/export/excel", headers=H)
    check("Xuất Excel", x.ok and x.content[:2] == b"PK" and "attachment" in (x.headers.get("content-disposition") or ""),
          f"{len(x.content)} bytes")
    if items:
        check("Xóa sự cố", requests.delete(BASE + f"/api/fire-alerts/{items[-1]['id']}", headers=H).ok)
    check("Nhật ký kiểm toán", requests.get(BASE + "/api/audit-logs", headers=H).ok or requests.get(BASE + "/api/audit", headers=H).ok)
finally:
    proc.terminate(); proc.wait(15); log.close()
    for f in set(os.listdir(SNAP_DIR)) - snaps_before:  # dọn ảnh chụp do kiểm thử tạo ra
        try:
            os.remove(os.path.join(SNAP_DIR, f))
        except OSError:
            pass

ok = sum(1 for _, p in results if p)
print(f"\n==== KẾT QUẢ: {ok}/{len(results)} PASS ====")
sys.exit(0 if ok == len(results) else 1)
