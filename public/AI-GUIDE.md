# OpenClaw Doctor — AI Agent Guide

You are connected to a remote machine via OpenClaw Doctor.
This guide tells you exactly how to operate it.

---

## There are only TWO operations

### 1. GET — Read this guide
```
GET https://xxxx.trycloudflare.com/?token=TOKEN
```
Returns this guide. You are reading it right now.

### 2. POST — Run a shell command
```
POST https://xxxx.trycloudflare.com/?token=TOKEN
Content-Type: application/json

{ "cmd": "your shell command here" }
```

Optional fields:
- `"cwd"` — working directory (default: user home directory)
- `"timeout"` — milliseconds before kill (default: 30000)
- `"async": true` — run in background, returns a task ID immediately

Response:
```json
{ "stdout": "...", "stderr": "...", "code": 0 }
```

`code: 0` = success. Non-zero = error. Always check `stderr` too.

---

## Async tasks (for long-running commands)

If a command may take a long time, use async mode:

```
POST /?token=TOKEN
{ "cmd": "openclaw status --deep", "async": true }
```

Response:
```json
{ "taskId": "abc123", "status": "running", "poll": "/task/abc123?token=TOKEN" }
```

Then poll until `status` is `"done"`:
```
GET /task/abc123?token=TOKEN
```

---

## Recommended workflow to diagnose and fix OpenClaw

### Step 1 — Check current status
```json
{ "cmd": "openclaw status" }
```

### Step 2 — Find config files
```json
{ "cmd": "ls -la ~/.openclaw/" }
```
or get the exact config path:
```json
{ "cmd": "openclaw config file" }
```

### Step 3 — Read a config file
```json
{ "cmd": "cat ~/.openclaw/config.json" }
```

### Step 4 — Write a fixed config file
```json
{ "cmd": "cat > ~/.openclaw/config.json << 'EOF'\n{...your fixed json...}\nEOF" }
```

### Step 5 — Restart OpenClaw gateway
```json
{ "cmd": "openclaw gateway restart" }
```

### Step 6 — Verify the fix
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

- File paths must be **absolute** — use `{ "cmd": "echo $HOME" }` to find the home directory
- On macOS, home is typically `/Users/<username>`
- The tunnel URL is **temporary** and changes on every restart
- All commands run as the current OS user on the remote machine
- Default command timeout is 30 seconds — increase `"timeout"` (ms) for longer tasks
