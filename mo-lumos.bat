@echo off
rem Bam dup (hoac shortcut tro vao day): bat server o cua so thu nho roi mo cua so app Lumos da cai tu Chrome.
rem start.bat tu tat server cu, nen bam lai luc dang chay = chay lai server voi code moi.
rem Chua cai Lumos tu Chrome thi mo http://localhost:8000 bang Chrome.

set "APP_NO_BROWSER=1"
start "Lumos" /min "%~dp0start.bat"

rem cho server cu tat han roi doi cong 8000 san sang, toi da 15 giay
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep 2; for($i=0;$i -lt 30;$i++){if(Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue){break}; Start-Sleep -Milliseconds 500}"

rem cai tu luc app con ten Hearth thi Chrome co the van giu shortcut ten cu
set "APP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Chrome Apps\Lumos.lnk"
if not exist "%APP%" set "APP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Chrome Apps\Hearth.lnk"
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist "%APP%" (
  start "" "%APP%"
) else if exist "%CHROME%" (
  start "" "%CHROME%" http://localhost:8000
) else (
  start "" http://localhost:8000
)
