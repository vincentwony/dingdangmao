Write-Host "===== 挂起的重启检查 ====="
if (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired') { Write-Host "WARNING: 有挂起的 Windows Update 重启" } else { Write-Host "OK: 无 Update 挂起" }
if (Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending' -ErrorAction SilentlyContinue) { Write-Host "WARNING: CBS 有挂起重启" } else { Write-Host "OK: 无 CBS 挂起" }
if (Test-Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\PendingFileRenameOperations') { Write-Host "WARNING: 有挂起文件操作 (需重启)" } else { Write-Host "OK: 无挂起文件" }

Write-Host ""
Write-Host "===== Windows Installer 服务 ====="
$msi = Get-Service -Name msiserver
Write-Host "状态: $($msi.Status)"
Write-Host "启动类型: $($msi.StartType)"
if ($msi.Status -ne 'Running') {
    Write-Host "尝试启动 Windows Installer 服务..."
    Start-Service msiserver -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    $msi.Refresh()
    Write-Host "新状态: $($msi.Status)"
}

Write-Host ""
Write-Host "===== 最近 MSI 安装错误 ====="
Get-EventLog -LogName Application -Source "MsiInstaller" -EntryType Error -Newest 5 -ErrorAction SilentlyContinue | ForEach-Object {
    $msg = $_.Message
    if ($msg.Length -gt 250) { $msg = $msg.Substring(0, 250) + "..." }
    Write-Host "[$($_.TimeGenerated)] $msg"
}

Write-Host ""
Write-Host "===== TEMP 目录 ====="
Write-Host "当前用户 TEMP: $env:TEMP"
if (Test-Path $env:TEMP) {
    $tempSize = (Get-ChildItem $env:TEMP -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    Write-Host "TEMP 大小: $([math]::Round($tempSize/1MB, 1)) MB"
    Write-Host "TEMP 目录可访问: YES"
} else {
    Write-Host "TEMP 目录不可访问: ERROR"
}

Write-Host ""
Write-Host "===== DISM 健康 ====="
dism /online /noRestart /format:table /CheckHealth 2>&1 | Select-Object -Last 5

Write-Host ""
Write-Host "===== 建议 ====="
Write-Host "1. 请提供 CDR2026 安装失败的具体错误信息/截图"
Write-Host "2. 尝试以管理员身份运行安装程序"
Write-Host "3. 暂时关闭杀毒软件再试"
Write-Host "4. 如持续失败，运行: sfc /scannow (需管理员权限，耗时5-15分钟)"
