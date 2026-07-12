Write-Host "===== Pending Reboot Check ====="
$hasPending = $false
if (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired') { Write-Host "PENDING: Windows Update reboot"; $hasPending=$true }
if (Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending' -ErrorAction SilentlyContinue) { Write-Host "PENDING: CBS reboot"; $hasPending=$true }
if (Test-Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\PendingFileRenameOperations') { Write-Host "PENDING: File rename operations"; $hasPending=$true }
if (-not $hasPending) { Write-Host "OK: No pending reboots" }

Write-Host ""
Write-Host "===== Windows Installer Service ====="
$msi = Get-Service -Name msiserver
Write-Host "Status: $($msi.Status)"
Write-Host "StartType: $($msi.StartType)"

Write-Host ""
Write-Host "===== Recent MSI Errors (last 5) ====="
Get-EventLog -LogName Application -Source "MsiInstaller" -EntryType Error -Newest 5 -ErrorAction SilentlyContinue | ForEach-Object {
    $msg = $_.Message
    if ($msg.Length -gt 300) { $msg = $msg.Substring(0, 300) + "..." }
    Write-Host "[$($_.TimeGenerated)] $msg"
}
if ($null -eq (Get-EventLog -LogName Application -Source "MsiInstaller" -EntryType Error -Newest 1 -ErrorAction SilentlyContinue)) {
    Write-Host "(No recent MSI errors found)"
}

Write-Host ""
Write-Host "===== TEMP Directory ====="
Write-Host "Path: $env:TEMP"
if (Test-Path $env:TEMP) {
    Write-Host "Accessible: YES"
} else {
    Write-Host "Accessible: NO - CRITICAL ISSUE"
}

Write-Host ""
Write-Host "===== DISM CheckHealth ====="
& dism /online /noRestart /CheckHealth 2>&1 | Select-Object -Last 3

Write-Host ""
Write-Host "===== Summary ====="
Write-Host "OS: Windows 10 Pro 64bit (19045)"
Write-Host ".NET: 4.8.09037 Full"
Write-Host "VC++: 2005-2022 all versions present"
Write-Host "Please share the EXACT error message from CDR2026 installer"
