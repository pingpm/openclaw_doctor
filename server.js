/**
 * OpenClaw Doctor - Remote Diagnostic Server
 *
 * GET  /          (no token)  → serves web terminal UI (browser)
 * GET  /?token=xx             → returns AI-GUIDE.md so AI knows how to operate
 * POST /?token=xx             → executes a shell command, returns JSON result
 */

const express = require('express');
const { bin, install } = require('cloudflared');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const crypto = require('crypto');
const os = require('os');

const app = express();

const PORT  = parseInt(process.env.PORT || process.env.OCD_PORT) || 12222;
const TOKEN = process.env.TOKEN || crypto.randomBytes(16).toString('hex');
const STATE_FILE  = path.join(__dirname, '.doctor-state.json');
const GUIDE_FILE  = path.join(__dirname, 'public', 'AI-GUIDE.md');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Auth helper ──────────────────────────────────────────────────────────────
function checkToken(req) {
  const t = req.headers['x-doctor-token'] || req.query.token;
  return t === TOKEN;
}

// ─── GET / ────────────────────────────────────────────────────────────────────
// No token  → serve the browser UI (index.html)
// With token → return AI-GUIDE.md so the AI knows how to operate this machine
app.get('/', (req, res) => {
  if (!req.query.token) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }

  if (!checkToken(req)) {
    return res.status(401).type('text').send('Unauthorized. Invalid token.');
  }

  // Return the guide as plain text so any AI can read it directly
  fs.readFile(GUIDE_FILE, 'utf8', (err, data) => {
    if (err) {
      return res.type('text').send(
        '# OpenClaw Doctor\n\nSend POST requests to this URL with JSON body:\n' +
        '{"cmd":"your shell command"}\n\nInclude token as query param: ?token=TOKEN\n\n' +
        'Response: {"stdout":"...","stderr":"...","code":0}'
      );
    }
    res.type('text/markdown').send(data);
  });
});

// ─── POST / ───────────────────────────────────────────────────────────────────
// Execute a shell command on this machine.
// Body: { "cmd": "shell command", "cwd": "/optional/path", "timeout": 30000 }
// Response: { "stdout": "...", "stderr": "...", "code": 0 }
app.post('/', (req, res) => {
  if (!checkToken(req)) {
    return res.status(401).json({ error: 'Unauthorized. Pass token as ?token=TOKEN query param.' });
  }

  const { cmd, cwd, timeout = 30000 } = req.body || {};

  if (!cmd || typeof cmd !== 'string') {
    return res.status(400).json({
      error: 'Request body must be JSON with a "cmd" field.',
      example: { cmd: 'openclaw status', cwd: '/optional/path', timeout: 30000 }
    });
  }

  const workDir = cwd || os.homedir();
  console.log(`[exec] ${cmd}  (cwd: ${workDir})`);

  exec(cmd, { cwd: workDir, timeout }, (error, stdout, stderr) => {
    res.json({
      stdout: stdout || '',
      stderr: stderr || '',
      code:   error ? (error.code ?? 1) : 0,
      signal: error?.signal || null
    });
  });
});

// ─── Static files (web UI assets) ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── State persistence ────────────────────────────────────────────────────────
let tunnelUrl = '';

function saveState(url) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      tunnelUrl: url, token: TOKEN, port: PORT,
      startedAt: new Date().toISOString()
    }, null, 2));
  } catch (_) {}
}

// ─── Cloudflared install ──────────────────────────────────────────────────────
async function ensureCloudflared() {
  if (fs.existsSync(bin) && fs.statSync(bin).size > 0) return;

  console.log('📦 cloudflared not found — installing...');
  try {
    await install(bin);
    console.log('✅ cloudflared installed.');
    return;
  } catch (_) {
    console.warn('⚠️  Official install failed, trying mirror...');
  }

  const { platform, arch } = process;
  if (platform === 'darwin') throw new Error('brew install cloudflared');

  const name = platform === 'win32'
    ? (arch === 'x64' ? 'cloudflared-windows-amd64.exe' : 'cloudflared-windows-386.exe')
    : (arch === 'arm64' ? 'cloudflared-linux-arm64' : 'cloudflared-linux-amd64');

  const axios  = require('axios');
  const writer = fs.createWriteStream(bin);
  const resp   = await axios({ method: 'get', responseType: 'stream',
    url: `https://ghproxy.net/https://github.com/cloudflare/cloudflared/releases/latest/download/${name}` });
  resp.data.pipe(writer);
  await new Promise((ok, fail) => { writer.on('finish', ok); writer.on('error', fail); });
  fs.chmodSync(bin, '755');
  console.log('✅ cloudflared installed (mirror).');
}

// ─── Tunnel ───────────────────────────────────────────────────────────────────
function startTunnel(localPort) {
  return new Promise((resolve, reject) => {
    const proc = spawn(path.resolve(bin), ['tunnel', '--url', `http://localhost:${localPort}`], {
      shell: process.platform === 'win32'
    });
    let resolved = false;

    proc.stderr.on('data', (data) => {
      const m = data.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m && !resolved) {
        resolved = true;
        tunnelUrl = m[0];
        saveState(tunnelUrl);
        resolve(tunnelUrl);
      }
    });
    proc.on('exit',  (code) => { console.log(`ℹ️  Tunnel exited (${code})`); tunnelUrl = ''; });
    proc.on('error', (err)  => { if (!resolved) reject(err); });
    setTimeout(() => {
      if (!resolved) { try { proc.kill(); } catch (_) {} reject(new Error('Tunnel timed out')); }
    }, 30000);
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function init() {
  await ensureCloudflared();

  app.listen(PORT, async () => {
    console.log(`\n🩺 OpenClaw Doctor → http://localhost:${PORT}`);
    console.log(`🔐 Token: ${TOKEN}\n`);

    try {
      const url = await startTunnel(PORT);
      const full = `${url}/?token=${TOKEN}`;
      console.log('\n╔═══════════════════════════════════════════════════════╗');
      console.log('║       ✅  OPENCLAW DOCTOR IS ONLINE                    ║');
      console.log(`║  🌐 Public URL : ${url.padEnd(37)}║`);
      console.log(`║  🔐 Token      : ${TOKEN.substring(0, 37).padEnd(37)}║`);
      console.log(`║  🔗 Full link  : ${full.substring(0, 37).padEnd(37)}║`);
      console.log('╚═══════════════════════════════════════════════════════╝');
      console.log('\n  → Give the Full link to an AI agent to start remote repair.');
      console.log('  → Open the Full link in a browser for the visual terminal.\n');
    } catch (err) {
      console.error(`❌ Tunnel failed: ${err.message}`);
      console.log(`⚠️  Local only: http://localhost:${PORT}/?token=${TOKEN}`);
    }
  });
}

init();
