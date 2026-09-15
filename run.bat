@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Trung tam dieu khien

where python >nul 2>nul
if errorlevel 1 goto :nopython

echo.
echo   Trung tam dieu khien dang chay tai  http://localhost:8000
echo.
echo   - Trinh duyet se tu mo sau vai giay.
echo   - DONG CUA SO NAY de tat server khi dung xong.
echo   - Luon vao app bang dia chi localhost:8000 nay, dung mo truc tiep
echo     index.html, vi hai cach do luu du lieu o hai noi khac nhau.
echo.

start "" /min cmd /c ping -n 3 127.0.0.1 ^>nul ^&^& start http://localhost:8000
python serve.py
echo.
echo   Server da dung. Neu bao loi "address already in use" thi cong 8000
echo   dang bi mot cua so run.bat khac chiem - dong cua so do roi chay lai.
echo.
pause
goto :eof

:nopython
echo.
echo   Khong tim thay Python nen mo truc tiep index.html.
echo   Cach nay van dung duoc app, nhung tinh nang "Lien ket file tren o dia"
echo   co the bi trinh duyet chan.
echo.
start "" "index.html"
ping -n 6 127.0.0.1 >nul
