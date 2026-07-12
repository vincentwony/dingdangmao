Write-Host "===== CorelDRAW Program Folder ====="
$cdrDir = "C:\Program Files\Corel\CorelDRAW Graphics Suite\27"
Get-ChildItem "$cdrDir\Programs64" -Filter "*.dll" -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*MSVC*" -or $_.Name -like "*VCRUNTIME*" -or $_.Name -like "*concrt*" } | ForEach-Object { Write-Host "$($_.Name) = $($_.VersionInfo.FileVersion)" }

Write-Host ""
Write-Host "===== CorelDRAW User Data ====="
$userPaths = @(
    "$env:APPDATA\Corel\CorelDRAW Graphics Suite\27",
    "$env:LOCALAPPDATA\Corel\CorelDRAW Graphics Suite\27",
    "$env:APPDATA\Corel\CorelDRAW Graphics Suite",
    "$env:LOCALAPPDATA\Corel\CorelDRAW Graphics Suite",
    "$env:APPDATA\Corel",
    "$env:LOCALAPPDATA\Corel"
)
foreach ($p in $userPaths) {
    if (Test-Path $p) {
        $size = (Get-ChildItem $p -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
        Write-Host "EXISTS: $p ($([math]::Round($size/1KB,1)) KB)"
    } else {
        Write-Host "NOT FOUND: $p"
    }
}

Write-Host ""
Write-Host "===== Font Cache ====="
$fontCache = "$env:LOCALAPPDATA\Microsoft\Windows\Fonts\FontCache-S-1-5-21.dat"
if (Test-Path $fontCache) { Write-Host "Font cache: EXISTS ($((Get-Item $fontCache).Length) bytes)" }
else { Write-Host "Font cache: NOT FOUND" }

Write-Host ""
Write-Host "===== Try fix: VC++ 14.44 direct install ====="
Write-Host "Download URL: https://aka.ms/vs/17/release/vc_redist.x64.exe"
Write-Host "(Run as Administrator, choose REPAIR)"
Write-Host ""
Write-Host "===== Try fix: Rename Corel user folder ====="
Write-Host "If appdata exists, rename to .bak and retry CDR"
