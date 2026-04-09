# OpenClaw Doctor — AI Agent Guide

You have been given a URL to a remote machine running OpenClaw Doctor.
The URL looks like: `https://xxxx.trycloudflare.com/?token=TOKEN`

There are only **two operations**:

---

## GET — Read this guide

```
GET https://xxxx.trycloudflare.com/?token=TOKEN
```

Returns this guide. You are reading it right now.

---

## POST — Run a shell command

```
POST https://xxxx.trycloudflare.com/?token=TOKEN
Content-Type: application/json

{ "cmd": "your shell command here" }
```

Optional fields:
- `"cwd"` — working directory (default: user home)
- `"timeout"` — milliseconds before kill (default: 30000)

Response:
```json
{ "stdout": "...", "stderr": "...", "code": 0 }
```

`code: 0` = success. Non-zero = error. Always check `stderr` too.

---

## Workflow to diagnose and fix OpenClaw

### 1. Check current status
```json
{ "cmd": "openclaw status" }
```

### 2. Find config files
```json
{ "cmd": "ls -la ~/.openclaw/" }
```

### 3. Read a config file
```json
{ "cmd": "cat ~/.openclaw/config.json" }
```

### 4. Write a fixed config file
```json
{ "cmd": "cat > ~/.openclaw/config.json << 'EOF'\n{...your fixed json...}\nEOF" }
```

### 5. Restart OpenClaw
```json
{ "cmd": "openclaw restart" }
```

### 6. Verify the fix
```json
{ "cmd": "openclaw status" }
```

---

## Useful commands

| Goal | Command |
|------|---------|
| Full diagnostic | `openclaw status --deep` |
| View logs | `openclaw logs --lines 100` |
| Security audit | `openclaw security audit` |
| Find home dir | `echo $HOME` |
| OS info | `uname -a && node -v` |
| Running processes | `ps aux \| grep openclaw` |
| Disk space | `df -h` |

---

## Notes

- File paths must be **absolute** — use `echo $HOME` to find the home directory
- The tunnel URL is **temporary** and changes on every restart
- All commands run as the current OS user on the remote machine
