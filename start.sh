#!/usr/bin/env bash
# start.sh — launch (or reuse) the Persona Team live dashboard.
# Reads PERSONA_TEAM_PORT (default 7331). Requires Node 18+.
set -euo pipefail

PORT="${PERSONA_TEAM_PORT:-7331}"
SERVER="$HOME/.claude/persona-team/server.mjs"
URL="http://localhost:${PORT}"
SERVER_ID="persona-team-server-v1"

if [ ! -f "$SERVER" ]; then
  printf '[ FAIL ] Dashboard server not found at %s\n' "$SERVER" >&2
  printf '         Run install.sh first.\n' >&2
  exit 1
fi

# Probe whether a persona-team server is already listening
if curl -sf --max-time 2 "$URL/__id" 2>/dev/null | grep -q "$SERVER_ID"; then
  printf '[ INFO ] Dashboard already running -> %s\n' "$URL"
else
  nohup node "$SERVER" >/dev/null 2>&1 &
  printf '[  OK  ] Dashboard live -> %s\n' "$URL"
fi

# Best-effort browser open (never fail the script)
if command -v open >/dev/null 2>&1; then
  open "$URL" || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" || true
fi
