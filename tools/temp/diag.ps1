Write-Host "===== Windows 版本 ====="
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, OSArchitecture | Format-List

Write-Host "===== 内存 ====="
$os = Get-CimInstance Win32_OperatingSystem
$totalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
$freeGB = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
Write-Host "总内存: $totalGB GB"
Write-Host "空闲内存: $freeGB GB"

Write-Host "===== 磁盘空间 ====="
Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -gt 0 } | ForEach-Object {
    $free = [math]::Round($_.Free / 1GB, 1)
    $total = [math]::Round(($_.Used + $_.Free) / 1GB, 1)
    Write-Host "$($_.Name): 空闲 ${free}GB / 总计 ${total}GB"
}

Write-Host "===== .NET Framework ====="
Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP' -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.GetValue('Version') -ne $null } | ForEach-Object {
    Write-Host "$($_.PSChildName): $($_.GetValue('Version'))"
}

Write-Host "===== Visual C++ Redistributable ====="
Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like '*Visual C++*' } | Sort-Object DisplayName | ForEach-Object {
    Write-Host "$($_.DisplayName) — $($_.DisplayVersion)"
}

Write-Host "===== Windows Installer 服务 ====="
Get-Service msiserver | Format-List Name, Status, StartType

Write-Host "===== 系统文件检查 ====="
Write-Host "(跳过 SFC，如需检查请手动运行: sfc /scannow)"

Write-Host "===== 最近系统错误 ====="
Get-EventLog -LogName System -EntryType Error -Newest 5 -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "[$($_.TimeGenerated)] $($_.Source): $($_.Message.Substring(0, [Math]::Min(120, $_.Message.Length)))"
}
