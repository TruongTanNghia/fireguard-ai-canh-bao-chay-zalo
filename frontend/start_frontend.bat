@echo off
chcp 65001 > nul
title FRONTEND - GIAO DIỆN BÁO CHÁY & CẢNH BÁO ZALO AI

echo ==============================================================
echo  🖥️ KHỞI ĐỘNG FRONTEND WEB BÁO CHÁY & CẢNH BÁO ZALO AI
echo ==============================================================
echo.

cd /d "%~dp0"

echo [1/2] Đang kiểm tra thư viện Node.js...
if not exist "node_modules\" (
    echo Đang cài đặt thư viện npm (lần đầu)...
    call npm install
)

echo [2/2] Đang khởi chạy Next.js Server trên cổng 3000...
echo.
echo 👉 Website: http://localhost:3000
echo.

call npm run dev
pause
