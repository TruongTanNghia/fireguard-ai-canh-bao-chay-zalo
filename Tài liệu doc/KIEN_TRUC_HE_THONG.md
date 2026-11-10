# 🏛️ TÀI LIỆU THIẾT KẾ KIẾN TRÚC HỆ THỐNG
## HỆ THỐNG BÁO CHÁY & CẢNH BÁO ZALO AI (FIREGUARD AI PRO 2.0)

---

## 📐 1. TỔNG QUAN KIẾN TRÚC

Hệ thống được thiết kế theo mô hình **Client-Server phân tán & Hướng sự kiện (Event-Driven Architecture)**, tối ưu cho xử lý thị giác máy tính thời gian thực (Computer Vision) và phát thông báo đa kênh:

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js 14)                     │
│  - Live Multi-Camera Grid Dashboard (MJPEG Video Stream)    │
│  - Sơ đồ Mặt bằng 2D Tương tác (Site-Map Flame Overlays)    │
│  - Lịch sử Sự cố & Quản lý Bằng chứng Snapshot              │
│  - Phân hệ Cài đặt Toàn diện (/settings)                    │
└──────────────┬───────────────────────────────▲──────────────┘
               │ HTTP REST API                 │ WebSocket (/ws/events)
┌──────────────▼───────────────────────────────┴──────────────┐
│                    BACKEND (FastAPI)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ API Gateway & Session Authentication Middleware       │  │
│  └───────────────────────────┬───────────────────────────┘  │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │ FireDetectionEngine (YOLOv8s Inference Worker Pool)   │  │
│  │  - Luồng Camera 1 (Worker Thread 1)                   │  │
│  │  - Luồng Camera 2 (Worker Thread 2)                   │  │
│  │  - Đóng khung Bounding Box, Chụp Snapshot Hiện trường │  │
│  └───────────────────────────┬───────────────────────────┘  │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │ Transactional Outbox Pattern & Background Worker      │  │
│  │  - Quản lý hàng đợi OutboxEvents                      │  │
│  │  - Gửi loạt 3 tin Zalo (Burst 3 rounds cách nhau 5s)  │  │
│  │  - Upload ảnh ImgBB đính kèm                          │  │
│  └───────────────────────────┬───────────────────────────┘  │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │ SQLite Database (backend/data/fire_system.db)         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧠 2. NGUYÊN LÝ HOẠT ĐỘNG CỦA AI ENGINE (YOLOV8S)

1. **Multi-threaded Stream Worker**: Mỗi camera chạy trong 1 luồng riêng biệt, liên tục đọc frame từ nguồn RTSP/Webcam/Demo để loại bỏ độ trễ tích lũy.
2. **Inference Pipeline**:
   - Khung hình được đưa qua mạng YOLOv8s với độ phân giải tối ưu.
   - Trích xuất 2 lớp đối tượng: `fire` (ngọn lửa) và `smoke` (khói).
3. **Bộ lọc Khử nhiễu Đa khung hình (Confirmation Window)**:
   - Khi phát hiện đối tượng vượt ngưỡng tin cậy ($> 40\%$), hệ thống yêu cầu xác nhận liên tiếp 2–3 khung hình trong khoảng thời gian $2.5\text{ giây}$.
   - Cơ chế này loại bỏ hoàn toàn các cảnh báo giả từ đèn halogen, đèn pha xe hoặc ánh sáng mặt trời phản chiếu.
4. **Kích hoạt Sự cố (Event Triggering)**:
   - Lưu ảnh chụp khoảnh khắc hiện trường có vẽ bounding box độ nét cao vào `data/fire_snapshots/`.
   - Lưu bản ghi vào bảng `fire_alerts` trong CSDL.
   - Đẩy tác vụ gửi tin vào bảng `outbox_events`.
   - Phát sự kiện qua WebSocket tới trình duyệt để mở popup khẩn cấp và kích hoạt còi hú Web Audio Siren.

---

## 📦 3. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

1. **`system_users`**: Quản lý tài khoản và phân quyền (`admin`, `operator`, `viewer`).
2. **`fire_cameras`**: Quản lý danh sách camera, link RTSP, vị trí và tọa độ ghim $(X, Y)$ trên sơ đồ.
3. **`fire_alerts`**: Lưu vết sự cố (ảnh snapshot, video bằng chứng, loại cảnh báo, người xác minh).
4. **`site_maps`**: Lưu trữ ảnh sơ đồ mặt bằng các tầng / khu vực.
5. **`zalo_bot_configs`**: Quản lý đa Bot Zalo OA (tối đa 10 bot).
6. **`system_configs`**: Lưu trữ các tham số độ nhạy AI, thời gian cooldown, còi hú và ImgBB key.
7. **`outbox_events` & `outbox_deliveries`**: Đảm bảo gửi tin Zalo tin cậy, không nghẽn luồng.
8. **`audit_logs`**: Nhật ký kiểm toán phục vụ tra soát an ninh.
