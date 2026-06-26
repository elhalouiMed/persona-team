<p align="center">
  <img src="docs/logo.svg" width="52" alt="Linkopus" />
</p>

<h1 align="center">Persona Team</h1>

<p align="center">
  <b>A senior AI team inside Claude Code — it plans, splits the work, builds in parallel, and ships.</b><br/>
  You watch it happen on a live graph. No API keys — just your Claude Code subscription.
</p>

<p align="center">
  <img src="docs/dashboard.png" width="880" alt="Persona Team — live agent graph" />
</p>

---

## What it is

Two commands turn Claude Code into a coordinated team of expert agents:

- **`/build-context`** — deep-scans your project, asks a few sharp questions, then generates **domain-aware experts** (fintech → banking & compliance; commercial → sales & pricing; …) plus a shared project brief.
- **`/build-team <task>`** — assembles the right crew (analyst → architect → backend ∥ frontend ∥ devops → QA → lead), runs them **in parallel**, and delivers — live on a dashboard.

Fire it in several chats at once: each task becomes its own team on one board.

## Quickstart

**macOS / Linux**
```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/persona-team/main/install.sh | bash
```

**Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/persona-team/main/install.ps1 | iex
```

> Prefer to clone? `git clone … && bash install.sh` (or `install.ps1`). Requires a **Claude Code subscription** + **Node 18+**.

Then, in **any** project:

```
/build-context                                    # optional — tailors the team to your domain
/build-team add a CSV export to the prospects table, with tests
```

Open **http://localhost:7331** and watch them work.

## The dashboard

<p align="center">
  <img src="docs/multi-run.png" width="880" alt="Multiple runs on one board" />
</p>

- **Org-chart graph** — orchestrator → phases → agent robots, each with its role icon.
- **Live** — bots glow while working, links flow, finished turns green.
- **Multi-run** — every `/build-team` (in any chat) is its own task on the runs bar; click a chip to drill in, `×` to dismiss.
- **Inspect** — hover a bot for its logs, click for its config (model, tools, role).
- Dark, fast, zero external assets — one self-contained file.

## What gets installed

All **global** — nothing inside your project:

`~/.claude/agents/*.md` · `~/.claude/commands/{build-team,build-context}.md` · `~/.claude/persona-team/` (the dashboard)

Re-running the installer backs up anything it changes. To stop the dashboard: `pkill -f persona-team/server.mjs`.

## Cost

Runs entirely on your Claude Code subscription — no API keys, nothing leaves your machine. Opus-tier personas use more weekly quota than Sonnet ones; the orchestrator only staffs what the task actually needs.

---

<p align="center">
  <sub>Built by <b>Mohammed ELHALOUI</b> · <a href="https://linkopus.com">linkopus.com</a> · MIT</sub><br/>
  <sub>Persona Team built its own release — watched live on its own dashboard.</sub>
</p>
