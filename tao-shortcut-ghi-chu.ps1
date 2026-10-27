# Tạo shortcut "Hearth" trong Start Menu: mở ghi-chu.vbs (vào thẳng trang Ghi chú), icon icons\hearth.ico, phím tắt Ctrl+Alt+N.
# Chạy lại khi chuyển thư mục project (shortcut giữ đường dẫn tuyệt đối). Xoá shortcut là gỡ hẳn.
# Phím tắt của shortcut chỉ chạy khi nó nằm trong Start Menu hoặc Desktop, nên đặt ở Start Menu.
# Muốn ghim lên taskbar: mở Start, tìm "Hearth", chuột phải > Pin to taskbar.
$lnk = Join-Path ([Environment]::GetFolderPath('Programs')) 'Hearth.lnk'

$s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$s.TargetPath       = Join-Path $env:WINDIR 'System32\wscript.exe'
$s.Arguments        = '"' + (Join-Path $PSScriptRoot 'ghi-chu.vbs') + '"'
$s.WorkingDirectory = $PSScriptRoot
$s.IconLocation     = (Join-Path $PSScriptRoot 'icons\hearth.ico') + ',0'
$s.Hotkey           = 'Ctrl+Alt+N'
$s.Description      = 'Hearth'
$s.Save()
Write-Output "Da tao $lnk"
