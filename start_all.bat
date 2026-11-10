@echo off
chcp 65001 > nul
title HỆ THỐNG GIÁM SÁT BÁO CHÁY & CẢNH BÁO ZALO AI

echo ==============================================================
echo  🔥 HỆ THỐNG GIÁM SÁT BÁO CHÁY & CẢNH BÁO ZALO AI (FIREGUARD)
echo ==============================================================
echo.
echo Đang khởi chạy đồng thời Backend và Frontend...
echo.

cd /d "%~dp0"

start "Backend Server (FastAPI)" cmd /c "cd backend && start_backend.bat"
timeout /t 3 /nobreak > nul
start "Frontend Web (Next.js)" cmd /c "cd frontend && start_frontend.bat"

echo.
echo ==============================================================
echo  ✅ HỆ THỐNG ĐÃ ĐƯỢC KHỞI ĐỘNG!
echo ==============================================================
echo  👉 Giao diện Web:   http://localhost:3000
echo  👉 API Swagger:     http://localhost:8000/docs
echo  👉 Tài khoản Admin: admin / admin123
echo ==============================================================
echo.
pause
