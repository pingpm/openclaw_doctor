# OpenClaw Doctor 🦞

> Remote shell access over HTTPS — share a link with any AI agent to diagnose and fix any machine remotely.

**OpenClaw Doctor** installs on a broken machine in under 10 seconds, creates a Cloudflare tunnel, and gives you (or an AI agent) full shell access via a secure public URL. No SSH, no passwords, no firewall config.

---

## Screenshots

| Control Panel | Audit Log |
|---|---|
| ![Control Panel](pannel.png) | ![Audit Log](opreation_log.png) |

---

## Quick Install

**macOS / Linux:**
```bash
curl -sSL https://ocd.imdaxia.com/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://ocd.imdaxia.com/install.ps1 | iex
```
> Node.js is automatically downloaded if not installed. Run PowerShell as Administrator for best results.

Within ~15 seconds you'll see:

```
✅  OPENCLAW DOCTOR IS ONLINE
─────────────────────────────────────────────────────────
🌐  Public URL  : https://orange-tiger.trycloudflare.com
🔐  Token       : a3f9d2e1b4c7...
🔗  Full link   : https://orange-tiger.trycloudflare.com/?token=a3f9...
─────────────────────────────────────────────────────────
→  Give the Full link to an AI agent to start remote repair.
→  Open the Public URL in a browser for the visual dashboard.
→  To stop: bash ~/.openclaw-doctor/install.sh stop
```

Send the **Full link** to any AI tool (Kiro, Cursor, Claude, Trae, Antigravity…) and describe your problem:

> "Help me fix OpenClaw not starting. Remote link: https://xxxx.trycloudflare.com/?token=..."

The AI reads the built-in guide and starts working immediately.

---

## Stop / Restart

**macOS / Linux:**
```bash
bash ~/.openclaw-doctor/install.sh stop
```

**Windows:**
```powershell
# In the same PowerShell window where you installed:
Stop-OCD

# Or re-run to stop old instance and start fresh:
irm https://ocd.imdaxia.com/install.ps1 | iex
```

Re-running the install command automatically stops the old instance and starts a fresh one with a new token.

---

## Features

| Feature | Description |
|---------|-------------|
| 🌐 **No SSH** | HTTPS URL only — no user accounts, no key exchange, no open ports |
| 🔐 **Token auth** | 128-bit random token per session; restart anytime to invalidate |
| 🩺 **Health dashboard** | Auto-runs `openclaw status`, displays gateway, agents, sessions visually |
| ⚡ **Full shell access** | Any command, same permissions as the local user |
| 🤖 **AI-ready** | Built-in Markdown guide returned on GET — AI starts working immediately |
| 🚇 **Cloudflare tunnel** | Free Quick Tunnel, works behind NAT/VPN/firewall, zero config |
| 📋 **Audit log** | Every command + output recorded with timestamp and caller info |
| 🌍 **Bilingual UI** | Chinese/English toggle, defaults to Chinese |
| 🖥️ **Web terminal** | Browser terminal with history, color output, fullscreen overlay |
| ⏳ **Async tasks** | Long-running commands via `"async": true` + poll endpoint |

---

## How It Works

1. **Install** — one `curl | bash` installs Node.js deps and starts the server on port `12222`
2. **Tunnel** — Cloudflare Quick Tunnel creates a public HTTPS URL automatically
3. **Share** — send the full link (with token) to an AI agent or open in browser

---

## API

All endpoints require `?token=TOKEN` query parameter.

### Core operations

```
# GET — returns the AI operation guide (no User-Agent header)
GET https://xxxx.trycloudflare.com/?token=TOKEN

# POST — run any shell command
POST https://xxxx.trycloudflare.com/?token=TOKEN
Content-Type: application/json

{"cmd": "openclaw status"}
```

Response:
```json
{ "stdout": "...", "stderr": "...", "code": 0 }
```

Optional POST fields: `"cwd"`, `"timeout"` (ms), `"async": true`

### Other endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/status` | Run `openclaw status`, return output |
| `GET`  | `/audit` | Full audit log (newest first) |
| `DELETE` | `/audit` | Clear audit log |
| `GET`  | `/info` | Session info (token, tunnel URL, port) |
| `POST` | `/restart` | Regenerate token, invalidate old link |
| `GET`  | `/task/:id` | Poll async task result |

---

## Security

- Token is randomly generated each session (128-bit entropy)
- Tunnel URL is ephemeral — changes on every restart
- **Only share the full link with trusted people or AI agents** — it grants full shell access
- When done: stop the service or use `/restart` to invalidate the current token
- All operations are logged to `~/.openclaw-doctor/audit.log` for review

---

## Project Structure

```
openclaw_doctor/
├── server.js          # Express server + Cloudflare tunnel
├── install.sh         # One-click installer (also handles stop/update)
├── package.json
├── public/
│   ├── index.html     # Dashboard UI (bilingual, web terminal, audit log)
│   └── AI-GUIDE.md    # Operation guide returned to AI agents on GET
└── website/
    ├── index.html     # Official landing page (EN)
    └── index.zh.html  # Official landing page (ZH)
```

---

## Manual Start

```bash
git clone https://github.com/yourname/openclaw-doctor
cd openclaw-doctor
npm install
PORT=12222 TOKEN=mysecrettoken node server.js
```

---

## License

MIT · [中文说明 (README.zh.md)](./README.zh.md)
