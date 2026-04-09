/**
 * OpenClaw Doctor v1.1
 *
 * GET  /                    → status dashboard (browser UI)
 * GET  /?token=TOKEN        → AI-GUIDE.md (plain text, for AI agents)
 * POST /?token=TOKEN        → run shell command, returns {stdout,stderr,code}
 * POST /restart?token=TOKEN → stop+restart doctor, regenerate token
 * GET  /status?token=TOKEN  → run `openclaw status`, return raw output
 * GET  /task/:id?token=TOKEN→ poll long-running task result
 */

const express    = require('express');
const { bin, install } = require('cloudflared');
const cors       = require('cors');
const fs         = require('fs');
const path       = require('path');
const { exec, spawn } = require('child_process');
const crypto     = require('crypto');
const os         = require('os');

const app = express();

const PORT       = parseInt(process.env.PORT || process.env.OCD_PORT) || 12222;
let   TOKEN      = process.env.TOKEN || crypto.randomBytes(16).toString('hex');
const STATE_FILE = path.join(__dirname, '.doctor-state.json');
const GUIDE_FILE = path.join(__dirname, 'public', 'AI-GUIDE.md');
const PID_FILE   = path.join(__dirname, 'doctor.pid');

// In-memory task store for long-running commands
const tasks = new Map(); // id -> { status, stdout, stderr, code, startedAt }

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Auth ─────────────────────────────────────────────────────────────────────
function checkToken(req) {
  const t = req.headers['x-doctor-token'] || req.query.token;
  return t === TOKEN;
}

function requireToken(req, res) {
  if (!checkToken(req)) {
    res.status(401).json({ error: 'Unauthorized. Pass ?token=TOKEN' });
    return false;
  }
  return true;
}

// ─── GET / ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  // With token → return AI guide (plain text for AI agents)
  if (req.query.token) {
    if (!checkToken(req)) return res.status(401).type('text').send('Unauthorized.');
    return fs.readFile(GUIDE_FILE, 'utf8', (err, data) => {
      res.type('text/markdown').send(err
        ? '# OpenClaw Doctor\nPOST /?token=TOKEN with {"cmd":"shell command"}'
        : data);
    });
  }
  // No token → serve dashboard UI
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── GET /status ──────────────────────────────────────────────────────────────
app.get('/status', (req, res) => {
  if (!requireToken(req, res)) return;
  exec('openclaw status', { timeout: 30000 }, (error, stdout, stderr) => {
    res.json({
      installed: !stderr.includes('command not found') && !stderr.includes('not found'),
      stdout: stdout || '',
      stderr: stderr || '',
      code: error ? (error.code ?? 1) : 0
    });
  });
});

// ─── POST / — execute command ─────────────────────────────────────────────────
app.post('/', (req, res) => {
  if (!requireToken(req, res)) return;

  const { cmd, cwd, timeout = 30000, async: isAsync = false } = req.body || {};
  if (!cmd || typeof cmd !== 'string') {
    return res.status(400).json({
      error: 'Body must be JSON with "cmd" field.',
      example: { cmd: 'openclaw status' }
    });
  }

  const workDir = cwd || os.homedir();
  console.log(`[exec] ${cmd}`);

  // Async mode: return task ID immediately, run in background
  if (isAsync) {
    const id = crypto.randomBytes(8).toString('hex');
    tasks.set(id, { status: 'running', stdout: '', stderr: '', code: null, startedAt: Date.now() });
    exec(cmd, { cwd: workDir, timeout }, (error, stdout, stderr) => {
      tasks.set(id, {
        status: 'done',
        stdout: stdout || '',
        stderr: stderr || '',
        code: error ? (error.code ?? 1) : 0,
        startedAt: tasks.get(id).startedAt,
        finishedAt: Date.now()
      });
    });
    return res.json({ taskId: id, status: 'running', poll: `/task/${id}?token=${TOKEN}` });
  }

  // Sync mode (default)
  exec(cmd, { cwd: workDir, timeout }, (error, stdout, stderr) => {
    res.json({
      stdout: stdout || '',
      stderr: stderr || '',
      code: error ? (error.code ?? 1) : 0,
      signal: error?.signal || null
    });
  });
});

// ─── GET /task/:id — poll async task ─────────────────────────────────────────
app.get('/task/:id', (req, res) => {
  if (!requireToken(req, res)) return;
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  res.json(task);
});

// ─── POST /restart — regenerate token and restart ────────────────────────────
app.post('/restart', (req, res) => {
  if (!requireToken(req, res)) return;
  TOKEN = crypto.randomBytes(16).toString('hex');
  saveState(tunnelUrl);
  res.json({ ok: true, newToken: TOKEN, message: 'Token regenerated. Use the new token for all future requests.' });
});

// ─── GET /info — current session info (for dashboard) ────────────────────────
app.get('/info', (req, res) => {
  if (!requireToken(req, res)) return;
  res.json({ token: TOKEN, tunnelUrl, port: PORT, pid: process.pid });
});

// ─── State ────────────────────────────────────────────────────────────────────
let tunnelUrl = '';

function saveState(url) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      tunnelUrl: url, token: TOKEN, port: PORT,
      startedAt: new Date().toISOString()
    }, null, 2));
  } catch (_) {}
}

// ─── Cloudflared ──────────────────────────────────────────────────────────────
async function ensureCloudflared() {
  if (fs.existsSync(bin) && fs.statSync(bin).size > 0) return;
  console.log('📦 Installing cloudflared...');
  try { await install(bin); return; } catch (_) {}

  const { platform, arch } = process;
  if (platform === 'darwin') throw new Error('Run: brew install cloudflared');
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
}

function startTunnel(localPort) {
  return new Promise((resolve, reject) => {
    // Prefer system cloudflared (brew) over npm bundled binary
    const { execSync } = require('child_process');
    let cfBin = path.resolve(bin);
    try {
      const sysBin = execSync('which cloudflared', { encoding: 'utf8' }).trim();
      if (sysBin) cfBin = sysBin;
    } catch (_) {}

    console.log(`🚇 Using cloudflared: ${cfBin}`);
    const proc = spawn(cfBin, ['tunnel', '--url', `http://localhost:${localPort}`], {
      shell: process.platform === 'win32'
    });
    let resolved = false;
    let buf = '';
    const onData = (data) => {
      buf += data.toString();
      const m = buf.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m && !resolved) {
        resolved = true; tunnelUrl = m[0];
        saveState(tunnelUrl); resolve(tunnelUrl);
      }
    };
    proc.stderr.on('data', onData);
    proc.stdout.on('data', onData);
    proc.on('exit',  () => { tunnelUrl = ''; });
    proc.on('error', (err) => { if (!resolved) reject(err); });
    setTimeout(() => { if (!resolved) { try { proc.kill(); } catch (_) {} reject(new Error('Tunnel timed out')); } }, 60000);
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function init() {
  await ensureCloudflared();
  fs.writeFileSync(PID_FILE, String(process.pid));

  app.listen(PORT, async () => {
    console.log(`\n🩺 OpenClaw Doctor → http://localhost:${PORT}`);
    console.log(`🔐 Token: ${TOKEN}\n`);
    try {
      const url = await startTunnel(PORT);
      const full = `${url}/?token=${TOKEN}`;
      console.log('\n✅  OPENCLAW DOCTOR IS ONLINE');
      console.log('─────────────────────────────────────────────────────────');
      console.log(`🌐  Public URL  : ${url}`);
      console.log(`🔐  Token       : ${TOKEN}`);
      console.log(`🔗  Full link   : ${full}`);
      console.log('─────────────────────────────────────────────────────────');
      console.log('→  Give the Full link to an AI agent to start remote repair.');
      console.log('→  Open the Public URL in a browser for the visual dashboard.');
      console.log(`→  To stop: bash ~/.openclaw-doctor/install.sh stop\n`);
    } catch (err) {
      console.error(`❌ Tunnel failed: ${err.message}`);
      console.log(`⚠️  Local only: http://localhost:${PORT}/?token=${TOKEN}`);
    }
  });
}

init();
