@echo off
chcp 65001 > nul
title BACKEND - FIREGUARD AI - BAO CHAY VA CANH BAO ZALO
cd /d "%~dp0"

echo ==============================================================
echo   KHỞI ĐỘNG BACKEND - HỆ THỐNG BÁO CHÁY VÀ CẢNH BÁO ZALO AI
echo ==============================================================
echo.

set "PY=venv\Scripts\python.exe"

:: 1. Môi trường Python riêng (venv). Chưa có thì tự tạo.
if exist "%PY%" goto :check_libs
echo [1/4] Chưa có môi trường Python riêng - đang tạo mới...
python --version > nul 2>&1
if errorlevel 1 goto :no_python
python -m venv venv
if not exist "%PY%" goto :venv_failed

:check_libs
echo [1/4] Môi trường Python: backend\venv
"%PY%" --version

:: 2. Kiểm tra đủ thư viện. Thiếu thì tự cài từ requirements.txt.
echo [2/4] Đang kiểm tra thư viện Python...
"%PY%" -c "import fastapi, uvicorn, multipart, pydantic_settings, sqlalchemy, ultralytics, torch, cv2, numpy, requests, bcrypt, jose, pandas, openpyxl" > nul 2>&1
if not errorlevel 1 goto :libs_ok

echo       Thiếu thư viện - đang tự cài đặt. Lần đầu mất khoảng 5-15 phút, vui lòng chờ...
"%PY%" -m pip install --upgrade pip
"%PY%" -m pip install -r requirements.txt
if errorlevel 1 goto :pip_failed
"%PY%" -c "import fastapi, uvicorn, multipart, pydantic_settings, sqlalchemy, ultralytics, torch, cv2, numpy, requests, bcrypt, jose, pandas, openpyxl"
if errorlevel 1 goto :pip_failed

:libs_ok
echo       Thư viện đầy đủ.

:: 3. Cơ sở dữ liệu
echo [3/4] Kiểm tra và khởi tạo dữ liệu ban đầu...
"%PY%" -m app.db.seed
if errorlevel 1 goto :seed_failed

:: 4. Chạy máy chủ
echo [4/4] Đang khởi chạy máy chủ FastAPI trên cổng 8000...
echo.
echo   API Docs: http://localhost:8000/docs
echo   GIỮ CỬA SỔ NÀY MỞ trong suốt thời gian sử dụng hệ thống.
echo.
"%PY%" main.py
echo.
echo Máy chủ backend đã dừng. Xem thông báo lỗi phía trên nếu có.
pause
exit /b 0

:no_python
echo.
echo [LỖI] Không tìm thấy Python trên máy.
echo   1. Tải Python 3.11: https://www.python.org/downloads/release/python-3119/
echo   2. Khi cài, nhớ tích ô "Add python.exe to PATH".
echo   3. Mở lại file này.
pause
exit /b 1

:venv_failed
echo.
echo [LỖI] Không tạo được môi trường Python venv trong thư mục backend.
echo   Hãy chép dự án ra thư mục khác có quyền ghi, ví dụ D:\FireGuard, rồi chạy lại.
pause
exit /b 1

:pip_failed
echo.
echo [LỖI] Cài thư viện Python thất bại. Xem dòng báo lỗi màu đỏ phía trên.
echo   - Kiểm tra kết nối Internet rồi chạy lại file này.
echo   - Dự án chạy ổn định trên Python 3.10 - 3.12. Phiên bản Python của máy:
python --version
echo   - Nếu là bản mới hơn, gỡ Python đó, cài Python 3.11, xóa thư mục backend\venv rồi chạy lại.
pause
exit /b 1

:seed_failed
echo.
echo [LỖI] Khởi tạo cơ sở dữ liệu thất bại. Xem thông báo lỗi phía trên.
pause
exit /b 1
