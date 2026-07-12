Write-Host "===== Recent MSI Installer Errors (last 20) ====="
Get-EventLog -LogName Application -Source "MsiInstaller" -Newest 20 -ErrorAction SilentlyContinue | ForEach-Object {
    $msg = $_.Message
    if ($msg.Length -gt 300) { $msg = $msg.Substring(0, 300) + "..." }
    Write-Host "[$($_.TimeGenerated)] $($_.EntryType): $msg"
    Write-Host ""
}

Write-Host "===== Windows Installer Service ====="
$msi = Get-Service msiserver
Write-Host "Status: $($msi.Status)"
Write-Host "StartType: $($msi.StartType)"

Write-Host ""
Write-Host "===== CorelDRAW files ====="
if (Test-Path "C:\Program Files\Corel\CorelDRAW Graphics Suite") {
    Write-Host "CorelDRAW folder EXISTS"
    Get-ChildItem "C:\Program Files\Corel\CorelDRAW Graphics Suite" -Directory -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $($_.Name)" }
} else {
    Write-Host "CorelDRAW folder NOT FOUND (not installed)"
}

Write-Host ""
Write-Host "===== Temp / Installer Cache ====="
$tempCorel = Get-ChildItem $env:TEMP -Filter "*Corel*" -Directory -ErrorAction SilentlyContinue
if ($tempCorel) { Write-Host "Found Corel temp: $($tempCorel.FullName)" } else { Write-Host "No Corel temp folders" }

Write-Host ""
Write-Host "===== Pending Reboot ====="
if (Test-Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\PendingFileRenameOperations') {
    Write-Host "WARNING: Pending file rename operations exist. REBOOT REQUIRED."
} else {
    Write-Host "OK: No pending file operations"
}

Write-Host ""
Write-Host "===== DISK SPACE ====="
$c = Get-PSDrive C
Write-Host "C: Free = $([math]::Round($c.Free/1GB, 1)) GB"

Write-Host ""
Write-Host "Please tell me the EXACT error message you see when installing CDR2026."
