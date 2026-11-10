@echo off
chcp 65001 > nul
title BACKEND - HỆ THỐNG BÁO CHÁY & CẢNH BÁO ZALO AI

echo ==============================================================
echo  🔥 KHỞI ĐỘNG BACKEND MÁY CHỦ BÁO CHÁY & CẢNH BÁO ZALO AI
echo ==============================================================
echo.

cd /d "%~dp0"

if exist "venv\Scripts\activate.bat" (
    echo [1/3] Đang kích hoạt môi trường ảo Python venv...
    call venv\Scripts\activate.bat
)

echo [2/3] Kiểm tra và khởi tạo dữ liệu ban đầu...
python -m app.db.seed

echo [3/3] Đang khởi chạy FastAPI Server trên cổng 8000...
echo.
echo 👉 API Docs: http://localhost:8000/docs
echo 👉 Backend:  http://localhost:8000
echo.

python main.py
pause
