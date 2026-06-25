#Requires -Version 5.1
<#
  Persona Team — Windows installer (PowerShell). Mirrors install.sh.
  Installs the agents, slash commands, and the live dashboard into
  %USERPROFILE%\.claude. No admin rights needed. Requires Node 18+.
#>
$ErrorActionPreference = 'Stop'
function Info($m){ Write-Host "[ INFO ] $m" }
function Ok($m){   Write-Host "[  OK  ] $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[ WARN ] $m" -ForegroundColor Yellow }
function Die($m){  Write-Host "[ FAIL ] $m" -ForegroundColor Red; exit 1 }

# ── pre-flight: Node 18+ ────────────────────────────────────────────────────
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) { Die "Node.js not found. Install Node 18+ from https://nodejs.org and re-run." }
$major = [int](& node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
if ($major -lt 18) { Die "Node $(& node -v) found but Node 18+ is required. Upgrade at https://nodejs.org" }
Ok "Node $(& node -v) detected"

$claude = Join-Path $env:USERPROFILE ".claude"

# ── resolve source: local checkout vs download ──────────────────────────────
$here = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if ($here -and (Test-Path (Join-Path $here "dashboard\server.mjs")) -and (Test-Path (Join-Path $here "agents"))) {
  $src = $here
  Info "Checkout detected at $src — using local files."
} else {
  Info "Downloading Persona Team (main)..."
  $tmp = Join-Path $env:TEMP ("persona-team-" + [Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  $zip = Join-Path $tmp "src.zip"
  try {
    Invoke-WebRequest -UseBasicParsing -Uri "https://codeload.github.com/YOUR_GITHUB_USERNAME/persona-team/zip/refs/heads/main" -OutFile $zip
  } catch { Die "Download failed. Check your connection and that https://github.com/YOUR_GITHUB_USERNAME/persona-team exists." }
  Expand-Archive -Path $zip -DestinationPath $tmp -Force
  $src = Join-Path $tmp "persona-team-main"
  if (-not (Test-Path (Join-Path $src "dashboard\server.mjs"))) { Die "Downloaded archive looks wrong (no dashboard\server.mjs). Aborting before touching ~/.claude." }
}

# ── destination dirs ────────────────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path (Join-Path $claude "agents") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $claude "commands") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $claude "persona-team\public") | Out-Null
Ok "Destination dirs ready."

# ── backup-then-copy helper ─────────────────────────────────────────────────
$script:backups = @()
function Copy-One($s, $d) {
  if (-not (Test-Path $s)) { Warn "source missing, skipping: $s"; return }
  if (Test-Path $d) {
    if ((Get-FileHash $s).Hash -eq (Get-FileHash $d).Hash) { Info "unchanged: $d"; return }
    $bak = "$d.$(Get-Date -Format 'yyyyMMdd-HHmmss').bak"
    Copy-Item $d $bak; $script:backups += $bak; Info "backed up: $bak"
  }
  Copy-Item $s $d -Force; Ok "installed: $d"
}

# ── install payload ─────────────────────────────────────────────────────────
Get-ChildItem (Join-Path $src "agents") -Filter *.md | ForEach-Object {
  Copy-One $_.FullName (Join-Path $claude "agents\$($_.Name)")
}
Copy-One (Join-Path $src "commands\build-team.md")       (Join-Path $claude "commands\build-team.md")
Copy-One (Join-Path $src "commands\build-context.md")    (Join-Path $claude "commands\build-context.md")
Copy-One (Join-Path $src "PERSONA-TEAM.md")              (Join-Path $claude "PERSONA-TEAM.md")
Copy-One (Join-Path $src "dashboard\server.mjs")          (Join-Path $claude "persona-team\server.mjs")
Copy-One (Join-Path $src "dashboard\pt.mjs")             (Join-Path $claude "persona-team\pt.mjs")
Copy-One (Join-Path $src "dashboard\public\index.html")  (Join-Path $claude "persona-team\public\index.html")

# ── success summary ─────────────────────────────────────────────────────────
Write-Host ""
Ok "Persona Team installed."
if ($script:backups.Count -gt 0) {
  Warn "$($script:backups.Count) file(s) backed up:"
  $script:backups | ForEach-Object { Write-Host "    $_" }
}
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open Claude Code in any project."
Write-Host "  2. (recommended) Run  /build-context   to tailor domain agents to your project."
Write-Host "  3. Run                /build-team <task>"
Write-Host "  4. Live dashboard:    http://localhost:7331"
Write-Host ""
Write-Host "Start the dashboard manually:"
Write-Host "  node `"$claude\persona-team\server.mjs`""
