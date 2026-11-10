@echo off
chcp 65001 > nul
title CÀI ĐẶT TỰ ĐỘNG - HỆ THỐNG FIREGUARD AI PRO 2.0

echo ==============================================================================
echo   🔥 CHƯƠNG TRÌNH THIẾT LẬP TỰ ĐỘNG - FIREGUARD AI PRO 2.0
echo ==============================================================================
echo.
echo  Kịch bản này sẽ tự động:
echo    1. Kiểm tra môi trường Python và Node.js trên máy tính của bạn.
echo    2. Tạo môi trường ảo Python venv tương thích riêng cho máy bạn.
echo    3. Cài đặt toàn bộ thư viện trí tuệ nhân tạo (YOLOv8, PyTorch, OpenCV...).
echo    4. Cài đặt các gói giao diện Web (Next.js, TailwindCSS...).
echo    5. Khởi tạo cơ sở dữ liệu mẫu sẵn sàng hoạt động.
echo.
echo ==============================================================================
pause

cd /d "%~dp0"

:: 1. KIỂM TRA PYTHON
echo.
echo [1/5] Kiểm tra Python...
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ LỖI: Không tìm thấy Python trên máy tính của bạn!
    echo 👉 Vui lòng tải và cài đặt Python 3.10 hoặc 3.11 tại: https://www.python.org/downloads/
    echo ⚠️ LƯU Ý QUAN TRỌNG: Nhớ tích chọn vào ô [x] "Add Python to PATH" khi cài đặt.
    echo.
    pause
    exit /b 1
)
python --version
echo ✅ Đã tìm thấy Python!

:: 2. KIỂM TRA NODE.JS
echo.
echo [2/5] Kiểm tra Node.js...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ LỖI: Không tìm thấy Node.js trên máy tính của bạn!
    echo 👉 Vui lòng tải và cài đặt Node.js phiên bản LTS tại: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
node --version
echo ✅ Đã tìm thấy Node.js!

:: 3. TẠO MÔI TRƯỜNG ẢO VÀ CÀI ĐẶT BACKEND
echo.
echo [3/5] Đang thiết lập môi trường Backend Python...
cd backend
if not exist "venv" (
    echo   - Đang khởi tạo môi trường ảo Python venv...
    python -m venv venv
)
echo   - Kích hoạt venv...
call venv\Scripts\activate.bat

echo   - Cài đặt thư viện Python (Quá trình này có thể mất 2-5 phút tùy tốc độ mạng)...
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt

echo   - Khởi tạo cơ sở dữ liệu và tài khoản mẫu...
python -m app.db.seed
cd ..
echo ✅ Cài đặt Backend hoàn tất!

:: 4. CÀI ĐẶT VÀ BUILD GIAO DIỆN FRONTEND
echo.
echo [4/5] Đang thiết lập giao diện Web Frontend...
cd frontend
echo   - Đang cài đặt thư viện Node.js (npm install)...
call npm install
echo   - Đang tối ưu hóa ứng dụng Web (npm run build)...
call npm run build
cd ..
echo ✅ Cài đặt Frontend hoàn tất!

:: 5. HOÀN TẤT
echo.
echo ==============================================================================
echo   🎉 CHÚC MỪNG BẠN ĐÃ CÀI ĐẶT THÀNH CÔNG HỆ THỐNG FIREGUARD AI PRO 2.0!
echo ==============================================================================
echo.
echo  👉 Để khởi chạy hệ thống, chỉ cần nhấp đúp vào tệp: start_all.bat
echo  👉 Giao diện Web:   http://localhost:3000
echo  👉 Tài khoản Admin: admin / admin123
echo  👉 Xem hướng dẫn:   HDSD_VA_CAI_DAT.md
echo.
echo ==============================================================================
pause
