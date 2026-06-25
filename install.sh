#!/usr/bin/env bash
# install.sh — one-command installer for Persona Team Claude Code add-on
# Supports macOS (BSD) and Linux (GNU). Requires Node 18+. No sudo needed.
set -euo pipefail

# ── colour helpers (graceful no-op if tput absent) ──────────────────────────
_bold() { printf '%s' "$(tput bold 2>/dev/null || true)$*$(tput sgr0 2>/dev/null || true)"; }
_ok()   { printf '[  OK  ] %s\n' "$*"; }
_info() { printf '[ INFO ] %s\n' "$*"; }
_warn() { printf '[ WARN ] %s\n' "$*" >&2; }
_err()  { printf '[ FAIL ] %s\n' "$*" >&2; exit 1; }

# ── pre-flight: Node ─────────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  _err "Node.js is not installed. Install Node 18+ from https://nodejs.org and re-run."
fi

NODE_MAJOR=$(node -e 'process.stdout.write(String(process.versions.node.split(".")[0]))')
if [ "$NODE_MAJOR" -lt 18 ]; then
  _err "Node $(node --version) found but Node 18+ is required. Upgrade at https://nodejs.org"
fi
_ok "Node $(node --version) detected"

# ── pre-flight: root warning ─────────────────────────────────────────────────
if [ "$(id -u)" -eq 0 ]; then
  _warn "Running as root. Files will be installed into root's home. This is unusual — Ctrl-C now to abort if unintended."
fi

# ── locate source ────────────────────────────────────────────────────────────
# Running from a checkout? detect by sibling dashboard/server.mjs + agents/
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC=""

if [ -f "$SCRIPT_DIR/dashboard/server.mjs" ] && [ -d "$SCRIPT_DIR/agents" ]; then
  SRC="$SCRIPT_DIR"
  _info "Checkout detected at $SRC — using local files."
else
  _info "No local checkout detected. Downloading from GitHub…"
  TMP_DIR="$(mktemp -d)"
  # shellcheck disable=SC2064
  trap "rm -rf '$TMP_DIR'" EXIT

  TARBALL_URL="https://codeload.github.com/YOUR_GITHUB_USERNAME/persona-team/tar.gz/refs/heads/main"
  if ! curl -fsSL "$TARBALL_URL" | tar -xz -C "$TMP_DIR"; then
    _err "Download/extract failed. Check your connection and that https://github.com/YOUR_GITHUB_USERNAME/persona-team exists."
  fi

  # The tarball extracts to persona-team-main/
  EXTRACTED="$TMP_DIR/persona-team-main"
  if [ ! -f "$EXTRACTED/dashboard/server.mjs" ] || [ ! -d "$EXTRACTED/agents" ]; then
    _err "Extracted archive looks wrong (missing dashboard/server.mjs or agents/). Aborting before touching ~/.claude."
  fi
  SRC="$EXTRACTED"
  _ok "Download and extract succeeded."
fi

# ── ensure destination directories ──────────────────────────────────────────
CLAUDE_DIR="$HOME/.claude"
mkdir -p \
  "$CLAUDE_DIR/agents" \
  "$CLAUDE_DIR/commands" \
  "$CLAUDE_DIR/persona-team/public"
_ok "Destination dirs ready."

# ── backup-then-copy helper ──────────────────────────────────────────────────
BACKUPS=()

copy_file() {
  local src="$1"
  local dst="$2"
  if [ ! -f "$src" ]; then
    _warn "Source not found, skipping: $src"
    return
  fi
  if [ -f "$dst" ]; then
    if cmp -s "$src" "$dst"; then
      _info "unchanged: $dst"
      return
    fi
    local stamp
    stamp="$(date '+%Y%m%d-%H%M%S')"
    local bak="${dst}.${stamp}.bak"
    cp -p "$dst" "$bak"
    BACKUPS+=("$bak")
    _info "backed up: $bak"
  fi
  cp -p "$src" "$dst"
  _ok "installed: $dst"
}

# ── install files ────────────────────────────────────────────────────────────
# agents
for md in "$SRC/agents/"*.md; do
  [ -f "$md" ] || continue
  copy_file "$md" "$CLAUDE_DIR/agents/$(basename "$md")"
done

# commands
copy_file "$SRC/commands/build-team.md" "$CLAUDE_DIR/commands/build-team.md"
copy_file "$SRC/commands/build-context.md" "$CLAUDE_DIR/commands/build-context.md"

# usage reference
copy_file "$SRC/PERSONA-TEAM.md" "$CLAUDE_DIR/PERSONA-TEAM.md"

# dashboard scripts
copy_file "$SRC/dashboard/server.mjs" "$CLAUDE_DIR/persona-team/server.mjs"
copy_file "$SRC/dashboard/pt.mjs"     "$CLAUDE_DIR/persona-team/pt.mjs"

# dashboard frontend (may not exist yet — the frontend engineer writes it separately)
copy_file "$SRC/dashboard/public/index.html" "$CLAUDE_DIR/persona-team/public/index.html"

# ── success summary ──────────────────────────────────────────────────────────
printf '\n'
printf '%s\n' "$(_bold 'Persona Team installed successfully.')"

if [ "${#BACKUPS[@]}" -gt 0 ]; then
  printf '\nBackups created:\n'
  for b in "${BACKUPS[@]}"; do
    printf '  %s\n' "$b"
  done
fi

printf '\n%s\n' "$(_bold 'Next steps')"
printf '  1. Open Claude Code in any project.\n'
printf '  2. Run:  /build-team <describe your task>\n'
printf '  3. Live dashboard: http://localhost:7331\n'
printf '\nTo start the dashboard server manually:\n'
printf '  node ~/.claude/persona-team/server.mjs\n'
printf '\nOr use the bundled helper:\n'
printf '  bash %s/start.sh\n' "$SCRIPT_DIR"
printf '\n'
