Write-Host "========== VC++ Redistributable Registry =========="
$regPaths = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
$found = @()
foreach ($reg in $regPaths) {
    Get-ItemProperty $reg -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like '*Visual C++*' -or $_.DisplayName -like '*Microsoft Visual C*' } | ForEach-Object {
        $found += [PSCustomObject]@{
            Name = $_.DisplayName
            Version = $_.DisplayVersion
            GUID = $_.PSChildName
            InstallDate = $_.InstallDate
        }
    }
}
$found | Sort-Object Name | Format-Table -AutoSize -Wrap

Write-Host ""
Write-Host "========== Runtime DLL Versions (System32) =========="
$dlls = @(
    "C:\Windows\System32\MSVCP140.dll",
    "C:\Windows\System32\VCRUNTIME140.dll",
    "C:\Windows\System32\VCRUNTIME140_1.dll",
    "C:\Windows\System32\MSVCP120.dll",
    "C:\Windows\System32\MSVCP110.dll",
    "C:\Windows\System32\MSVCP100.dll",
    "C:\Windows\System32\MSVCP90.dll",
    "C:\Windows\System32\MSVCP80.dll",
    "C:\Windows\System32\mfc140u.dll",
    "C:\Windows\System32\concrt140.dll"
)
foreach ($dll in $dlls) {
    if (Test-Path $dll) {
        $v = (Get-Item $dll).VersionInfo
        Write-Host ("{0,-30} = {1}" -f (Split-Path $dll -Leaf), $v.FileVersion)
    } else {
        Write-Host ("{0,-30} = NOT FOUND" -f (Split-Path $dll -Leaf))
    }
}

Write-Host ""
Write-Host "========== Runtime DLL Versions (SysWOW64) =========="
foreach ($dll in $dlls) {
    $dll32 = $dll -replace "System32", "SysWOW64"
    if (Test-Path $dll32) {
        $v = (Get-Item $dll32).VersionInfo
        Write-Host ("{0,-30} = {1}" -f (Split-Path $dll32 -Leaf), $v.FileVersion)
    } else {
        Write-Host ("{0,-30} = NOT FOUND" -f (Split-Path $dll32 -Leaf))
    }
}

Write-Host ""
Write-Host "========== Latest VC++ Standards =========="
Write-Host "VC++ 2005     8.0.50727.x"
Write-Host "VC++ 2008     9.0.30729.x"
Write-Host "VC++ 2010     10.0.40219.x"
Write-Host "VC++ 2012     11.0.61030.x"
Write-Host "VC++ 2013     12.0.40664.x"
Write-Host "VC++ 2015-2022 (latest)  = 14.44.35211.0"
Write-Host ""
Write-Host "NOTE: System32 DLLs should match 14.44.x for latest 2015-2022"
