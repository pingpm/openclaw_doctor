# OpenClaw Doctor 🦞

Remote diagnostic & repair tool for [OpenClaw](https://openclaw.ai) AI agent installations.

**Problem**: OpenClaw breaks after updates (bad config files, service crashes, etc.) and you need to remotely diagnose and fix it — without SSH, without knowing passwords.

**Solution**: Run one command. Get a public URL. Fix everything from any browser or AI agent.

---

## Quick Install

```bash
curl -sSL https://ocd.imdaxia.com/install.sh | bash
```

Within ~15 seconds you'll see:

```
╔═════════════════════════════════════════════════════════╗
║       ✅  OPENCLAW DOCTOR IS ONLINE                      ║
╠═════════════════════════════════════════════════════════╣
║  🌐 Public URL : https://orange-tiger.trycloudflare.com  ║
║  🔐 Token      : a3f9d2e1b4c7...                         ║
║  🔗 Full Access: https://orange-tiger.trycloudflare.com/?token=... ║
╚═════════════════════════════════════════════════════════╝
```

Share the **Full Access** link with another AI agent or open it in your browser.

---

## What it does

1. **Starts a local Express server** on port `12222` (configurable via `OCD_PORT`)
2. **Creates a Cloudflare Quick Tunnel** — a free, temporary public HTTPS URL, no account needed
3. **Serves a web terminal dashboard** at the tunnel URL
4. **Protects everything** with a randomly generated token

---

## API Reference

All authenticated routes require `x-doctor-token: <token>` header (or `?token=<token>` query param).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/api/ping` | ❌ | Health check |
| `GET`  | `/api/status` | ✅ | Run `openclaw status` |
| `POST` | `/api/exec` | ✅ | Execute shell command |
| `GET`  | `/api/files/read` | ✅ | Read file contents |
| `POST` | `/api/files/write` | ✅ | Write/create a file |
| `GET`  | `/api/files/list` | ✅ | List directory contents |

### Execute Command Example

```bash
curl -X POST https://YOUR-TUNNEL-URL/api/exec \
  -H "x-doctor-token: YOUR-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cmd": "openclaw status"}'
```

Response:
```json
{
  "stdout": "...",
  "stderr": "",
  "code": 0
}
```

---

## Project Structure

```
openclaw_doctor/
├── server.js          # Main server (Express + Cloudflare tunnel)
├── install.sh         # One-click installer
├── package.json
├── public/
│   └── index.html     # Remote terminal web dashboard
└── website/
    └── index.html     # Official landing page (deploy to ocd.imdaxia.com)
```

---

## Manual Start

```bash
git clone https://github.com/yourname/openclaw-doctor
cd openclaw-doctor
npm install
OCD_PORT=12222 TOKEN=mysecrettoken node server.js
```

---

## Security Notes

- The admin token is randomly generated each session (128-bit entropy)
- The tunnel URL is ephemeral — it changes every restart
- This tool gives **full shell access** to the remote machine — only share the link with trusted parties
- Consider keeping `OCD_PORT` firewalled locally; the tunnel handles external access

---

## License

MIT
