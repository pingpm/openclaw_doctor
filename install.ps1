# ─────────────────────────────────────────────────────────────────────────────
# OpenClaw Doctor — Windows Installer
# Usage (run in PowerShell as Administrator):
#   irm https://ocd.imdaxia.com/install.ps1 | iex
# Or to stop:
#   irm https://ocd.imdaxia.com/install.ps1 | iex; Stop-OCD
# ─────────────────────────────────────────────────────────────────────────────

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Host.UI.RawUI.WindowTitle = "OpenClaw Doctor Installer"

$INSTALL_DIR = "$env:USERPROFILE\.openclaw-doctor"
$PID_FILE    = "$INSTALL_DIR\doctor.pid"
$LOG_FILE    = "$INSTALL_DIR\doctor.log"
$REPO_URL    = "https://ocd.imdaxia.com"
$PORT        = if ($env:OCD_PORT) { $env:OCD_PORT } else { "12222" }

# ── Banner ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  🦞 OpenClaw Doctor — Remote Diagnostic Installer" -ForegroundColor Red
Write-Host "  ─────────────────────────────────────────────────"
Write-Host ""

# ── Stop command ──────────────────────────────────────────────────────────────
function Stop-OCD {
    if (Test-Path $PID_FILE) {
        $oldPid = Get-Content $PID_FILE -ErrorAction SilentlyContinue
        if ($oldPid) {
            $proc = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
            if ($proc) {
                Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
                Write-Host "[ocd] ✅ OpenClaw Doctor stopped (PID $oldPid)." -ForegroundColor Green
            } else {
                Write-Host "[ocd] ⚠️  Process $oldPid is not running." -ForegroundColor Yellow
            }
        }
        Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "[ocd] ⚠️  No running instance found (no PID file)." -ForegroundColor Yellow
    }
    Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like "*localhost:$PORT*" } |
        Stop-Process -Force -ErrorAction SilentlyContinue
}

if ($args[0] -eq "stop") {
    Stop-OCD
    exit 0
}

# ── Create install directory ──────────────────────────────────────────────────
if (!(Test-Path $INSTALL_DIR)) {
    New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
}
Set-Location $INSTALL_DIR
Write-Host "[ocd] Install directory: $INSTALL_DIR" -ForegroundColor Cyan

# ── Stop existing instance ────────────────────────────────────────────────────
if (Test-Path $PID_FILE) {
    $oldPid = Get-Content $PID_FILE -ErrorAction SilentlyContinue
    if ($oldPid) {
        $proc = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "[ocd] Stopping existing instance (PID $oldPid)..." -ForegroundColor Cyan
            Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
    }
    Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
}
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*localhost:$PORT*" } |
    Stop-Process -Force -ErrorAction SilentlyContinue

# ── Detect network region ─────────────────────────────────────────────────────
function Get-Country {
    $providers = @(
        { (Invoke-RestMethod -Uri "http://ip-api.com/json/?fields=countryCode" -TimeoutSec 5).countryCode },
        { (Invoke-RestMethod -Uri "https://ifconfig.co/country-iso" -TimeoutSec 5).Trim() },
        { (Invoke-RestMethod -Uri "https://ipinfo.io/country" -TimeoutSec 5).Trim() }
    )
    foreach ($p in $providers) {
        try {
            $result = & $p
            if ($result -match '^[A-Z]{2}$') { return $result }
        } catch {}
    }
    return ""
}

Write-Host "[ocd] Checking network environment..." -ForegroundColor Cyan
$country = Get-Country

if ([string]::IsNullOrEmpty($country)) {
    Write-Host "[ocd] ⚠️  Could not detect network region. Proceeding without acceleration." -ForegroundColor Yellow
} elseif ($country -eq "CN") {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║  🌏 Network Environment: Mainland China (CN)     ║" -ForegroundColor Yellow
    Write-Host "║  GitHub proxy acceleration has been enabled.     ║" -ForegroundColor Yellow
    Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""

    Write-Host "[ocd] Configuring GitHub proxy acceleration for cloudflared..." -ForegroundColor Yellow
    Write-Host "[ocd] Fetching latest cloudflared version..." -ForegroundColor Cyan
    try {
        $resp = Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest" `
            -MaximumRedirection 0 -ErrorAction SilentlyContinue
        $version = $resp.BaseResponse.ResponseUri.ToString().Split('/')[-1].TrimStart('v')
    } catch { $version = "" }

    if ([string]::IsNullOrEmpty($version)) {
        $version = "2024.4.1"
        Write-Host "[ocd] ⚠️  Failed to fetch latest version, using fallback: $version" -ForegroundColor Yellow
    } else {
        Write-Host "[ocd] ✅ Latest cloudflared version: $version" -ForegroundColor Green
    }

    $arch = if ([Environment]::Is64BitOperatingSystem) { "amd64" } else { "386" }
    $binaryFile = "cloudflared-windows-$arch.exe"
    $githubUrl = "https://github.com/cloudflare/cloudflared/releases/download/$version/$binaryFile"
    $env:CLOUDFLARED_BIN_URL = "https://githubproxy.cc/$githubUrl"
    Write-Host "[ocd] ✅ Proxy URL set: $env:CLOUDFLARED_BIN_URL" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  🌐 Network Environment: International ($country)$((' ' * (14 - $country.Length)))║" -ForegroundColor Green
    Write-Host "║  Direct connection will be used.                 ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
}

# ── Check / install Node.js ───────────────────────────────────────────────────
$portableNodeDir = "$INSTALL_DIR\node-bin"
$nodeExe = "node"

function Test-Node {
    if (Get-Command node -ErrorAction SilentlyContinue) { return $true }
    if (Test-Path "$portableNodeDir\node.exe") {
        $script:nodeExe = "$portableNodeDir\node.exe"
        $env:PATH = "$portableNodeDir;" + $env:PATH
        return $true
    }
    return $false
}

if (!(Test-Node)) {
    Write-Host "[ocd] ⚠️  Node.js not found. Downloading portable Node.js..." -ForegroundColor Yellow
    $nodeZipUrl  = "https://nodejs.org/dist/v22.12.0/node-v22.12.0-win-x64.zip"
    $nodeZipFile = "$env:TEMP\ocd_node.zip"
    $nodeTempDir = "$env:TEMP\ocd_node_temp"

    try {
        Write-Host "[ocd] Downloading Node.js 22.x..." -ForegroundColor Cyan
        (New-Object Net.WebClient).DownloadFile($nodeZipUrl, $nodeZipFile)

        Write-Host "[ocd] Extracting..." -ForegroundColor Cyan
        if (Test-Path $nodeTempDir) { Remove-Item -Recurse -Force $nodeTempDir }
        Expand-Archive -Path $nodeZipFile -DestinationPath $nodeTempDir -Force

        $innerFolder = Get-ChildItem -Path $nodeTempDir -Directory | Select-Object -First 1
        if (!(Test-Path $portableNodeDir)) { New-Item -ItemType Directory -Path $portableNodeDir | Out-Null }
        Copy-Item -Path "$($innerFolder.FullName)\*" -Destination $portableNodeDir -Recurse -Force

        Get-ChildItem -Path $portableNodeDir -Recurse | Unblock-File -ErrorAction SilentlyContinue

        $script:nodeExe = "$portableNodeDir\node.exe"
        $env:PATH = "$portableNodeDir;" + $env:PATH

        Remove-Item $nodeZipFile -Force -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force $nodeTempDir -ErrorAction SilentlyContinue

        Write-Host "[ocd] ✅ Node.js installed: $(& $script:nodeExe -v)" -ForegroundColor Green
    } catch {
        Write-Host "[ocd] ❌ Failed to install Node.js: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "     Please install Node.js manually: https://nodejs.org" -ForegroundColor Gray
        Read-Host "Press Enter to exit"
        exit 1
    }
}

$nodeVer = & $script:nodeExe -e "process.stdout.write(process.version)"
Write-Host "[ocd] ✅ Node.js $nodeVer found" -ForegroundColor Green

# ── Write package.json ────────────────────────────────────────────────────────
$pkgJson = @'
{
  "name": "openclaw-doctor",
  "version": "1.0.0",
  "description": "Remote diagnostic & repair tool for OpenClaw",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "express": "^4.18.2",
    "cloudflared": "^0.5.0",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "axios": "^1.6.2"
  },
  "license": "MIT"
}
'@
Set-Content -Path "package.json" -Value $pkgJson -Encoding UTF8

# ── Download server files ─────────────────────────────────────────────────────
Write-Host "[ocd] Downloading server files from $REPO_URL ..." -ForegroundColor Cyan

try {
    Invoke-WebRequest -Uri "$REPO_URL/server.js" -OutFile "server.js" -UseBasicParsing
    if (!(Test-Path "public")) { New-Item -ItemType Directory -Path "public" | Out-Null }
    Invoke-WebRequest -Uri "$REPO_URL/public/index.html" -OutFile "public\index.html" -UseBasicParsing
    Invoke-WebRequest -Uri "$REPO_URL/public/AI-GUIDE.md" -OutFile "public\AI-GUIDE.md" -UseBasicParsing
    Write-Host "[ocd] ✅ Server files downloaded." -ForegroundColor Green
} catch {
    Write-Host "[ocd] ❌ Failed to download server files: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# ── Install npm dependencies ──────────────────────────────────────────────────
Write-Host "[ocd] Installing Node.js dependencies (this may take ~30s)..." -ForegroundColor Cyan

$npmExe = if (Test-Path "$portableNodeDir\npm.cmd") { "$portableNodeDir\npm.cmd" } else { "npm" }
$npmArgs = @("install", "--prefer-offline", "--no-audit", "--no-fund", "--loglevel=error")

if ($country -eq "CN") {
    Write-Host "[ocd] Using Taobao npm mirror for faster downloads..." -ForegroundColor Cyan
    $npmArgs += "--registry=https://registry.npmmirror.com"
}

try {
    & $npmExe @npmArgs 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    Write-Host "[ocd] ✅ Dependencies installed." -ForegroundColor Green
} catch {
    # Retry without --prefer-offline
    $npmArgs = $npmArgs | Where-Object { $_ -ne "--prefer-offline" }
    & $npmExe @npmArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ocd] ❌ npm install failed. Check your internet connection." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "[ocd] ✅ Dependencies installed." -ForegroundColor Green
}

# ── Generate token ────────────────────────────────────────────────────────────
$TOKEN = & $script:nodeExe -e "const c=require('crypto');process.stdout.write(c.randomBytes(16).toString('hex'))"

# ── Launch server ─────────────────────────────────────────────────────────────
Write-Host "[ocd] Starting OpenClaw Doctor on port $PORT..." -ForegroundColor Cyan

$env:PORT  = $PORT
$env:TOKEN = $TOKEN

$proc = Start-Process -FilePath $script:nodeExe -ArgumentList "server.js" `
    -WorkingDirectory $INSTALL_DIR `
    -RedirectStandardOutput $LOG_FILE `
    -RedirectStandardError "$INSTALL_DIR\doctor.err.log" `
    -WindowStyle Hidden -PassThru

$proc.Id | Set-Content $PID_FILE
Write-Host "[ocd] Server starting (PID $($proc.Id)). Waiting for tunnel..." -ForegroundColor Cyan

# ── Wait for tunnel URL ───────────────────────────────────────────────────────
$TUNNEL_URL = ""
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $LOG_FILE) {
        $logContent = Get-Content $LOG_FILE -Raw -ErrorAction SilentlyContinue
        if ($logContent -match 'https://[a-z0-9\-]+\.trycloudflare\.com') {
            $TUNNEL_URL = $Matches[0]
            break
        }
    }
}

Write-Host ""
if ($TUNNEL_URL) {
    $FULL_LINK = "$TUNNEL_URL/?token=$TOKEN"
    Write-Host "✅  OPENCLAW DOCTOR IS ONLINE" -ForegroundColor Green
    Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "🌐  Public URL  : $TUNNEL_URL" -ForegroundColor Cyan
    Write-Host "🔐  Token       : $TOKEN" -ForegroundColor Yellow
    Write-Host "🔗  Full link   : $FULL_LINK" -ForegroundColor Cyan
    Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Send the Full link to an AI agent to start remote repair." -ForegroundColor Gray
    Write-Host "  Open the Full link in a browser for the visual dashboard." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  To stop: Stop-OCD  (or close this window)" -ForegroundColor Gray

    try {
        Set-Clipboard -Value $FULL_LINK
        Write-Host "  📋 Full link copied to clipboard!" -ForegroundColor Green
    } catch {}
} else {
    Write-Host "[ocd] ⚠️  Tunnel URL not detected. Check logs: $LOG_FILE" -ForegroundColor Yellow
    Write-Host "  Local access: http://localhost:$PORT/?token=$TOKEN" -ForegroundColor Cyan
}

Write-Host ""
Read-Host "Press Enter to close this window (server keeps running in background)"
