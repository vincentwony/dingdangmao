Write-Host "===== MSVCP140.dll Versions ====="
$dlls = @("C:\Windows\System32\MSVCP140.dll", "C:\Windows\SysWOW64\MSVCP140.dll", "C:\Windows\System32\VCRUNTIME140.dll", "C:\Windows\SysWOW64\VCRUNTIME140.dll")
foreach ($dll in $dlls) {
    if (Test-Path $dll) {
        $v = (Get-Item $dll).VersionInfo.FileVersion
        $name = Split-Path $dll -Leaf
        Write-Host "$name = $v"
    } else {
        Write-Host "$dll - MISSING"
    }
}

Write-Host ""
Write-Host "===== CorelDRAW Crashes (last 2 hours) ====="
$cutoff = (Get-Date).AddHours(-2)
$crashes = @(Get-EventLog -LogName Application -Source "Application Error" -Newest 20 -ErrorAction SilentlyContinue | Where-Object { $_.Message -like "*Corel*" -and $_.TimeGenerated -gt $cutoff })
if ($crashes.Count -gt 0) {
    Write-Host "FOUND $($crashes.Count) crash(es):"
    foreach ($c in $crashes) {
        Write-Host "[$($c.TimeGenerated)] CorelDRW crashed in MSVCP140.dll"
    }
} else {
    Write-Host "OK: No Corel crashes since $cutoff"
}

Write-Host ""
Write-Host "===== Quick Test: Can CDR launch without crash? ====="
$cdr = "C:\Program Files\Corel\CorelDRAW Graphics Suite\27\Programs64\CorelDrw.exe"
if (Test-Path $cdr) {
    Write-Host "CDR exists: YES"
    Write-Host "(Launch CorelDRAW manually to verify)"
} else {
    Write-Host "CDR path not found: $cdr"
}
