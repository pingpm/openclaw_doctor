/**
 * OpenClaw Doctor - Remote Diagnostic Server
 * Starts a local HTTP server and creates a Cloudflare tunnel to expose it publicly.
 * Provides a web terminal + OpenClaw health dashboard accessible from anywhere.
 */

const express = require('express');
const { bin, install } = require('cloudflared');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const crypto = require('crypto');
const os = require('os');

const app = express();

// Config
const PORT = parseInt(process.env.PORT) || 12222;
const TOKEN = process.env.TOKEN || crypto.randomBytes(16).toString('hex');
const STATE_FILE = path.join(__dirname, '.doctor-state.json');

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Auth Middleware ─────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const t = req.headers['x-doctor-token'] || req.query.token;
  if (t === TOKEN) return next();
  res.status(401).json({ error: 'Unauthorized. Invalid or missing token.' });
};

// ─── Public Endpoints ─────────────────────────────────────────────────────────
app.get('/api/ping', (req, res) => {
  res.json({ status: 'alive', app: 'openclaw-doctor', version: '1.0.0' });
});

// ─── Status Endpoint ──────────────────────────────────────────────────────────
app.get('/api/status', auth, (req, res) => {
  const mode = req.query.mode || 'status';
  const cmd = mode === 'deep' ? 'openclaw status --deep' : 'openclaw status';

  exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
    res.json({
      command: cmd,
      stdout: stdout || '',
      stderr: stderr || '',
      code: error ? (error.code ?? 1) : 0,
      timestamp: new Date().toISOString()
    });
  });
});

// ─── Execute Command ──────────────────────────────────────────────────────────
app.post('/api/exec', auth, (req, res) => {
  const { cmd, cwd, timeout = 30000 } = req.body;
  if (!cmd || typeof cmd !== 'string') {
    return res.status(400).json({ error: 'cmd (string) is required' });
  }

  const workDir = cwd || os.homedir();
  console.log(`[exec] ${cmd}  (cwd: ${workDir})`);

  exec(cmd, { cwd: workDir, timeout }, (error, stdout, stderr) => {
    res.json({
      stdout: stdout || '',
      stderr: stderr || '',
      code: error ? (error.code ?? 1) : 0,
      signal: error?.signal || null
    });
  });
});

// ─── File Read ────────────────────────────────────────────────────────────────
app.get('/api/files/read', auth, (req, res) => {
  const { filePath } = req.query;
  if (!filePath) return res.status(400).json({ error: 'filePath query param is required' });

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ filePath, data, size: Buffer.byteLength(data) });
  });
});

// ─── File Write ───────────────────────────────────────────────────────────────
app.post('/api/files/write', auth, (req, res) => {
  const { filePath, content } = req.body;
  if (!filePath || content === undefined) {
    return res.status(400).json({ error: 'filePath and content are required' });
  }

  // Ensure directory exists
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFile(filePath, content, 'utf8', (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, filePath, size: Buffer.byteLength(content) });
  });
});

// ─── File List ────────────────────────────────────────────────────────────────
app.get('/api/files/list', auth, (req, res) => {
  const { dirPath = os.homedir() } = req.query;

  fs.readdir(dirPath, { withFileTypes: true }, (err, entries) => {
    if (err) return res.status(500).json({ error: err.message });
    const items = entries.map(e => ({
      name: e.name,
      type: e.isDirectory() ? 'dir' : 'file',
      path: path.join(dirPath, e.name)
    }));
    res.json({ dirPath, items });
  });
});

// ─── State ────────────────────────────────────────────────────────────────────
let tunnelUrl = '';
let tunnelProcess = null;

function saveState(url) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      tunnelUrl: url,
      token: TOKEN,
      port: PORT,
      startedAt: new Date().toISOString()
    }, null, 2));
  } catch (e) { /* ignore */ }
}

// ─── Cloudflared Binary ───────────────────────────────────────────────────────
async function ensureCloudflared() {
  if (fs.existsSync(bin)) {
    const stat = fs.statSync(bin);
    if (stat.size > 0) return;
  }

  console.log('📦 cloudflared not found — installing...');
  try {
    await install(bin);
    console.log('✅ cloudflared installed (official).');
    return;
  } catch (err) {
    console.warn('⚠️  Official install failed, trying mirror...');
  }

  // Mirror fallback (for China / restricted networks)
  const platform = process.platform;
  const arch = process.arch;
  let binaryName = '';

  if (platform === 'linux') {
    binaryName = arch === 'arm64' ? 'cloudflared-linux-arm64' : 'cloudflared-linux-amd64';
  } else if (platform === 'win32') {
    binaryName = arch === 'x64' ? 'cloudflared-windows-amd64.exe' : 'cloudflared-windows-386.exe';
  } else {
    // macOS: best effort with official only
    throw new Error('Please manually install cloudflared: brew install cloudflared');
  }

  const mirrorUrl = `https://ghproxy.net/https://github.com/cloudflare/cloudflared/releases/latest/download/${binaryName}`;
  const axios = require('axios');
  const writer = fs.createWriteStream(bin);
  const resp = await axios({ method: 'get', url: mirrorUrl, responseType: 'stream' });
  resp.data.pipe(writer);
  await new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
  fs.chmodSync(bin, '755');
  console.log('✅ cloudflared installed (mirror).');
}

// ─── Start Tunnel ─────────────────────────────────────────────────────────────
function startTunnel(localPort) {
  return new Promise((resolve, reject) => {
    const absbin = path.resolve(bin);
    console.log(`🚀 Starting Cloudflare tunnel → localhost:${localPort}`);

    tunnelProcess = spawn(absbin, ['tunnel', '--url', `http://localhost:${localPort}`], {
      shell: process.platform === 'win32'
    });

    let resolved = false;

    tunnelProcess.stderr.on('data', (data) => {
      const out = data.toString();
      const match = out.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !resolved) {
        resolved = true;
        tunnelUrl = match[0];
        saveState(tunnelUrl);
        resolve(tunnelUrl);
      }
    });

    tunnelProcess.on('exit', (code) => {
      console.log(`ℹ️  Tunnel exited (code ${code})`);
      tunnelUrl = '';
    });

    tunnelProcess.on('error', (err) => {
      if (!resolved) reject(err);
    });

    setTimeout(() => {
      if (!resolved) {
        try { tunnelProcess.kill(); } catch (_) {}
        reject(new Error('Tunnel startup timed out (30s)'));
      }
    }, 30000);
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function init() {
  await ensureCloudflared();

  app.listen(PORT, async () => {
    console.log(`\n🩺 OpenClaw Doctor running → http://localhost:${PORT}`);
    console.log(`🔐 Admin token: ${TOKEN}\n`);

    try {
      const url = await startTunnel(PORT);
      console.log('\n╔═══════════════════════════════════════════════════════╗');
      console.log('║          ✅ OPENCLAW DOCTOR IS ONLINE                  ║');
      console.log(`║  🌐 Public URL : ${url.padEnd(37)}║`);
      console.log(`║  🔐 Token      : ${TOKEN.substring(0, 37).padEnd(37)}║`);
      console.log(`║  🔗 Full link  : ${(url + '/?token=' + TOKEN).substring(0, 37)}...║`);
      console.log('╚═══════════════════════════════════════════════════════╝\n');
    } catch (err) {
      console.error(`❌ Tunnel failed: ${err.message}`);
      console.log(`⚠️  Control panel is local-only: http://localhost:${PORT}/?token=${TOKEN}`);
    }
  });
}

init();
