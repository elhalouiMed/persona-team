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

// ── Multi-run model ──────────────────────────────────────────────────────────
// Each /build-team invocation (in any chat window) is its own RUN, keyed by the
// `run` id on every event (falls back to 'default' for legacy single-run callers).
// Runs live side-by-side; the dashboard shows all of them and drills into any one.
const MAX_RUNS = 16;
const nowISO = () => new Date().toISOString();
const freshRun = (id, title) => ({
  runId: id, task: title || id, startedAt: nowISO(), updatedAt: nowISO(),
  status: 'running', phases: [], agents: {}, order: [], logs: [],
});
const runs = new Map();   // runId -> run state (Map keeps insertion order = age)
const clients = new Set();

const snapshot = () => `data: ${JSON.stringify({ kind: 'snapshot', runs: Object.fromEntries(runs) })}\n\n`;
function broadcast() {
  const payload = snapshot();
  for (const res of clients) { try { res.write(payload); } catch { /* ignore */ } }
}

function prune() {
  while (runs.size > MAX_RUNS) {
    // evict the oldest COMPLETE run; if none complete, the oldest overall.
    let victim = null;
    for (const [id, r] of runs) { if (r.status === 'complete') { victim = id; break; } }
    if (!victim) victim = runs.keys().next().value;
    runs.delete(victim);
  }
}

function apply(ev) {
  const runId = ev.run || 'default';

  if (ev.kind === 'remove') { if (ev.run) runs.delete(ev.run); return; }
  if (ev.kind === 'clear') { if (ev.scope === 'finished') { for (const [id, r] of [...runs]) if (r.status === 'complete') runs.delete(id); } else runs.clear(); return; }

  if (ev.kind === 'start') {
    const r = freshRun(runId, ev.task);
    r.phases = (ev.phases || []).map((name) => ({ name, status: 'pending' }));
    r.logs.push({ ts: nowISO(), message: `Run started: ${r.task}` });
    runs.delete(runId); runs.set(runId, r);   // (re)insert as the newest
    prune();
    return;
  }

  let r = runs.get(runId);
  if (!r) { r = freshRun(runId, runId); runs.set(runId, r); prune(); }  // event before start → stub it
  r.updatedAt = nowISO();

  switch (ev.kind) {
    case 'team':
      if (!r.agents[ev.id]) r.order.push(ev.id);
      r.agents[ev.id] = { id: ev.id, role: ev.role || '', phase: ev.phase || '', status: 'waiting', startedAt: null, endedAt: null, note: '' };
      break;
    case 'status': {
      if (!r.agents[ev.id]) { r.order.push(ev.id); r.agents[ev.id] = { id: ev.id, role: '', phase: ev.phase || '', status: 'waiting', startedAt: null, endedAt: null, note: '' }; }
      const a = r.agents[ev.id];
      a.status = ev.status;
      if (ev.phase) a.phase = ev.phase;
      if (ev.note) a.note = ev.note;
      if (ev.status === 'working' && !a.startedAt) a.startedAt = nowISO();
      if (ev.status === 'done' || ev.status === 'blocked') a.endedAt = nowISO();
      r.logs.push({ ts: nowISO(), message: `${ev.id} → ${ev.status}${ev.note ? ' · ' + ev.note : ''}` });
      break;
    }
    case 'phase': {
      const p = r.phases.find((x) => x.name === ev.name);
      if (p) p.status = ev.status; else r.phases.push({ name: ev.name, status: ev.status });
      break;
    }
    case 'log':
      r.logs.push({ ts: nowISO(), message: ev.message || '' });
      break;
    case 'complete':
      r.status = 'complete';
      r.logs.push({ ts: nowISO(), message: `✦ Delivered${ev.summary ? ': ' + ev.summary : ''}` });
      break;
    default:
      break;
  }
  if (r.logs.length > 300) r.logs = r.logs.slice(-300);
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
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ runs: Object.fromEntries(runs) })); return;
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
