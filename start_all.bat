@echo off
chcp 65001 > nul
title FIREGUARD AI - HE THONG BAO CHAY VA CANH BAO ZALO
cd /d "%~dp0"

echo ==============================================================
echo   FIREGUARD AI - HỆ THỐNG GIÁM SÁT BÁO CHÁY VÀ CẢNH BÁO ZALO
echo ==============================================================
echo.
echo Đang mở 2 cửa sổ: BACKEND (máy chủ AI) và FRONTEND (giao diện web)...

start "BACKEND - FIREGUARD AI" /D "%~dp0backend" cmd /c start_backend.bat
timeout /t 3 /nobreak > nul
start "FRONTEND - FIREGUARD AI" /D "%~dp0frontend" cmd /c start_frontend.bat

echo.
echo ==============================================================
echo   ĐÃ KHỞI ĐỘNG. Lần chạy đầu, cửa sổ BACKEND sẽ tự cài thư viện
echo   AI trong khoảng 5-15 phút. Chờ đến khi thấy dòng
echo   "Application startup complete" rồi mới đăng nhập.
echo ==============================================================
echo   Giao diện Web:   http://localhost:3000
echo   API Swagger:     http://localhost:8000/docs
echo   Tài khoản Admin: admin / admin123
echo ==============================================================
echo.
pause
