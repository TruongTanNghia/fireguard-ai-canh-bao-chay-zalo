<p align="center">
  <img src="assets/banner.svg" alt="FireGuard AI - Giám sát báo cháy bằng camera AI và cảnh báo qua Zalo" width="100%" />
</p>

<p align="center">
  <img src="frontend/public/logo-hv-pccc.png" alt="Học viện Phòng cháy Chữa cháy và Cứu nạn Cứu hộ" width="104" />
  &nbsp;&nbsp;&nbsp;
  <img src="assets/logo-aihoclaptrinh.jpeg" alt="AI Học Lập Trình" width="104" style="border-radius:16px" />
</p>

<h1 align="center">🔥 FireGuard AI · Giám sát Báo cháy &amp; Cảnh báo Zalo</h1>

<p align="center">
  <b>Hệ thống dùng YOLOv8s soi luồng camera để phát hiện lửa và khói, hú còi trên giao diện web và gửi cảnh báo kèm ảnh tới Zalo trong vài giây.<br/>
  Đề tài của nhóm sinh viên Học viện Phòng cháy Chữa cháy và Cứu nạn Cứu hộ.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tr%E1%BA%A1ng%20th%C3%A1i-%C4%90%C3%A3%20ki%E1%BB%83m%20th%E1%BB%AD%2044%2F44-F28C1B?style=for-the-badge" alt="Đã kiểm thử 44/44" />
  <img src="https://img.shields.io/badge/YOLOv8s-Ultralytics-0E4A63?style=for-the-badge" alt="YOLOv8s" />
  <img src="https://img.shields.io/badge/FastAPI-Python%203.11-1E8FA8?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Next.js-14-0E4A63?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/Ng%C3%B4n%20ng%E1%BB%AF-Ti%E1%BA%BFng%20Vi%E1%BB%87t-F28C1B?style=for-the-badge" alt="Tiếng Việt" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/OpenCV-RTSP%20%C2%B7%20Webcam-3BB8C3?style=flat-square&logo=opencv&logoColor=white" alt="OpenCV" />
  <img src="https://img.shields.io/badge/SQLite-SQLAlchemy%202-1E8FA8?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-3BB8C3?style=flat-square&logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/TypeScript-5-0E4A63?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Windows-10%20%2F%2011-1E8FA8?style=flat-square&logo=windows&logoColor=white" alt="Windows" />
  <img src="https://img.shields.io/badge/License-All%20Rights%20Reserved-F28C1B?style=flat-square" alt="All Rights Reserved" />
</p>

> [!IMPORTANT]
> **Bản quyền thuộc về Trương Tấn Nghĩa (AI Học Lập Trình). Bảo lưu mọi quyền.**
> Được truy cập kho mã này không có nghĩa là được phép sao chép, phân phối hay dùng vào mục đích thương mại. Xem chi tiết trong [LICENSE](LICENSE).

---

## 📑 Mục lục

- [👥 Đơn vị & nhóm thực hiện](#-đơn-vị--nhóm-thực-hiện)
- [✨ Điểm nổi bật](#-điểm-nổi-bật)
- [🖼️ Giao diện](#️-giao-diện)
- [🔄 Luồng xử lý](#-luồng-xử-lý)
- [🧭 Kiến trúc & sơ đồ](#-kiến-trúc--sơ-đồ)
- [🚀 Cài đặt & chạy](#-cài-đặt--chạy)
- [📡 Luồng RTSP giả lập camera IP](#-luồng-rtsp-giả-lập-camera-ip)
- [🧪 Kiểm thử](#-kiểm-thử)
- [📂 Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [📚 Tài liệu bàn giao](#-tài-liệu-bàn-giao)
- [✍️ Tác giả](#️-tác-giả)

---

## 👥 Đơn vị & nhóm thực hiện

| Vai trò | Thông tin |
| :--- | :--- |
| 🏛️ Đơn vị | Học viện Phòng cháy Chữa cháy và Cứu nạn Cứu hộ (Fire and Rescue Academy) |
| 🎖️ Giảng viên hướng dẫn | Đại úy Mai Danh Giang - Giảng viên Khoa Nghiệp vụ 3 |
| 🎓 Nhóm sinh viên thực hiện | Nguyễn Hoài Thu - D39C |
| | Huỳnh Phan Quan Tỷ - D39C |

> Thông tin này hiển thị trên giao diện (trang đăng nhập và thanh bên), được khai báo tại [`frontend/src/utils/projectInfo.ts`](frontend/src/utils/projectInfo.ts).

---

## ✨ Điểm nổi bật

<table>
  <tr>
    <td width="33%" valign="top">
      <h3>🔥 Nhận diện lửa &amp; khói</h3>
      Mô hình YOLOv8s riêng (<code>yolov8s_best.pt</code>) nhận diện 2 lớp <code>fire</code> và <code>smoke</code>. Chạy GPU CUDA nếu có, không có thì chạy CPU.
    </td>
    <td width="33%" valign="top">
      <h3>✅ Chống báo nhầm</h3>
      Chỉ báo cháy khi vượt ngưỡng tin cậy và lặp lại trên nhiều khung hình trong 2,5 giây, kèm thời gian chờ giữa hai lần báo. Mọi ngưỡng chỉnh được trong trang Cài đặt.
    </td>
    <td width="33%" valign="top">
      <h3>📱 Cảnh báo Zalo</h3>
      Gửi qua Zalo Bot API tới tối đa 10 bot. Mỗi vụ cháy gửi 3 đợt, cách nhau 5 giây, kèm ảnh chụp tải lên ImgBB. Hàng đợi outbox giữ tin khi mạng chập chờn.
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <h3>🗺️ Bản đồ khuôn viên</h3>
      Ảnh vệ tinh khuôn viên Học viện với 5 ghim camera. Ghim đổi màu theo trạng thái và nhấp nháy đỏ đúng vị trí đang cháy. Bấm vào ghim để xem trực tiếp.
    </td>
    <td width="33%" valign="top">
      <h3>🚨 Còi hú tức thì</h3>
      Sự kiện cháy đẩy tới trình duyệt qua WebSocket. Giao diện phát còi bằng Web Audio, bật/tắt và chỉnh âm lượng được.
    </td>
    <td width="33%" valign="top">
      <h3>📋 Hồ sơ sự cố</h3>
      Lưu ảnh bằng chứng, lọc theo ngày, loại và trạng thái, xác minh hoặc đánh dấu báo nhầm, xuất báo cáo Excel. Có phân quyền người dùng và nhật ký thao tác.
    </td>
  </tr>
</table>

---

## 🖼️ Giao diện

<table>
  <tr>
    <td width="50%"><img src="assets/screenshots/dang-nhap.jpg" alt="Trang đăng nhập" /></td>
    <td width="50%"><img src="assets/screenshots/trung-tam-giam-sat.jpg" alt="Trung tâm giám sát" /></td>
  </tr>
  <tr>
    <td align="center"><b>Đăng nhập</b>: logo Học viện, giảng viên và nhóm thực hiện</td>
    <td align="center"><b>Trung tâm giám sát</b>: chọn camera, chế độ trực tiếp hoặc demo</td>
  </tr>
</table>

<p align="center">
  <img src="assets/screenshots/so-do-ban-do.jpg" alt="Sơ đồ bản đồ báo cháy 2D trên ảnh vệ tinh khuôn viên Học viện" width="100%" />
  <br/><b>Bản đồ báo cháy 2D</b>: ghim camera trên ảnh vệ tinh khuôn viên Học viện
</p>

---

## 🔄 Luồng xử lý

<p align="center">
  <img src="assets/workflow.svg" alt="Luồng xử lý một vụ cháy" width="100%" />
</p>

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#FCF6EC','primaryTextColor':'#0E4A63','primaryBorderColor':'#1E8FA8','lineColor':'#0E4A63','secondaryColor':'#F3E3CC','tertiaryColor':'#FFFFFF','fontFamily':'Segoe UI, Arial'}}}%%
flowchart LR
    A["📹 Camera<br/>RTSP / Webcam / Video"] --> B["🧠 YOLOv8s<br/>fire · smoke"]
    B --> C{"Vượt ngưỡng và<br/>đủ số khung hình?"}
    C -- Chưa --> A
    C -- Đủ --> D{"Đã qua thời gian<br/>chờ giữa 2 lần báo?"}
    D -- Chưa --> A
    D -- Rồi --> E["🗂️ Lưu ảnh + sự cố<br/>vào SQLite"]
    E --> F["🚨 WebSocket<br/>còi hú + ghim đỏ"]
    E --> G["📦 Outbox"]
    G --> H["🖼️ ImgBB<br/>tải ảnh lên"]
    H --> I["📱 Zalo Bot<br/>3 đợt / 5 giây"]
    style C fill:#FFB547,stroke:#F28C1B,color:#0E4A63
    style D fill:#FFB547,stroke:#F28C1B,color:#0E4A63
    style F fill:#F28C1B,stroke:#0E4A63,color:#FFFFFF
    style I fill:#F28C1B,stroke:#0E4A63,color:#FFFFFF
```

---

## 🧭 Kiến trúc & sơ đồ

<table>
  <tr>
    <td width="50%" valign="top">

**Các phân hệ của hệ thống**

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#0E4A63','primaryTextColor':'#FFFFFF','secondaryColor':'#1E8FA8','tertiaryColor':'#F28C1B','lineColor':'#0E4A63','fontFamily':'Segoe UI, Arial'}}}%%
mindmap
  root((FireGuard AI))
    Camera
      RTSP
      Webcam
      Video demo
    AI
      YOLOv8s
      Lửa và khói
      Xác nhận nhiều khung
    Cảnh báo
      Còi hú web
      Zalo Bot
      Ảnh ImgBB
    Quản trị
      Bản đồ 2D
      Lịch sử và Excel
      Người dùng
      Nhật ký
```

</td>
    <td width="50%" valign="top">

**Tỉ lệ mã nguồn theo ngôn ngữ (số dòng)**

```mermaid
%%{init: {'theme':'base','themeVariables':{'pie1':'#0E4A63','pie2':'#F28C1B','pie3':'#1E8FA8','pie4':'#FFB547','pie5':'#3BB8C3','pieStrokeColor':'#FCF6EC','pieTitleTextColor':'#0E4A63','pieSectionTextColor':'#FFFFFF','pieLegendTextColor':'#0E4A63','fontFamily':'Segoe UI, Arial'}}}%%
pie showData
    "TSX giao diện" : 4947
    "Python backend + AI" : 3465
    "TypeScript" : 329
    "Batch Windows" : 229
    "CSS" : 128
```

</td>
  </tr>
</table>

**Trình tự một lần báo cháy**

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#FCF6EC','primaryTextColor':'#0E4A63','primaryBorderColor':'#1E8FA8','lineColor':'#0E4A63','actorBkg':'#0E4A63','actorTextColor':'#FFFFFF','actorBorder':'#0E4A63','signalColor':'#0E4A63','signalTextColor':'#0E4A63','noteBkgColor':'#FFB547','noteTextColor':'#0E4A63','noteBorderColor':'#F28C1B','activationBkgColor':'#3BB8C3','fontFamily':'Segoe UI, Arial'}}}%%
sequenceDiagram
    autonumber
    participant Cam as 📹 Luồng camera
    participant AI as 🧠 Engine YOLOv8s
    participant DB as 🗂️ SQLite
    participant WS as 🔌 WebSocket
    participant Web as 🖥️ Trình duyệt
    participant OB as 📦 Outbox worker
    participant Zalo as 📱 Zalo Bot
    Cam->>AI: Khung hình (luồng riêng cho từng camera)
    AI->>AI: Nhận diện + xác nhận nhiều khung + thời gian chờ
    AI->>DB: Lưu ảnh chụp, sự cố, sự kiện outbox
    AI->>WS: FIRE_ALERT
    WS-->>Web: Còi hú, ghim đỏ, thông báo
    OB->>DB: Lấy sự kiện đang chờ
    OB->>Zalo: Đợt 1/3 kèm ảnh (ImgBB)
    Note over OB,Zalo: Cách 5 giây gửi tiếp đợt 2, đợt 3
    OB->>DB: Ghi kết quả gửi từng bot
```

<table>
  <tr>
    <td width="50%" valign="top">

**Trạng thái một camera**

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#FCF6EC','primaryTextColor':'#0E4A63','primaryBorderColor':'#1E8FA8','lineColor':'#0E4A63','fontFamily':'Segoe UI, Arial'}}}%%
stateDiagram-v2
    state "Chờ bật" as Standby
    state "Đang kết nối" as Connecting
    state "Đang quét AI" as Scanning
    state "Báo cháy" as Alert
    [*] --> Standby
    Standby --> Connecting: Bật giám sát
    Connecting --> Scanning: Đọc được khung hình
    Connecting --> Connecting: Lỗi, thử lại sau 3 giây
    Scanning --> Alert: Xác nhận lửa hoặc khói
    Alert --> Scanning: Hết thời gian chờ
    Scanning --> Connecting: Mất tín hiệu
    Scanning --> Standby: Tắt giám sát
```

</td>
    <td width="50%" valign="top">

**Các bảng dữ liệu chính**

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#FCF6EC','primaryTextColor':'#0E4A63','primaryBorderColor':'#1E8FA8','lineColor':'#F28C1B','fontFamily':'Segoe UI, Arial'}}}%%
erDiagram
    SITE_MAPS ||--o{ FIRE_CAMERAS : "ghim"
    FIRE_CAMERAS ||--o{ FIRE_ALERTS : "phát sinh"
    OUTBOX_EVENTS ||--o{ OUTBOX_DELIVERIES : "gửi"
    ZALO_BOT_CONFIGS ||--o{ OUTBOX_DELIVERIES : "nhận"
    SYSTEM_USERS ||--o{ AUDIT_LOGS : "thao tác"
    FIRE_CAMERAS {
        int id
        string rtsp_url
        string camera_type
        float map_pin_x
        float map_pin_y
    }
    FIRE_ALERTS {
        int id
        string alert_type
        float confidence
        string snapshot_path
        string status
    }
    OUTBOX_EVENTS {
        int id
        string event_type
        string status
        int retry_count
    }
```

</td>
  </tr>
</table>

<details>
<summary><b>📘 Danh sách API của backend (bấm để mở)</b></summary>

<br/>

Tài liệu tương tác đầy đủ ở `http://localhost:8000/docs` (Swagger). Mọi API, trừ đăng nhập, cần token đăng nhập.

| Nhóm | Đường dẫn | Chức năng |
| :--- | :--- | :--- |
| Xác thực | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password` | Đăng nhập JWT, thông tin tài khoản, đổi mật khẩu |
| Điều khiển AI | `POST /api/ai/live/start` · `live/stop` · `demo/start` · `demo/stop` · `simulate`, `GET /api/ai/status` | Bật/tắt giám sát, chạy video demo, giả lập báo cháy, xem trạng thái |
| Camera | `GET/POST /api/fire-cameras`, `PUT/DELETE /api/fire-cameras/{id}`, `POST .../{id}/toggle` | Quản lý camera RTSP, webcam, video |
| Luồng hình | `GET /api/stream/{camera_id}`, `GET /api/stream/demo` | Luồng MJPEG đã vẽ khung nhận diện |
| Sự cố | `GET /api/fire-alerts`, `GET /stats`, `GET/PUT/DELETE /{id}`, `GET /export/excel` | Tra cứu, thống kê, xác minh, xuất Excel |
| Sơ đồ | `GET /api/site-map`, `POST /upload`, `POST /pin`, `DELETE /pin/{camera_id}` | Ảnh sơ đồ và vị trí ghim camera |
| Bot Zalo | `GET/POST /api/zalo-bots`, `PUT/DELETE /{id}`, `POST /test-send`, `POST /check-bot-id` | Tối đa 10 bot, gửi thử |
| Cấu hình | `GET/PUT /api/settings` | Ngưỡng AI, thời gian chờ, số đợt gửi Zalo, còi |
| Người dùng | `GET/POST /api/users`, `PUT/DELETE /api/users/{id}` | Vai trò admin, operator, viewer |
| Nhật ký | `GET /api/audit-logs` | Lịch sử thao tác |
| Thời gian thực | `WS /ws/events` | Sự kiện `FIRE_ALERT` |

</details>

<details>
<summary><b>⚙️ Các ngưỡng mặc định (chỉnh trong Cài đặt)</b></summary>

<br/>

| Tham số | Mặc định | Ý nghĩa |
| :--- | :---: | :--- |
| `fire_confidence_threshold` | 0.15 | Ngưỡng để vẽ khung nhận diện lên hình |
| `fire_alert_confidence_threshold` | 0.40 | Ngưỡng tin cậy để tính là có lửa |
| `fire_smoke_confidence_threshold` | 0.35 | Ngưỡng tin cậy để tính là có khói |
| `fire_confirmation_frames` | 2 | Số khung hình phát hiện cần có trong 2,5 giây |
| `fire_alert_cooldown` | 25 giây | Thời gian chờ giữa hai lần báo của một camera |
| `zalo_burst_count` / `zalo_burst_interval` | 3 đợt / 5 giây | Số đợt gửi Zalo và khoảng cách giữa các đợt |

</details>

---

## 🚀 Cài đặt & chạy

**Yêu cầu:** Windows 10/11, Python 3.10 hoặc 3.11, Node.js LTS. Có card NVIDIA thì AI chạy nhanh hơn, không có vẫn chạy được bằng CPU.

1. **Cài đặt tự động** (chỉ chạy lần đầu): nhấp đúp `cai_dat_tu_dong.bat`. Tệp này tạo môi trường Python, cài thư viện AI và giao diện, rồi khởi tạo dữ liệu mẫu.
2. **Khởi chạy cả hệ thống:** nhấp đúp `start_all.bat`.
3. Mở trình duyệt vào `http://localhost:3000` và đăng nhập bằng `admin` / `admin123`.
4. Bấm **BẬT GIÁM SÁT** để AI bắt đầu quét camera. Muốn thử nhanh thì chọn tab **DEMO** để chạy video cháy mẫu.

Chạy thủ công từng phần (Windows, PowerShell):

```powershell
# Backend: FastAPI + YOLOv8s, cổng 8000
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m app.db.seed          # tạo CSDL và dữ liệu mẫu (chạy lại không mất dữ liệu)
python main.py

# Frontend: Next.js, cổng 3000 (mở cửa sổ khác)
cd frontend
npm install
npm run dev
```

> [!TIP]
> Nếu cổng 8000 đã bị phần mềm khác chiếm, hãy chạy backend ở cổng khác, ví dụ `uvicorn app.main:app --port 8800`. Sau đó đặt biến môi trường `NEXT_PUBLIC_API_PORT=8800` trước khi chạy frontend.

> [!TIP]
> Webcam không lên hình? Hệ thống tự thử các chế độ DirectShow và Media Foundation, rồi tự dò webcam số 0 đến 3. Có thể chỉ định webcam bằng nguồn `webcam:1` trong **Cài đặt > Camera**.

> [!WARNING]
> - **Đổi mật khẩu `admin123`** và đặt `SECRET_KEY` riêng trong `backend/.env` trước khi dùng thật.
> - File CSDL `backend/data/fire_system.db` chứa token Bot Zalo và mật khẩu, **không được** đưa lên Git (đã chặn trong `.gitignore`).
> - Khi Bot Zalo đang bật, mỗi lần AI phát hiện cháy sẽ **gửi tin Zalo thật**. Hãy tắt Bot trong Cài đặt khi chỉ chạy thử.
> - AI phát hiện cháy chỉ để hỗ trợ, **không thay thế** hệ thống báo cháy đạt chuẩn theo quy định PCCC.

---

## 📡 Luồng RTSP giả lập camera IP

Khi chưa có camera IP thật, bộ phát trong [`tools/rtsp_gia_lap`](tools/rtsp_gia_lap) phát lặp lại các video cháy mẫu thành luồng RTSP, giống hệt camera thật.

1. Cài **ffmpeg**: `winget install Gyan.FFmpeg`
2. Nhấp đúp [`tools/rtsp_gia_lap/chay_rtsp_gia_lap.bat`](tools/rtsp_gia_lap/chay_rtsp_gia_lap.bat) và giữ cửa sổ mở. Lần đầu, tệp này tự tải máy chủ RTSP mã nguồn mở MediaMTX v1.9.3, khoảng 15 MB.
3. Camera 2 đến 5 đã trỏ sẵn vào các luồng dưới đây. Vào **Cài đặt > Camera** để bật kích hoạt.

| Luồng | Video phát |
| :--- | :--- |
| `rtsp://127.0.0.1:8554/cam2` | `fire1.mp4` |
| `rtsp://127.0.0.1:8554/cam3` | `fire2.mp4` |
| `rtsp://127.0.0.1:8554/cam4` | `fire3.mp4` |
| `rtsp://127.0.0.1:8554/cam5` | `street_car_fire_ccvt.mp4` |

Khi lắp camera thật, chỉ cần thay địa chỉ, ví dụ `rtsp://admin:matkhau@192.168.1.64:554/Streaming/Channels/101`.

---

## 🧪 Kiểm thử

Bộ kiểm thử [`tests/kiem_thu_toan_dien.py`](tests/kiem_thu_toan_dien.py) tự bật một backend riêng ở cổng 8899 với CSDL tạm, Bot Zalo tắt, nên không đụng dữ liệu thật và không gửi tin thật.

```powershell
# Tại thư mục gốc dự án (cần đã cài thư viện backend và: pip install websockets requests)
python tests/kiem_thu_toan_dien.py
```

Kết quả chạy ngày 11/11/2026 trên máy phát triển: **44/44 mục đạt**. Các mục kiểm tra gồm:

- Đăng nhập, chặn truy cập trái phép, đổi mật khẩu.
- Thêm, sửa, xóa camera, người dùng và Bot Zalo; ghim và gỡ ghim camera.
- Webcam lên hình; camera RTSP mất tín hiệu không làm sập hệ thống và vẫn trả ảnh chờ.
- YOLOv8s phát hiện cháy thật trong `fire1.mp4` và đẩy `FIRE_ALERT` qua WebSocket.
- Nút giả lập báo cháy; xem, xác minh, xóa sự cố; thống kê; xuất Excel; nhật ký.

Frontend được kiểm tra bằng `tsc --noEmit`, `next build` và trình duyệt tự động mở từng trang, kể cả bản đồ ở khổ điện thoại 390 px.

> [!NOTE]
> Bộ phát RTSP giả lập chưa được chạy thử từ đầu đến cuối trên máy phát triển. **Đang chờ kiểm tra.** Cấu hình đã được đối chiếu với tệp mẫu của MediaMTX v1.9.3.

---

## 📂 Cấu trúc thư mục

```text
📦 fireguard-ai-canh-bao-chay-zalo
├── 🐍 backend/                     Máy chủ FastAPI + AI
│   ├── app/
│   │   ├── core/                   Cấu hình, bảo mật (JWT, bcrypt)
│   │   ├── db/                     Kết nối SQLite, dữ liệu mẫu (seed.py)
│   │   ├── models/ · schemas/      Bảng dữ liệu và kiểu dữ liệu API
│   │   ├── routers/                11 nhóm API + WebSocket
│   │   ├── services/fire/engine.py ⭐ Lõi AI: luồng camera, YOLOv8s, xác nhận, báo cháy
│   │   ├── services/outbox.py      Hàng đợi gửi Zalo bền vững
│   │   └── utils/zalo_utils.py     Gửi Zalo Bot API, tải ảnh ImgBB
│   ├── data/
│   │   ├── demo_videos/            5 video cháy mẫu
│   │   └── site_maps/              Ảnh vệ tinh khuôn viên
│   ├── models/yolov8s_best.pt      🧠 Trọng số mô hình lửa/khói
│   └── requirements.txt
├── ⚛️ frontend/                    Giao diện Next.js 14
│   ├── app/                        Trang: chủ, bản đồ, sự cố, giám sát, cài đặt, đăng nhập
│   ├── src/components · contexts   Thanh điều hướng, thẻ camera, cảnh báo thời gian thực
│   ├── src/features/audio/         Còi hú Web Audio
│   └── public/                     Logo Học viện, ảnh sơ đồ
├── 📡 tools/rtsp_gia_lap/          Bộ phát RTSP giả lập (MediaMTX + ffmpeg)
├── 🧪 tests/                       Bộ kiểm thử toàn diện
├── 🎨 assets/                      Banner, sơ đồ, chữ ký, ảnh giao diện cho README
├── 📄 Tài liệu doc/ · BOT ZALO/    Hướng dẫn cài đặt, kiến trúc, tạo Zalo Bot
├── ⚙️ cai_dat_tu_dong.bat          Cài đặt 1 lần
└── ▶️ start_all.bat                Chạy cả hệ thống
```

| Thành phần | Trạng thái |
| :--- | :--- |
| Phát hiện lửa/khói YOLOv8s | ![](https://img.shields.io/badge/-Ho%C3%A0n%20th%C3%A0nh-0E4A63?style=flat-square) |
| Camera webcam & video demo | ![](https://img.shields.io/badge/-Ho%C3%A0n%20th%C3%A0nh-0E4A63?style=flat-square) |
| Camera RTSP | ![](https://img.shields.io/badge/-Ho%C3%A0n%20th%C3%A0nh-0E4A63?style=flat-square) |
| Còi hú, WebSocket, bản đồ 2D | ![](https://img.shields.io/badge/-Ho%C3%A0n%20th%C3%A0nh-0E4A63?style=flat-square) |
| Gửi Zalo Bot + ảnh ImgBB | ![](https://img.shields.io/badge/-Ho%C3%A0n%20th%C3%A0nh-0E4A63?style=flat-square) |
| Lịch sử sự cố, xuất Excel | ![](https://img.shields.io/badge/-Ho%C3%A0n%20th%C3%A0nh-0E4A63?style=flat-square) |
| Bộ phát RTSP giả lập | ![](https://img.shields.io/badge/-%C4%90ang%20ch%E1%BB%9D%20ki%E1%BB%83m%20tra-F28C1B?style=flat-square) |
| Phân quyền chi tiết theo vai trò | ![](https://img.shields.io/badge/-%C4%90ang%20ph%C3%A1t%20tri%E1%BB%83n-F28C1B?style=flat-square) |

---

## 📚 Tài liệu bàn giao

- 📘 [Hướng dẫn cài đặt & vận hành (bản chính thức)](HDSD_VA_CAI_DAT.md)
- 📄 [Hướng dẫn cài đặt và chạy chi tiết](Tài%20liệu%20doc/HUONG_DAN_CAI_DAT_VA_CHAY.md)
- 📄 [Hướng dẫn cấu hình Zalo Bot](Tài%20liệu%20doc/HUONG_DAN_CAU_HINH_ZALO_BOT.md)
- 📄 [Tài liệu kiến trúc hệ thống](Tài%20liệu%20doc/KIEN_TRUC_HE_THONG.md)
- 📝 Hướng dẫn tạo Zalo Bot có hình minh họa: thư mục [`BOT ZALO`](BOT%20ZALO)

---

## ✍️ Tác giả

<p align="center">
  <img src="assets/logo-aihoclaptrinh.jpeg" alt="AI Học Lập Trình" width="88" style="border-radius:14px" />
</p>

<h3 align="center">Trương Tấn Nghĩa</h3>

<p align="center"><b>AI Học Lập Trình</b> · 🔥 <i>Never give up</i> 🔥</p>

<p align="center">
  <a href="https://github.com/TruongTanNghia"><img src="https://img.shields.io/badge/GitHub-TruongTanNghia-0E4A63?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" /></a>
  <a href="https://nghia-dev-profile.vercel.app"><img src="https://img.shields.io/badge/Portfolio-nghia--dev--profile-1E8FA8?style=for-the-badge&logo=vercel&logoColor=white" alt="Portfolio" /></a>
  <a href="https://www.tiktok.com/@aihoclaptrinh"><img src="https://img.shields.io/badge/TikTok-@aihoclaptrinh-F28C1B?style=for-the-badge&logo=tiktok&logoColor=white" alt="TikTok" /></a>
</p>

<p align="center">
  <img src="assets/signature.svg" alt="Chữ ký Trương Tấn Nghĩa" width="420" />
</p>

<p align="center">
  <sub>© 2026 Trương Tấn Nghĩa · AI Học Lập Trình. All Rights Reserved.<br/>Tài liệu riêng tư · Nghiêm cấm sao chép, phân phối khi chưa được phép.</sub>
</p>
