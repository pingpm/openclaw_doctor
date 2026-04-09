#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OpenClaw Doctor — One-Click Install Script
# Usage: curl -sSL https://ocd.imdaxia.com/install.sh | bash
# ─────────────────────────────────────────────────────────────────────────────
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${CYAN}[ocd]${NC} $*"; }
ok()   { echo -e "${GREEN}[ocd] ✅ $*${NC}"; }
warn() { echo -e "${YELLOW}[ocd] ⚠️  $*${NC}"; }
die()  { echo -e "${RED}[ocd] ❌ $*${NC}" >&2; exit 1; }

INSTALL_DIR="$HOME/.openclaw-doctor"
PORT="${OCD_PORT:-12222}"
REPO_URL="https://ocd.imdaxia.com"
LOG_FILE="$INSTALL_DIR/doctor.log"
PID_FILE="$INSTALL_DIR/doctor.pid"

# ── Stop command ──────────────────────────────────────────────────────────────
if [ "${1}" = "stop" ]; then
  if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
      kill "$OLD_PID"
      rm -f "$PID_FILE"
      echo -e "${GREEN}[ocd] ✅ OpenClaw Doctor stopped (PID $OLD_PID).${NC}"
    else
      echo -e "${YELLOW}[ocd] ⚠️  Process $OLD_PID is not running.${NC}"
      rm -f "$PID_FILE"
    fi
  else
    echo -e "${YELLOW}[ocd] ⚠️  No running instance found (no PID file).${NC}"
  fi
  exit 0
fi

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${RED}  🦞 OpenClaw Doctor — Remote Diagnostic Installer${NC}"
echo "  ─────────────────────────────────────────────────"
echo ""

# ── Check / install Node.js ───────────────────────────────────────────────────
ensure_node() {
  if command -v node &>/dev/null; then
    NODE_VER=$(node -e "process.stdout.write(process.version)")
    ok "Node.js $NODE_VER found"
    return
  fi

  warn "Node.js not found. Attempting to install..."

  if command -v brew &>/dev/null; then
    brew install node
  elif command -v apt-get &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif command -v yum &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
    sudo yum install -y nodejs
  else
    die "Cannot auto-install Node.js. Please install Node.js 18+ manually: https://nodejs.org"
  fi

  command -v node &>/dev/null || die "Node.js installation failed."
  ok "Node.js installed: $(node -v)"
}

# ── Create install directory ──────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
log "Install directory: $INSTALL_DIR"

# ── Stop existing instance ────────────────────────────────────────────────────
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    log "Stopping existing instance (PID $OLD_PID)..."
    kill "$OLD_PID" || true
    sleep 1
  fi
  rm -f "$PID_FILE"
fi

# ── Ensure Node.js ────────────────────────────────────────────────────────────
ensure_node

# ── Write package.json ────────────────────────────────────────────────────────
cat > package.json <<'PKGJSON'
{
  "name": "openclaw-doctor",
  "version": "1.0.0",
  "description": "Remote diagnostic & repair tool for OpenClaw",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cloudflared": "^0.5.0",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "axios": "^1.6.2"
  },
  "license": "MIT"
}
PKGJSON

# ── Download server.js and web UI ─────────────────────────────────────────────
log "Downloading server files from $REPO_URL ..."

curl -sSL "$REPO_URL/server.js" -o server.js \
  || die "Failed to download server.js from $REPO_URL"

mkdir -p public
curl -sSL "$REPO_URL/public/index.html" -o public/index.html \
  || die "Failed to download public/index.html from $REPO_URL"

ok "Server files downloaded."

# ── Install npm dependencies ──────────────────────────────────────────────────
log "Installing Node.js dependencies (this may take ~30s)..."
npm install --prefer-offline --no-audit --no-fund --loglevel=error 2>&1 \
  || npm install --no-audit --no-fund --loglevel=error 2>&1 \
  || die "npm install failed. Check your internet connection."
ok "Dependencies installed."

# ── Generate token ────────────────────────────────────────────────────────────
TOKEN=$(node -e "const c=require('crypto');process.stdout.write(c.randomBytes(16).toString('hex'))")

# ── Launch server ─────────────────────────────────────────────────────────────
log "Starting OpenClaw Doctor on port $PORT..."

PORT="$PORT" TOKEN="$TOKEN" nohup node server.js > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
SERVER_PID=$(cat "$PID_FILE")

log "Server starting (PID $SERVER_PID). Waiting for tunnel..."

# Wait for tunnel URL to appear in logs (up to 40s)
TUNNEL_URL=""
for i in $(seq 1 40); do
  sleep 1
  TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null || true)
  if [ -n "$TUNNEL_URL" ]; then break; fi
done

echo ""
if [ -n "$TUNNEL_URL" ]; then
  FULL_LINK="${TUNNEL_URL}/?token=${TOKEN}"
  echo ""
  echo -e "${GREEN}✅  OPENCLAW DOCTOR IS ONLINE${NC}"
  echo "─────────────────────────────────────────────────────────"
  echo -e "🌐  Public URL  : ${CYAN}${TUNNEL_URL}${NC}"
  echo -e "🔐  Token       : ${YELLOW}${TOKEN}${NC}"
  echo -e "🔗  Full link   : ${CYAN}${FULL_LINK}${NC}"
  echo "─────────────────────────────────────────────────────────"
  echo ""
  echo "  Share the full link above with another AI agent or browser to"
  echo "  remotely diagnose and repair this OpenClaw installation."
  echo ""
  echo "  To stop:   bash ~/.openclaw-doctor/install.sh stop"
  echo "  To update: curl -sSL https://ocd.imdaxia.com/install.sh | bash"
else
  warn "Tunnel URL not detected yet. Check logs: tail -f $LOG_FILE"
  echo "  Local access: http://localhost:$PORT/?token=$TOKEN"
fi
