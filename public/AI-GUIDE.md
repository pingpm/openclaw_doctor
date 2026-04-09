# OpenClaw Doctor — AI Agent Operation Guide

You have been given access to a remote machine via **OpenClaw Doctor**.
This guide tells you exactly how to operate it.

---

## Authentication

Every request (except `/api/ping`) requires a token.
Pass it as a header OR a query parameter:

```
Header:  x-doctor-token: <TOKEN>
Query:   ?token=<TOKEN>
```

The token is part of the URL you were given, e.g.:
`https://xxxx.trycloudflare.com/?token=abc123`
Extract `abc123` as your TOKEN.

---

## Endpoints

### 1. Check server is alive
```
GET /api/ping
```
No auth required. Returns:
```json
{ "status": "alive", "app": "openclaw-doctor", "version": "1.0.0", "guide": "/AI-GUIDE.md" }
```

### 2. Get OpenClaw health status
```
GET /api/status
x-doctor-token: <TOKEN>
```
Optional query: `?mode=deep` for full probe.
Returns raw `openclaw status` output in `stdout`.

### 3. Execute any shell command
```
POST /api/exec
x-doctor-token: <TOKEN>
Content-Type: application/json

{ "cmd": "your shell command here", "cwd": "/optional/working/dir", "timeout": 30000 }
```
Response:
```json
{
  "stdout": "command output",
  "stderr": "error output if any",
  "code": 0
}
```
- `code: 0` means success, non-zero means error
- `cwd` defaults to the user home directory if omitted
- `timeout` is in milliseconds, default 30000 (30s)

### 4. Read a file
```
GET /api/files/read?filePath=/absolute/path/to/file
x-doctor-token: <TOKEN>
```
Response:
```json
{ "filePath": "/path/to/file", "data": "file contents here", "size": 1234 }
```

### 5. Write / create a file
```
POST /api/files/write
x-doctor-token: <TOKEN>
Content-Type: application/json

{ "filePath": "/absolute/path/to/file", "content": "new file content" }
```
- Creates the file if it does not exist
- Creates parent directories automatically
- Overwrites existing content

Response:
```json
{ "success": true, "filePath": "/path/to/file", "size": 42 }
```

### 6. List a directory
```
GET /api/files/list?dirPath=/absolute/path/to/dir
x-doctor-token: <TOKEN>
```
Response:
```json
{
  "dirPath": "/path/to/dir",
  "items": [
    { "name": "config.json", "type": "file", "path": "/path/to/dir/config.json" },
    { "name": "logs",        "type": "dir",  "path": "/path/to/dir/logs" }
  ]
}
```

---

## Recommended Workflow

### Step 1 — Verify connection
```
GET /api/ping
```
Confirm you get `"status": "alive"` before proceeding.

### Step 2 — Check OpenClaw health
```
GET /api/status
```
Read `stdout` to understand the current state of the machine.
Look for errors in the Overview table and Security audit section.

### Step 3 — Diagnose with shell commands
Use `POST /api/exec` to run diagnostic commands, for example:
```json
{ "cmd": "openclaw status --deep" }
{ "cmd": "cat ~/.openclaw/config.json" }
{ "cmd": "ls -la ~/.openclaw/" }
{ "cmd": "openclaw logs --lines 50" }
{ "cmd": "ps aux | grep openclaw" }
```

### Step 4 — Fix config files
1. Read the broken config:
   `GET /api/files/read?filePath=/Users/username/.openclaw/config.json`
2. Analyze the content
3. Write the fixed version:
   `POST /api/files/write` with corrected `content`
4. Verify the fix:
   `POST /api/exec` with `{ "cmd": "openclaw status" }`

### Step 5 — Restart services if needed
```json
{ "cmd": "openclaw restart" }
```
or
```json
{ "cmd": "openclaw stop && sleep 2 && openclaw start" }
```

---

## Common OpenClaw Fix Commands

| Problem | Command |
|---------|---------|
| Check status | `openclaw status` |
| Full diagnostic | `openclaw status --deep` |
| View recent logs | `openclaw logs --lines 100` |
| Follow live logs | `openclaw logs --follow` (use short timeout) |
| Restart gateway | `openclaw restart` |
| Security audit | `openclaw security audit` |
| List config files | `ls -la ~/.openclaw/` |
| Show main config | `cat ~/.openclaw/config.json` |
| Show OS & node | `node -v && uname -a` |

---

## Important Notes

- All commands run as the **current OS user** on the remote machine
- File paths must be **absolute** (start with `/` on macOS/Linux)
- On macOS, home directory is typically `/Users/<username>` — use `{ "cmd": "echo $HOME" }` to find it
- Commands have a default timeout of **30 seconds**; increase `timeout` (ms) for long-running tasks
- The tunnel URL is **temporary** — it changes every time OpenClaw Doctor restarts
- This server runs on the broken machine itself, so if OpenClaw is completely unresponsive, shell commands are your primary tool

---

## Example: Full Repair Session

```
# 1. Ping
GET /api/ping  →  alive ✅

# 2. Get status
GET /api/status  →  read stdout, find the issue

# 3. Find config location
POST /api/exec  {"cmd": "ls ~/.openclaw/"}

# 4. Read broken config
GET /api/files/read?filePath=/Users/ycg/.openclaw/config.json

# 5. Write fixed config
POST /api/files/write  {"filePath": "/Users/ycg/.openclaw/config.json", "content": "{...fixed json...}"}

# 6. Restart and verify
POST /api/exec  {"cmd": "openclaw restart"}
GET /api/status  →  confirm fixed ✅
```
