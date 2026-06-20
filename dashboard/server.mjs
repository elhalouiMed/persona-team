// Persona Team — live dashboard server (zero dependencies, Node 18+).
// Receives orchestration events via POST /event and streams the full state
// to the browser over SSE (GET /events). Serves the dashboard at /.
// Runs on your machine only — it never talks to any AI API. No keys needed.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PORT = Number(process.env.PERSONA_TEAM_PORT || 7331);
const HERE = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = join(HERE, 'public', 'index.html');
const SERVER_ID = 'persona-team-server-v1';

const freshState = () => ({
  runId: null, task: null, startedAt: null, status: 'idle',
  phases: [], agents: {}, order: [], logs: [],
});
let state = freshState();
const clients = new Set();
const nowISO = () => new Date().toISOString();

const snapshot = () => `data: ${JSON.stringify({ kind: 'snapshot', state })}\n\n`;
function broadcast() {
  const payload = snapshot();
  for (const res of clients) { try { res.write(payload); } catch { /* ignore */ } }
}

function apply(ev) {
  switch (ev.kind) {
    case 'start':
      state = freshState();
      state.startedAt = nowISO();
      state.runId = ev.runId || ('r' + Date.now().toString(36));
      state.task = ev.task || 'Untitled run';
      state.status = 'running';
      state.phases = (ev.phases || []).map((name) => ({ name, status: 'pending' }));
      state.logs.push({ ts: nowISO(), message: `Run started: ${state.task}` });
      break;
    case 'team':
      if (!state.agents[ev.id]) state.order.push(ev.id);
      state.agents[ev.id] = {
        id: ev.id, role: ev.role || '', phase: ev.phase || '',
        status: 'waiting', startedAt: null, endedAt: null, note: '',
      };
      break;
    case 'status': {
      if (!state.agents[ev.id]) {
        state.order.push(ev.id);
        state.agents[ev.id] = { id: ev.id, role: '', phase: ev.phase || '', status: 'waiting', startedAt: null, endedAt: null, note: '' };
      }
      const a = state.agents[ev.id];
      a.status = ev.status;
      if (ev.phase) a.phase = ev.phase;
      if (ev.note) a.note = ev.note;
      if (ev.status === 'working' && !a.startedAt) a.startedAt = nowISO();
      if (ev.status === 'done' || ev.status === 'blocked') a.endedAt = nowISO();
      state.logs.push({ ts: nowISO(), message: `${ev.id} → ${ev.status}${ev.note ? ' · ' + ev.note : ''}` });
      break;
    }
    case 'phase': {
      const p = state.phases.find((x) => x.name === ev.name);
      if (p) p.status = ev.status; else state.phases.push({ name: ev.name, status: ev.status });
      break;
    }
    case 'log':
      state.logs.push({ ts: nowISO(), message: ev.message || '' });
      break;
    case 'complete':
      state.status = 'complete';
      state.logs.push({ ts: nowISO(), message: `✦ Delivered${ev.summary ? ': ' + ev.summary : ''}` });
      break;
    default:
      break;
  }
  if (state.logs.length > 300) state.logs = state.logs.slice(-300);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/__id') {
    res.writeHead(200, { 'content-type': 'text/plain' }); res.end(SERVER_ID); return;
  }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    try {
      const html = await readFile(HTML_PATH);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html);
    } catch { res.writeHead(500); res.end('dashboard html missing'); }
    return;
  }
  if (req.method === 'GET' && url.pathname === '/state') {
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(state)); return;
  }
  if (req.method === 'GET' && url.pathname === '/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream', 'cache-control': 'no-cache',
      connection: 'keep-alive', 'access-control-allow-origin': '*',
    });
    res.write(snapshot());
    clients.add(res);
    const keepAlive = setInterval(() => { try { res.write(': keep-alive\n\n'); } catch { /* ignore */ } }, 15000);
    req.on('close', () => { clearInterval(keepAlive); clients.delete(res); });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/event') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try { apply(JSON.parse(body || '{}')); broadcast(); res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}'); }
      catch { res.writeHead(400); res.end('{"ok":false}'); }
    });
    return;
  }
  res.writeHead(404); res.end('not found');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`[persona-team] port ${PORT} already in use — reusing the running dashboard at http://localhost:${PORT}`);
    process.exit(0);
  }
  console.error('[persona-team] server error:', e); process.exit(1);
});

server.listen(PORT, () => {
  console.log(`[persona-team] dashboard live → http://localhost:${PORT}`);
});
