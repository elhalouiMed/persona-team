# Persona Team — your reusable multi-agent dev crew

A global toolkit that turns any task into a team of expert persona agents that plan, split the work, run in parallel, and deliver one result — all on your **Claude Code subscription (no API keys)**, in **every project** on this machine.

Installed 2026-06-19.

## What's installed (global → works in Komercy, LinkoJob, Linkopus, everywhere)

**Personas** — `~/.claude/agents/*.md` (one file = one expert):

| Persona (`agentType`) | Role | Model |
|---|---|---|
| `business-analyst` | Requirements, user stories, scope | sonnet |
| `product-owner` | Prioritization, MVP, sequencing | sonnet |
| `software-architect` | Technical design + work breakdown | opus |
| `team-lead` | Coordinate, assign, integrate delivery | sonnet |
| `backend-senior` | Server-side implementation | opus |
| `frontend-senior` | Client-side implementation | opus |
| `fullstack-senior` | End-to-end vertical slices | opus |
| `devops-engineer` | CI/CD, deploy, infra, secrets | sonnet |
| `qa-test-senior` | Tests + adversarial verification | opus |
**Orchestrator** — `~/.claude/commands/build-team.md` → the `/build-team` command.

**Context builder** — `~/.claude/commands/build-context.md` → the `/build-context` command. Run it FIRST in a project: it deep-analyzes the codebase, asks a few targeted questions, then generates **project-scoped domain-expert personas** (e.g. `banking-domain-expert`, `compliance-officer`, `commercial-strategist`, plus an end-user persona) into `./.claude/agents/` and a brief at `./.claude/persona-team/context.md`. `/build-team` auto-loads that context + those personas for a domain-aware run.

## How to use it (Tier 1 — today, in VS Code)

In any project, run:

```
/build-team add a CSV export button to the prospects table, with backend endpoint and tests
```
or a business / domain task (after `/build-context` has tailored the experts):
```
/build-team produce a technical + functional audit of the billing module with a prioritized roadmap
```

What happens:
1. The orchestrator **classifies** the task (software / business / mixed).
2. It **picks the right personas** and shows you the team + plan.
3. It runs a **Workflow** that dispatches sub-tasks — **independent ones in parallel** (up to 16 agents at once), dependent ones pipelined.
4. It **integrates** everything into one delivery and reports an honest status.

### Watch the live dashboard (Tier 2 — installed)
When you run `/build-team`, it **auto-starts a local dashboard** and prints a URL:

**▶ http://localhost:7331**

Open it in your browser and watch the team work in real time — a futuristic pipeline where each persona is a card that moves through phase columns and lights up **queued → working (glowing, live timer) → done**, with live counts and an activity feed. It updates instantly over SSE. The page only *reads* events from a tiny local Node server; **no API keys, nothing leaves your machine.**

- Change the port: `PERSONA_TEAM_PORT=8080` before launching.
- Stop the server: `pkill -f persona-team/server.mjs`
- The native `/workflows` view still works too, if you ever orchestrate via the Workflow engine.

You can also just call a single persona directly, e.g.:
```
Use the software-architect agent to propose a data model for the billing module.
```

## Tuning
- **Edit a persona** anytime — just open its `~/.claude/agents/*.md` file and adjust the prompt, tools, or `model`.
- **Quota:** parallel agents burn your weekly compute quota ~Nx faster (10 agents ≈ 10×). For heavy parallel runs, Max 5x / 20x is recommended. To save quota, switch some personas from `opus` → `sonnet` in their frontmatter.
- **Per-project override:** drop a same-named file in a repo's `.claude/agents/` to specialize a persona for that project (it overrides the global one there).

## Files
- `~/.claude/agents/*.md` — the 10 personas
- `~/.claude/commands/build-team.md` — the `/build-team` orchestrator
- `~/.claude/persona-team/server.mjs` — live dashboard server (zero deps)
- `~/.claude/persona-team/public/index.html` — the dashboard UI
- `~/.claude/persona-team/pt.mjs` — event helper the orchestrator calls

## Roadmap
- **Tier 1:** native personas + `/build-team`. ✅ installed.
- **Tier 2:** live local web dashboard (server + SSE + futuristic page). ✅ installed.
- **Tier 3 (future):** full standalone app on the Agent SDK with subscription auth, persistence, history, and finer per-step agent telemetry.
