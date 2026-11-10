# HƯỚNG DẪN CÀI ĐẶT & VẬN HÀNH HỆ THỐNG FIREGUARD AI PRO 2.0
## HỆ THỐNG GIÁM SÁT BÁO CHÁY TỰ ĐỘNG BẰNG AI & CẢNH BÁO TỨC THỜI QUA ZALO

---

## 1. GIỚI THIỆU TỔNG QUAN HỆ THỐNG

**FireGuard AI Pro 2.0** là giải pháp phần mềm thông minh ứng dụng trí tuệ nhân tạo (AI Computer Vision) để giám sát và phát hiện sớm các nguy cơ hỏa hoạn (ngọn lửa, khói) thông qua hệ thống camera an ninh sẵn có. Khi phát hiện sự cố, hệ thống sẽ tự động kích hoạt còi báo động tại chỗ và phát cảnh báo đa kênh tức thời (kèm hình ảnh hiện trường trực tiếp) đến tài khoản Zalo của Ban chỉ huy và Đội PCCC.

### Các công nghệ chủ chốt:
- **Trí tuệ nhân tạo (AI Core)**: YOLOv8s chuyên sâu cho khói & lửa, tối ưu hóa xử lý đa luồng đạt 25 - 30 FPS mượt mà trên CPU/GPU.
- **Backend API**: Python FastAPI tốc độ cao, kiến trúc hàng đợi Outbox đảm bảo gửi tin Zalo tin cậy 100%.
- **Frontend Dashboard**: Next.js 14, TailwindCSS, giao diện Dark Mode phong cách Trung tâm chỉ huy (Command Center).
- **Kênh thông báo tức thời**: Tích hợp Zapps Bot API (Zalo Bot) gửi thông báo kèm ảnh chụp hiện trường dạng `CHAT_PHOTO` độ phân giải cao.

---

## 2. YÊU CẦU HỆ THỐNG (SYSTEM REQUIREMENTS)

### 2.1. Cấu hình phần cứng tối thiểu:
- **Hệ điều hành**: Windows 10 / Windows 11 (64-bit) hoặc Windows Server.
- **Bộ vi xử lý (CPU)**: Intel Core i5 thế hệ 8 trở lên hoặc AMD Ryzen 5 (Tối thiểu 4 nhân, 8 luồng).
- **Bộ nhớ RAM**: Tối thiểu 8 GB RAM (Khuyến nghị 16 GB để chạy đồng thời nhiều camera).
- **Ổ cứng**: Tối thiểu 10 GB dung lượng trống (SSD để lưu trữ snapshot và logs nhanh chóng).
- **Camera tương thích**: 
  - Camera IP hỗ trợ giao thức **RTSP** (chuẩn H.264 / H.265).
  - Webcam cắm cổng USB (đối với thử nghiệm).
  - Video file định dạng MP4, AVI, MOV (dành cho chế độ Demo).

### 2.2. Môi trường phần mềm cần cài đặt trước:
1. **Python**: Phiên bản **3.10** hoặc **3.11** (64-bit). *Lưu ý: Tích chọn "Add Python to PATH" khi cài đặt*.
2. **Node.js**: Phiên bản **LTS (18.x hoặc 20.x)** (Tải tại: https://nodejs.org).

---

## 3. HƯỚNG DẪN CÀI ĐẶT HỆ THỐNG LẦN ĐẦU

### 🚀 Cách 1: Cài đặt tự động 1-Click (Khuyên dùng nhất)
Tại thư mục gốc của dự án, nhấp đúp chuột vào tệp:
👉 **`cai_dat_tu_dong.bat`**

Hệ thống sẽ tự động thực hiện 100% các công việc:
1. Kiểm tra môi trường Python và Node.js trên máy bạn.
2. Tự động tạo môi trường ảo Python `venv` độc lập, tương thích tuyệt đối với máy bạn.
3. Tự động cài đặt đầy đủ các thư viện AI (YOLOv8, PyTorch, OpenCV, FastAPI...).
4. Tự động cài đặt các gói giao diện Web (npm install) và đóng gói tối ưu (npm run build).
5. Tự động nạp dữ liệu mẫu và tài khoản quản trị ban đầu.

---

### 🛠️ Cách 2: Cài đặt thủ công từng bước (Nếu muốn tự kiểm soát)

### Bước 1: Chuẩn bị thư mục mã nguồn
Giải nén hoặc đặt toàn bộ thư mục dự án tại ổ đĩa máy chủ (Ví dụ: `D:\1.PROJECT\Canh_Bao_Chay_Zalo`).

### Bước 2: Cài đặt môi trường Backend (Python)
1. Mở cửa sổ dòng lệnh (Command Prompt hoặc PowerShell) tại thư mục `backend`:
   ```bash
   cd D:\1.PROJECT\Canh_Bao_Chay_Zalo\backend
   ```
2. Tạo môi trường ảo Python (Virtual Environment):
   ```bash
   python -m venv venv
   ```
3. Kích hoạt môi trường ảo:
   ```cmd
   venv\Scripts\activate
   ```
4. Cài đặt các thư viện phụ thuộc:
   ```bash
   pip install -r requirements.txt
   ```
5. Khởi tạo cơ sở dữ liệu ban đầu (Tự động tạo tài khoản quản trị và cấu hình mặc định):
   ```bash
   python -m app.db.seed
   ```

### Bước 3: Cài đặt giao diện Frontend (Node.js)
1. Mở cửa sổ dòng lệnh tại thư mục `frontend`:
   ```bash
   cd D:\1.PROJECT\Canh_Bao_Chay_Zalo\frontend
   ```
2. Cài đặt các gói thư viện Node.js:
   ```bash
   npm install
   ```
3. Xây dựng bản phân phối tối ưu (Build Production):
   ```bash
   npm run build
   ```

---

## 4. HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG

### Cách 1: Khởi chạy nhanh bằng 1 click (Khuyến nghị)
Tại thư mục gốc của dự án, nhấp đúp chuột vào tệp:
👉 **`start_all.bat`**

Hệ thống sẽ tự động mở 2 cửa sổ bảng điều khiển:
1. Cửa sổ **Backend Server (FastAPI)**: Chạy tại cổng `http://localhost:8000`
2. Cửa sổ **Frontend Web (Next.js)**: Chạy tại cổng `http://localhost:3000`

### Cách 2: Khởi chạy từng thành phần độc lập
- **Chạy Backend**: Vào thư mục `backend` và nhấp đúp vào `start_backend.bat`.
- **Chạy Frontend**: Vào thư mục `frontend` và nhấp đúp vào `start_frontend.bat`.

---

## 5. THÔNG TIN ĐĂNG NHẬP MẶC ĐỊNH

Khi hệ thống khởi chạy thành công, mở trình duyệt web (Google Chrome, Microsoft Edge, Cốc Cốc) và truy cập:
👉 **http://localhost:3000**

- **Tên đăng nhập (Username)**: `admin`
- **Mật khẩu (Password)**: `admin123`

*(Sau khi đăng nhập lần đầu, khuyến nghị Quản trị viên vào phân hệ Cài đặt hệ thống để đổi mật khẩu quản trị bảo mật hơn).*

---

## 6. HƯỚNG DẪN VẬN HÀNH CÁC PHÂN HỆ CHỨC NĂNG

### 6.1. Màn Hình Giám Sát Trung Tâm (`/`)
Đây là khu vực vận hành chính của nhân viên trực ban:
- **Chế độ TRỰC TIẾP (LIVE)**:
  - Giám sát các camera IP thực tế của nhà xưởng/cơ sở.
  - Tùy chọn bố cục linh hoạt: **1 Khung hình**, **2 Khung hình**, hoặc **4 Khung hình**.
  - Bấm nút **`BẬT GIÁM SÁT`** để kích hoạt AI nhận diện khói lửa. Khi muốn tạm dừng quét để tiết kiệm CPU, bấm **`TẮT GIÁM SÁT`**.
- **Chế độ THỬ NGHIỆM (DEMO)**:
  - Hoàn toàn tách biệt với camera thực tế (sử dụng luồng demo chuyên dụng).
  - Cho phép **kéo thả hoặc chọn tệp video (.mp4, .avi, .mov)** để tải lên thử nghiệm tính năng nhận diện cháy.
  - Cho phép chọn nhanh các video mẫu có sẵn (`fire1.mp4`, `fire2.mp4`).
  - Bấm nút **`BẬT DEMO`** để bắt đầu phát video và quét AI; bấm **`DỪNG DEMO`** để kết thúc.
- **Thanh trạng thái hiệu năng**:
  - Hiển thị nhịp FPS thời gian thực (~25 FPS mượt mà chuẩn video).
  - Thống kê tổng số sự cố phát hiện trong ngày.
  - Khi có cháy, khung camera phát cảnh báo viền đỏ phát sáng (`fire-alert-glow`) và phát âm thanh còi hú báo động.

### 6.2. Phân Hệ Lịch Sử Sự Cố & Bằng Chứng (`/alerts`)
- **Danh sách sự cố**: Lưu trữ toàn bộ các lần phát hiện cháy/khói với đầy đủ thông tin: Vị trí camera, loại sự cố (Lửa / Khói / Lửa & Khói), độ tin cậy AI (%), số lượng tin Zalo đã phát.
- **Thời gian chuẩn**: Khớp 100% theo đồng hồ thực tế Việt Nam (GMT+7).
- **Xem bằng chứng**: Bấm vào ảnh thumbnail để phóng to ảnh chụp hiện trường lúc xảy ra sự cố có vẽ khung nhận diện ngọn lửa.
- **Bộ lọc & Tìm kiếm**: Lọc nhanh sự cố theo camera, loại cảnh báo hoặc trạng thái xử lý.
- **Xuất báo cáo Excel**: Bấm nút **Xuất Excel** để tải báo cáo sự cố phục vụ công tác thanh tra PCCC.
- **Dọn dẹp lịch sử**: Bấm nút thùng rác cạnh tiêu đề để xóa các cảnh báo thử nghiệm khi cần thiết.

### 6.3. Phân Hệ Sơ Đồ Mặt Bằng 2D (`/map`)
- Hiển thị trực quan mặt bằng nhà máy/văn phòng.
- Định vị các điểm ghim camera trên từng phân khu (Xưởng sản xuất, kho nguyên liệu, bãi xe...).
- **Cảnh báo tức thời**: Khi một camera phát hiện cháy, icon ghim của camera đó trên bản đồ sẽ **nhấp nháy đỏ rực kèm hiệu ứng phát sáng**, giúp nhân viên trực ban định vị ngay vị trí cháy trên sơ đồ mặt bằng để điều động lực lượng ứng cứu.

### 6.4. Phân Hệ Cài Đặt Hệ Thống (`/settings`)
Dành riêng cho Quản trị viên (Super Admin):

#### 1. Quản lý Camera Báo Cháy:
- Thêm mới, chỉnh sửa thông tin hoặc xóa camera.
- Cấu hình nguồn phát: `webcam:0` (cho webcam) hoặc `rtsp://user:pass@ip:port/stream` (cho camera IP).
- **Nguyên tắc vận hành an toàn**: Việc lưu hoặc sửa camera tại đây **chỉ lưu vào CSDL và hoàn toàn không tự ý chạy ngầm camera**. Camera chỉ chạy khi người dùng chủ động bấm Bật Giám Sát ở Màn hình chính.
- Bảng hiển thị rõ ràng 2 trạng thái: **Luồng AI thực tế** (`🟢 Đang chạy AI` / `⚪ Chế độ chờ`) và **Trạng thái kích hoạt**.

#### 2. Cài Đặt Bot Zalo & ImgBB:
- **Tích hợp Bot Zalo**:
  - Nhập **Bot Access Token** được cấp bởi Zapps Bot.
  - Bấm nút **`⚡ Tự động nhận diện ID`** để hệ thống tự đọc Chat ID người nhận mà không cần nhập tay.
  - Bấm **`✉ Gửi tin thử nghiệm`** để test kết nối Zalo.
- **Cấu hình ImgBB API Key**:
  - Đăng ký API Key miễn phí tại [imgbb.com](https://api.imgbb.com).
  - Điền Key vào ô cấu hình để hệ thống tự động upload ảnh snapshot và gửi **ẢNH THẬT TRỰC TIẾP (CHAT_PHOTO)** vào nhóm Zalo.
- **Cấu hình gửi Burst (Báo động dồn dập)**:
  - Cài đặt số lượng tin nhắn gửi liên tục khi có cháy (mặc định: 3 tin, mỗi tin cách nhau 5 giây) để đảm bảo người nhận không bị bỏ lỡ thông báo khẩn cấp.

#### 3. Cấu hình Tham Số AI & Còi Báo Động:
- **Ngưỡng tin cậy ngọn lửa & khói**: Mặc định 0.40 (40%). Tăng/giảm theo điều kiện ánh sáng thực tế.
- **Số khung hình xác nhận**: Mặc định 2 khung hình để loại bỏ hiện tượng báo động giả.
- **Thời gian hồi phục (Cooldown)**: Khoảng thời gian tạm ngừng gửi tin sau khi đã phát cảnh báo (mặc định 25 giây).
- **Còi báo động**: Bật/tắt âm thanh còi hú khi phát hiện cháy, điều chỉnh âm lượng (1 - 100%), có nút thử nghiệm còi hú tại chỗ.

#### 4. Quản trị Người Dùng:
- Thêm mới tài khoản nhân viên trực ban (Role: `operator`) hoặc Quản trị viên (`admin`).
- Khóa hoặc kích hoạt lại tài khoản nhân sự.

---

## 7. XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

| Hiện tượng | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **Không mở được camera RTSP** | Sai địa chỉ IP, sai tài khoản/mật khẩu camera hoặc mạng LAN chập chờn | Dùng phần mềm VLC mở thử luồng `rtsp://...` để kiểm tra thông mạng trước khi dán vào FireGuard. |
| **Zalo nhận tin nhắn nhưng kèm link thay vì ảnh** | ImgBB chưa cấu hình Key hoặc mạng quốc tế bị nghẽn trong giây lát | Kiểm tra lại ImgBB API Key trong Cài đặt. Hệ thống có cơ chế tự động thử lại 5 lần để đảm bảo gửi ảnh thật dạng `CHAT_PHOTO`. |
| **Cổng 8000 hoặc 3000 bị báo đang bận** | Có phần mềm khác hoặc tiến trình cũ đang chiếm cổng | Mở PowerShell chạy lệnh: `Stop-Process -Name python, node -Force` rồi mở lại `start_all.bat`. |
| **Không nghe thấy tiếng còi hú trên máy tính** | Trình duyệt Chrome/Edge chặn tự động phát âm thanh (Autoplay Policy) | Nhấp chuột 1 lần vào bất kỳ vị trí nào trên màn hình trang web để cấp quyền âm thanh cho trình duyệt. |

---

## 8. THÔNG TIN HỖ TRỢ BÀN GIAO & BẢO TRÌ

- **Tài liệu kỹ thuật chi tiết**: Xem trong thư mục `/Tài liệu doc/`
- **Phiên bản bàn giao**: FireGuard AI Pro v2.0.0
- **Bản quyền**: Bàn giao trọn gói mã nguồn cho Khách hàng.
