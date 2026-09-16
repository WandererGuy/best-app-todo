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
echo   - Du lieu luu o data\dieukhien.json, sao luu hang ngay o data\backups.
echo     Xoa cache hay doi tai khoan Chrome deu khong mat.
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
echo   Khong tim thay Python nen khong chay duoc app.
echo.
echo   App can Python de luu du lieu vao data\dieukhien.json. Mo thang index.html
echo   thi du lieu chi nam trong trinh duyet, xoa cache la mat - nen khong mo cach do.
echo   Cai Python tai https://www.python.org/downloads/ (tick "Add python.exe to PATH")
echo   roi chay lai file nay.
echo.
pause
