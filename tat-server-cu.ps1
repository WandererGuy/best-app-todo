# run.bat gọi trước khi bật server: tắt server cũ của app còn sót lại, để lúc nào cũng chỉ có một server.
# Chỉ tắt thứ của app — cửa sổ run.bat cũ (cùng đường dẫn) và python serve.py đang giữ cổng.
# Chương trình khác giữ cổng thì không đụng vào, báo tên rồi trả mã lỗi 1.
# In không dấu: console của run.bat không chắc hiển thị được tiếng Việt.
$Port = 8000
$bat = Join-Path $PSScriptRoot 'run.bat'

# tổ tiên của chính script này (cửa sổ run.bat đang chạy) — không được tắt
$self = @(); $p = Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
for ($i = 0; $p -and $i -lt 10; $i++) {
  $self += $p.ProcessId
  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.ParentProcessId)"
}

# 1. cửa sổ run.bat cũ (bấm đúp: cmd.exe /c ""...\run.bat"") — tắt cả cây, gồm python bên trong
Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" |
  Where-Object { $_.CommandLine -like "*$bat*" -and $self -notcontains $_.ProcessId } |
  ForEach-Object {
    Write-Output "  Dong cua so run.bat cu (PID $($_.ProcessId))"
    taskkill /PID $_.ProcessId /T /F *> $null
  }

# 2. python serve.py còn giữ cổng (chạy tay trong terminal) — chỉ tắt python, để yên terminal
$wait = 0
while ($true) {
  $busy = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique)
  if (-not $busy.Count) { exit 0 }
  $other = @()
  foreach ($id in $busy) {
    $pr = Get-CimInstance Win32_Process -Filter "ProcessId=$id"
    if ($pr -and $pr.Name -like 'python*' -and $pr.CommandLine -like '*serve.py*') {
      Write-Output "  Tat server cu (PID $id)"
      Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
    } elseif ($pr) { $other += "$($pr.Name) (PID $id)" }
  }
  if ($other.Count) {
    Write-Output "  Cong $Port dang bi chuong trinh khac chiem: $($other -join ', ')"
    Write-Output "  Khong tu tat chuong trinh nay. Hay tu dong no roi chay lai run.bat."
    exit 1
  }
  if (++$wait -gt 15) { Write-Output "  Khong giai phong duoc cong $Port."; exit 1 }
  Start-Sleep -Milliseconds 200
}
