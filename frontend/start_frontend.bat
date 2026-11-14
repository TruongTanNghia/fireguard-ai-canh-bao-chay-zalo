@echo off
chcp 65001 > nul
title FRONTEND - FIREGUARD AI - GIAO DIEN WEB
cd /d "%~dp0"

echo ==============================================================
echo   KHỞI ĐỘNG FRONTEND - GIAO DIỆN WEB BÁO CHÁY VÀ CẢNH BÁO ZALO
echo ==============================================================
echo.

call npm --version > nul 2>&1
if errorlevel 1 goto :no_node

echo [1/2] Đang kiểm tra thư viện Node.js...
if exist "node_modules\next\package.json" goto :run
echo       Đang cài đặt thư viện npm lần đầu, vui lòng chờ...
call npm install
if errorlevel 1 goto :npm_failed

:run
echo [2/2] Đang khởi chạy giao diện web trên cổng 3000...
echo.
echo   Website: http://localhost:3000
echo   GIỮ CỬA SỔ NÀY MỞ trong suốt thời gian sử dụng hệ thống.
echo.
call npm run dev
pause
exit /b 0

:no_node
echo.
echo [LỖI] Không tìm thấy Node.js trên máy.
echo   Tải bản LTS tại https://nodejs.org/ , cài xong mở lại file này.
pause
exit /b 1

:npm_failed
echo.
echo [LỖI] Cài thư viện npm thất bại. Kiểm tra Internet rồi chạy lại file này.
pause
exit /b 1
