@echo off
chcp 65001 > nul
title RTSP GIA LAP CAMERA IP - FIREGUARD AI

cd /d "%~dp0"

echo ==============================================================
echo   BO PHAT LUONG RTSP GIA LAP CAMERA IP - FIREGUARD AI
echo ==============================================================
echo.

:: 1. Kiem tra ffmpeg (dung de phat video mau thanh luong RTSP)
where ffmpeg > nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay ffmpeg tren may.
    echo   Cai dat bang lenh:  winget install Gyan.FFmpeg
    echo   Sau do mo lai cua so nay.
    echo.
    pause
    exit /b 1
)

:: 2. Tai MediaMTX v1.9.3 (may chu RTSP mien phi, ma nguon mo) neu chua co
if not exist "mediamtx.exe" (
    echo [1/2] Dang tai MediaMTX v1.9.3 tu GitHub (khoang 15 MB, chi tai lan dau^)...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$ErrorActionPreference='Stop';" ^
      "$zip=Join-Path $env:TEMP 'mediamtx_v1.9.3_windows_amd64.zip';" ^
      "$dir=Join-Path $env:TEMP 'mediamtx_v1.9.3_extract';" ^
      "Invoke-WebRequest -Uri 'https://github.com/bluenviron/mediamtx/releases/download/v1.9.3/mediamtx_v1.9.3_windows_amd64.zip' -OutFile $zip -UseBasicParsing;" ^
      "if (Test-Path $dir) { Remove-Item $dir -Recurse -Force };" ^
      "Expand-Archive -Path $zip -DestinationPath $dir -Force;" ^
      "Copy-Item (Join-Path $dir 'mediamtx.exe') -Destination '.\mediamtx.exe' -Force;" ^
      "Remove-Item $zip, $dir -Recurse -Force"
    if not exist "mediamtx.exe" (
        echo [LOI] Tai MediaMTX that bai. Kiem tra ket noi Internet roi chay lai.
        pause
        exit /b 1
    )
)

echo [2/2] Dang khoi dong may chu RTSP tren cong 8554...
echo.
echo   Cac luong camera gia lap (nhap vao Cai dat ^> Camera, loai "Luong Camera RTSP"):
echo     rtsp://127.0.0.1:8554/cam2   (video fire1.mp4)
echo     rtsp://127.0.0.1:8554/cam3   (video fire2.mp4)
echo     rtsp://127.0.0.1:8554/cam4   (video fire3.mp4)
echo     rtsp://127.0.0.1:8554/cam5   (video street_car_fire_ccvt.mp4)
echo.
echo   Xem thu bang VLC: Media ^> Open Network Stream ^> dan 1 dia chi o tren.
echo   GIU CUA SO NAY MO trong luc giam sat. Dong cua so = tat luong RTSP.
echo ==============================================================
echo.

mediamtx.exe mediamtx.yml
pause
