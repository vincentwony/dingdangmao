param(
  [string]$Action = "start"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 修复 PowerShell 5.1 复制环境块给子进程时的 Path/PATH 大小写冲突（否则 Start-Process 抛异常）
try {
  $p = [Environment]::GetEnvironmentVariable('Path', 'Process')
  [Environment]::SetEnvironmentVariable('PATH', $null, 'Process')
  [Environment]::SetEnvironmentVariable('Path', $p, 'Process')
} catch {}

# ── 路径配置（全部绝对，避免依赖调用者工作目录 / 环境变量）──
$nodeExe   = "C:\Users\Administrator\.workbuddy\binaries\node\versions\22.22.2\node.exe"
$serverDir = "H:\Phone\server"
# 运行产物(日志/PID)放在 server 目录【之外】，避免 nodemon 监听日志写入而自重启
$runDir    = Join-Path "H:\Phone" ".cal-run"
if (-not (Test-Path $runDir)) { New-Item -ItemType Directory -Force -Path $runDir | Out-Null }
$logFile   = Join-Path $runDir ".server.log"
$errFile   = Join-Path $runDir ".server.err"
$pidFile   = Join-Path $runDir ".server.pid"
$port      = 3000
$healthUrl = "http://127.0.0.1:$port/api/v1/health"

function Log($msg) { Write-Host "[start-server] $msg" }

function Get-ListeningPid {
  $out = netstat -ano 2>$null | Select-String ":$port\s"
  foreach ($line in $out) {
    $cols = ($line.Line -split '\s+') | Where-Object { $_ -ne '' }
    if ($cols.Count -ge 5 -and $cols[3] -eq 'LISTENING') { return $cols[4] }
  }
  return $null
}

function Stop-Server {
  if (Test-Path $pidFile) {
    $pidv = (Get-Content $pidFile -Raw).Trim()
    if ($pidv -match '^\d+$') {
      # 杀进程树（含 cmd launcher 下的 nodemon / node 子进程），避免残留占用端口
      taskkill /T /F /PID $pidv 2>$null
      Log "killed process tree PID $pidv"
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  }
  $lp = Get-ListeningPid
  if ($lp) {
    taskkill /T /F /PID $lp 2>$null
    Log "killed by port: $lp"
  }
  Start-Sleep -Seconds 1
}

function Start-Server {
  $lp = Get-ListeningPid
  if ($lp) { Log "already running (PID $lp, port $port) - skip"; return }
  if (-not (Test-Path $nodeExe)) { Log "ERROR: node not found: $nodeExe"; exit 1 }
  if (-not (Test-Path $serverDir)) { Log "ERROR: server dir not found: $serverDir"; exit 1 }

  $runBat = Join-Path $serverDir "run-node.bat"
  if (-not (Test-Path $runBat)) { Log "ERROR: run-node.bat not found: $runBat"; exit 1 }
  $cmdLine = "cmd.exe /c `"$runBat`""
  try {
    $res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create `
      -Arguments @{ CommandLine = $cmdLine; CurrentDirectory = $serverDir }
  } catch {
    Log "ERROR: failed to launch (CIM): $_"
    exit 1
  }
  if ($res.ReturnValue -ne 0) { Log "ERROR: CreateProcess failed, code=$($res.ReturnValue)"; exit 1 }
  $pidv = $res.ProcessId
  $pidv | Out-File -FilePath $pidFile -Encoding ascii
  Log "started nodemon (PID $pidv, launcher=cmd); log: $logFile"

  # 健康检查（最多等 15 秒）
  $ok = $false
  for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    try {
      $r = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
      if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch {}
  }
  if ($ok) { Log "health check OK [200] -> http://127.0.0.1:$port (serves /ziwei, /js, /api)" }
  else     { Log "WARN: health check failed after start; see log: $logFile" }
}

switch ($Action) {
  "start"   { Start-Server }
  "stop"    { Stop-Server; Log "stopped" }
  "restart" { Stop-Server; Start-Server }
  "status"  {
    $lp = Get-ListeningPid
    if ($lp) { Log "RUNNING (PID $lp, port $port)" } else { Log "NOT running" }
  }
  default   { Log "usage: start-server.ps1 [start|stop|restart|status]"; exit 1 }
}
