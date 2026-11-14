@echo off
chcp 65001 > nul
title CAI DAT TU DONG - FIREGUARD AI PRO 2.0
cd /d "%~dp0"

echo ==============================================================================
echo   CHƯƠNG TRÌNH THIẾT LẬP TỰ ĐỘNG - FIREGUARD AI PRO 2.0
echo ==============================================================================
echo.
echo  Kịch bản này sẽ tự động:
echo    1. Kiểm tra Python và Node.js trên máy.
echo    2. Tạo môi trường Python riêng (backend\venv).
echo    3. Cài thư viện AI: YOLOv8, PyTorch, OpenCV... (5-15 phút tùy mạng).
echo    4. Cài thư viện giao diện web: Next.js, TailwindCSS...
echo    5. Khởi tạo cơ sở dữ liệu mẫu.
echo.
echo ==============================================================================
pause

:: 1. PYTHON
echo.
echo [1/5] Kiểm tra Python...
python --version > nul 2>&1
if errorlevel 1 goto :no_python
python --version
echo       Đã tìm thấy Python. Khuyên dùng Python 3.10 - 3.12.

:: 2. NODE.JS
echo.
echo [2/5] Kiểm tra Node.js...
call npm --version > nul 2>&1
if errorlevel 1 goto :no_node
node --version
echo       Đã tìm thấy Node.js.

:: 3. BACKEND
echo.
echo [3/5] Đang thiết lập môi trường Python cho Backend...
set "PY=backend\venv\Scripts\python.exe"
if not exist "%PY%" python -m venv backend\venv
if not exist "%PY%" goto :venv_failed
"%PY%" -m pip install --upgrade pip
echo       Đang cài thư viện Python, vui lòng chờ...
"%PY%" -m pip install -r backend\requirements.txt
if errorlevel 1 goto :pip_failed
"%PY%" -c "import fastapi, uvicorn, multipart, pydantic_settings, sqlalchemy, ultralytics, torch, cv2, numpy, requests, bcrypt, jose, pandas, openpyxl"
if errorlevel 1 goto :pip_failed
echo       Cài thư viện Python thành công.

echo.
echo [4/5] Đang thiết lập giao diện Web...
pushd frontend
call npm install
if errorlevel 1 goto :npm_failed
popd
echo       Cài thư viện giao diện thành công.

echo.
echo [5/5] Khởi tạo cơ sở dữ liệu và tài khoản mẫu...
pushd backend
"venv\Scripts\python.exe" -m app.db.seed
if errorlevel 1 goto :seed_failed
popd

echo.
echo ==============================================================================
echo   CÀI ĐẶT THÀNH CÔNG HỆ THỐNG FIREGUARD AI PRO 2.0
echo ==============================================================================
echo   Khởi chạy hệ thống: nhấp đúp tệp start_all.bat
echo   Giao diện Web:      http://localhost:3000
echo   Tài khoản Admin:    admin / admin123
echo   Hướng dẫn:          HDSD_VA_CAI_DAT.md
echo ==============================================================================
pause
exit /b 0

:no_python
echo.
echo [LỖI] Không tìm thấy Python trên máy.
echo   1. Tải Python 3.11: https://www.python.org/downloads/release/python-3119/
echo   2. Khi cài, nhớ tích ô "Add python.exe to PATH".
echo   3. Chạy lại file này.
pause
exit /b 1

:no_node
echo.
echo [LỖI] Không tìm thấy Node.js. Tải bản LTS tại https://nodejs.org/ rồi chạy lại file này.
pause
exit /b 1

:venv_failed
echo.
echo [LỖI] Không tạo được backend\venv. Hãy chép dự án ra thư mục có quyền ghi, ví dụ D:\FireGuard.
pause
exit /b 1

:pip_failed
echo.
echo [LỖI] Cài thư viện Python thất bại. Xem dòng báo lỗi phía trên.
echo   - Kiểm tra Internet rồi chạy lại file này.
echo   - Nếu Python quá mới so với PyTorch: gỡ Python đó, cài Python 3.11,
echo     xóa thư mục backend\venv rồi chạy lại.
pause
exit /b 1

:npm_failed
popd
echo.
echo [LỖI] Cài thư viện giao diện web thất bại. Kiểm tra Internet rồi chạy lại.
pause
exit /b 1

:seed_failed
popd
echo.
echo [LỖI] Khởi tạo cơ sở dữ liệu thất bại. Xem thông báo lỗi phía trên.
pause
exit /b 1
