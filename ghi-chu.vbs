' Mo trang Ghi chu trong mot cua so rieng (Chrome --app): khong thanh dia chi, co icon rieng tren taskbar.
' Server chua chay thi bat run.bat (thu nho) truoc roi doi cong 8000 san sang.
' Shortcut co phim tat tao bang tao-shortcut-ghi-chu.ps1. In khong dau: file .vbs doc theo ANSI.
Option Explicit
Dim sh, fs, dir, url, chrome, p, c, i
Set sh = CreateObject("WScript.Shell")
Set fs = CreateObject("Scripting.FileSystemObject")
dir = fs.GetParentFolderName(WScript.ScriptFullName)
url = "http://localhost:8000/?view=notes"

Function Up()
  Dim r
  Up = False
  On Error Resume Next
  Set r = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  r.setTimeouts 500, 500, 500, 500
  r.open "GET", "http://127.0.0.1:8000/", False
  r.send
  If Err.Number = 0 Then Up = (r.status = 200)
End Function

If Not Up() Then
  ' run.bat tu mo trinh duyet mac dinh (Edge) - tat di, o duoi mo Chrome
  sh.Environment("Process")("APP_NO_BROWSER") = "1"
  sh.Run """" & dir & "\run.bat""", 7, False
  For i = 1 To 60
    WScript.Sleep 250
    If Up() Then Exit For
  Next
End If

chrome = ""
For Each p In Array("%ProgramFiles%", "%ProgramFiles(x86)%", "%LocalAppData%")
  c = sh.ExpandEnvironmentStrings(p) & "\Google\Chrome\Application\chrome.exe"
  If chrome = "" And fs.FileExists(c) Then chrome = c
Next

If chrome <> "" Then
  sh.Run """" & chrome & """ --app=" & url, 1, False
Else
  sh.Run url, 1, False
End If
