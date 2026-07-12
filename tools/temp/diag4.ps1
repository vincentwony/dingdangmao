Write-Host "===== CorelDRAW Installation Search ====="
$paths = @(
    "C:\Program Files\Corel\*",
    "C:\Program Files (x86)\Corel\*",
    "C:\Program Files\CorelDRAW*",
    "C:\Program Files (x86)\CorelDRAW*"
)
foreach ($p in $paths) {
    $found = Get-ChildItem $p -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { Write-Host "FOUND: $($found.FullName)" }
}

Write-Host ""
Write-Host "===== Recent Application Crashes (last 10) ====="
Get-EventLog -LogName Application -EntryType Error -Newest 10 -ErrorAction SilentlyContinue | ForEach-Object {
    $msg = $_.Message
    if ($msg.Length -gt 250) { $msg = $msg.Substring(0, 250) + "..." }
    Write-Host "[$($_.TimeGenerated)] $($_.Source): $msg"
}

Write-Host ""
Write-Host "===== .NET Runtime Errors ====="
Get-EventLog -LogName Application -Source ".NET Runtime" -Newest 5 -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "[$($_.TimeGenerated)] $($_.Message.Substring(0, [Math]::Min(300, $_.Message.Length)))"
}

Write-Host ""
Write-Host "===== Application Error (Event ID 1000) ====="
Get-EventLog -LogName Application -Source "Application Error" -Newest 5 -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "[$($_.TimeGenerated)] $($_.Message.Substring(0, [Math]::Min(400, $_.Message.Length)))"
}

Write-Host ""
Write-Host "===== Windows Error Reporting ====="
Get-ChildItem "C:\ProgramData\Microsoft\Windows\WER\ReportArchive" -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*Corel*" -or $_.Name -like "*CDR*" } | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | ForEach-Object { Write-Host $_.Name }
