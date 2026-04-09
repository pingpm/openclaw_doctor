# OpenClaw Doctor — AI Agent Guide

## IMPORTANT: How to read this guide

You were given a URL like:
```
https://xxxx.trycloudflare.com/?token=abc123def456...
```

**The `token` parameter in the URL IS your authentication token.**
Extract it directly from the URL — no separate token is needed.

Example: if your URL is `https://xxxx.trycloudflare.com/?token=abc123`
then your TOKEN is `abc123`

You are reading this guide because you made a GET request to that URL without a browser User-Agent.
If you received HTML instead of this guide, add the header `Accept: text/plain` to your GET request.

---

## There are only TWO operations

### 1. GET — Read this guide (you just did this)
```
GET https://xxxx.trycloudflare.com/?token=TOKEN
```
Returns this guide as plain text. Use it to understand how to operate the remote machine.

### 2. POST — Run a shell command on the remote machine
```
POST https://xxxx.trycloudflare.com/?token=TOKEN
Content-Type: application/json

{ "cmd": "your shell command here" }
```

The token goes in the URL as `?token=TOKEN` — same URL, just POST instead of GET.

Optional fields:
- `"cwd"` — working directory (default: user home directory)
- `"timeout"` — milliseconds before kill (default: 30000)
- `"async": true` — run in background, returns a task ID immediately

Response:
```json
{ "stdout": "command output here", "stderr": "error output if any", "code": 0 }
```

`code: 0` = success. Non-zero = error. Always check `stderr` too.

---

## Quick start: diagnose OpenClaw

Run these commands in order by sending POST requests:

```json
{ "cmd": "openclaw status" }
```
```json
{ "cmd": "echo $HOME && ls ~/.openclaw/" }
```
```json
{ "cmd": "openclaw config file" }
```

---

## Async tasks (for long-running commands)

```
POST /?token=TOKEN
{ "cmd": "openclaw status --deep", "async": true }
```
Returns: `{ "taskId": "abc123", "status": "running", "poll": "/task/abc123?token=TOKEN" }`

Poll until done:
```
GET /task/abc123?token=TOKEN
```

---

## Workflow to fix OpenClaw

### Step 1 — Check status
```json
{ "cmd": "openclaw status" }
```

### Step 2 — Find config location
```json
{ "cmd": "openclaw config file" }
```

### Step 3 — Read the config
```json
{ "cmd": "cat ~/.openclaw/config.json" }
```

### Step 4 — Write a fixed config
```json
{ "cmd": "cat > ~/.openclaw/config.json << 'EOF'\n{...fixed content...}\nEOF" }
```

### Step 5 — Restart and verify
```json
{ "cmd": "openclaw gateway restart" }
```
```json
{ "cmd": "openclaw status" }
```

---

## OpenClaw command reference

| Goal | Command |
|------|---------|
| Full status | `openclaw status` |
| Deep diagnostic | `openclaw status --deep` |
| Start gateway | `openclaw gateway start` |
| Stop gateway | `openclaw gateway stop` |
| Restart gateway | `openclaw gateway restart` |
| View logs | `openclaw logs --lines 100` |
| Follow live logs | `openclaw logs --follow` |
| Only errors | `openclaw logs --error` |
| Security audit | `openclaw security audit` |
| All config | `openclaw config get all` |
| Config file path | `openclaw config file` |
| Validate config | `openclaw config validate` |
| Auto-fix issues | `openclaw doctor --fix` |
| List models | `openclaw models list` |
| Model status | `openclaw models status` |

---

## Notes

- The TOKEN is already in the URL you were given — use it as-is
- File paths must be **absolute** — use `{ "cmd": "echo $HOME" }` to find home directory
- On macOS, home is typically `/Users/<username>`
- The tunnel URL is **temporary** and changes on every restart
- All commands run as the current OS user on the remote machine
- Default timeout is 30 seconds — increase `"timeout"` (ms) for longer tasks
