#!/usr/bin/env node
// Persona Team CLI — pushes orchestration events to the live dashboard server.
// Usage (called by the /build-team command; safe to call by hand too):
//   node pt.mjs start "<task>" "Analyze,Design,Implement,Test,Deliver"
//   node pt.mjs team   <id> "<role>" <phase>
//   node pt.mjs status <id> <waiting|working|done|blocked> ["note"]
//   node pt.mjs phase  "<phase name>" <pending|active|done>
//   node pt.mjs log    "<message>"
//   node pt.mjs complete ["one-line delivery summary"]
// Never fails the caller: if the server isn't up, it warns and exits 0.

const PORT = process.env.PERSONA_TEAM_PORT || '7331';
const BASE = `http://localhost:${PORT}`;

// Each /build-team run gets a `run` id so multiple chat windows can share ONE
// dashboard without clobbering each other. Pass `--run <id>` (or set
// PERSONA_TEAM_RUN); defaults to 'default' for legacy single-run callers.
const argv = process.argv.slice(2);
let run = process.env.PERSONA_TEAM_RUN || 'default';
const ri = argv.indexOf('--run');
if (ri >= 0) { run = argv[ri + 1] || run; argv.splice(ri, 2); }
const [cmd, ...a] = argv;

function build() {
  switch (cmd) {
    case 'start':   return { kind: 'start',  task: a[0] || 'Untitled run', phases: (a[1] || '').split(',').map(s => s.trim()).filter(Boolean) };
    case 'team':    return { kind: 'team',   id: a[0], role: a[1] || '', phase: a[2] || '' };
    case 'status':  return { kind: 'status', id: a[0], status: a[1], note: a[2] || '' };
    case 'phase':   return { kind: 'phase',  name: a[0], status: a[1] || 'active' };
    case 'log':     return { kind: 'log',    message: a[0] || '' };
    case 'complete':return { kind: 'complete', summary: a[0] || '' };
    case 'remove':  return { kind: 'remove' };               // dismiss this --run from the board
    case 'clear':   return { kind: 'clear', scope: a[0] || '' }; // 'finished' = drop completed runs; else all
    default: return null;
  }
}

const ev = build();
if (!ev) { console.error('persona-team: unknown command. See pt.mjs header for usage.'); process.exit(2); }
ev.run = run;

try {
  const res = await fetch(`${BASE}/event`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ev),
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) console.warn(`persona-team: server responded ${res.status}`);
} catch {
  console.warn(`persona-team: dashboard server not reachable at ${BASE} (event skipped). Start it with: node ~/.claude/persona-team/server.mjs`);
}
process.exit(0);
