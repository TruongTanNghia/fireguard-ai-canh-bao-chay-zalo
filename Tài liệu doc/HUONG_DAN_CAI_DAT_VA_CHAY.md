# 📖 HƯỚNG DẪN CÀI ĐẶT VÀ VẬN HÀNH HỆ THỐNG
## DỰ ÁN BÁO CHÁY & CẢNH BÁO ZALO AI (CANH_BAO_CHAY_ZALO)

---

## 💻 1. YÊU CẦU MÔI TRƯỜNG & PHẦN CỨNG

- **Hệ điều hành**: Windows 10/11 hoặc Linux (Ubuntu 20.04/22.04).
- **Python**: Phiên bản `3.10` hoặc `3.11+` (đã thêm vào PATH).
- **Node.js**: Phiên bản `18.x` hoặc `20.x+`.
- **Phần cứng**:
  - Tối thiểu: CPU 4 cores, 8GB RAM (Chạy tốt trên CPU).
  - Khuyến nghị: GPU NVIDIA (GTX 1650 / RTX 2060 trở lên) có hỗ trợ CUDA để tăng tốc độ nhận diện AI.

---

## ⚙️ 2. CÀI ĐẶT VÀ KHỞI CHẠY TỪ ĐẦU (TỪNG BƯỚC)

### Bước 1: Cài đặt thư viện Backend
1. Mở terminal tại thư mục `backend/`:
   ```bash
   cd D:\1.PROJECT\Canh_Bao_Chay_Zalo\backend
   ```
2. Cài đặt các thư viện Python:
   ```bash
   pip install -r requirements.txt
   ```
3. Khởi tạo cơ sở dữ liệu ban đầu (tự động tạo SQLite DB tại `backend/data/fire_system.db`):
   ```bash
   python -m app.db.seed
   ```
4. Khởi chạy máy chủ Backend FastAPI:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Bước 2: Cài đặt và chạy Frontend
1. Mở một terminal mới tại thư mục `frontend/`:
   ```bash
   cd D:\1.PROJECT\Canh_Bao_Chay_Zalo\frontend
   ```
2. Cài đặt các gói npm:
   ```bash
   npm install
   ```
3. Khởi chạy máy chủ Frontend Next.js:
   ```bash
   npm run dev
   ```

---

## 🌐 3. SỬ DỤNG HỆ THỐNG

1. Mở trình duyệt Web tại: `http://localhost:3000`
2. Đăng nhập bằng tài khoản:
   - **Tên đăng nhập**: `admin`
   - **Mật khẩu**: `admin123`
3. Vào trang **Cài Đặt (`/settings`)** để:
   - Thêm các camera giám sát của đơn vị (RTSP hoặc Webcam hoặc Video demo).
   - Thiết lập cấu hình Token Bot Zalo và ImgBB API Key.
   - Kéo thả ghim camera lên Sơ đồ mặt bằng.
