Write-Host "===== MSVCP140.dll Versions ====="
$paths = @(
    "C:\Windows\System32\MSVCP140.dll",
    "C:\Windows\SysWOW64\MSVCP140.dll"
)
foreach ($p in $paths) {
    if (Test-Path $p) {
        $v = (Get-Item $p).VersionInfo
        Write-Host "$p"
        Write-Host "  Version: $($v.FileVersion)"
        Write-Host "  Modified: $($v.FileVersionRaw)"
    } else {
        Write-Host "$p - NOT FOUND"
    }
}

Write-Host ""
Write-Host "===== VC++ 2015-2022 Redist (latest) ====="
$regPaths = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
foreach ($reg in $regPaths) {
    Get-ItemProperty $reg -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like '*Visual C++ 2015-2022*' } | ForEach-Object {
        Write-Host "$($_.DisplayName)"
        Write-Host "  Version: $($_.DisplayVersion)"
        Write-Host "  InstallDate: $($_.InstallDate)"
    }
}

Write-Host ""
Write-Host "===== Try Launch CorelDRAW ====="
$cdrPath = "C:\Program Files\Corel\CorelDRAW Graphics Suite\27\Programs64\CorelDrw.exe"
if (Test-Path $cdrPath) {
    $cdrInfo = (Get-Item $cdrPath).VersionInfo
    Write-Host "CorelDRAW version: $($cdrInfo.FileVersion)"
    Write-Host "Path: $cdrPath"
} else {
    Write-Host "CorelDRAW not found at expected path"
}

Write-Host ""
Write-Host "===== Recent CorelDRAW Crashes (after update) ====="
Get-EventLog -LogName Application -Source "Application Error" -Newest 5 -ErrorAction SilentlyContinue | Where-Object { $_.Message -like "*Corel*" } | ForEach-Object {
    $msg = $_.Message
    if ($msg.Length -gt 300) { $msg = $msg.Substring(0, 300) + "..." }
    Write-Host "[$($_.TimeGenerated)] $msg"
}
if ($null -eq (Get-EventLog -LogName Application -Source "Application Error" -Newest 5 -ErrorAction SilentlyContinue | Where-Object { $_.Message -like "*Corel*" })) {
    Write-Host "No CorelDRAW crashes found in recent events"
}
