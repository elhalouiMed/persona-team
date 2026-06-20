# Pre-launch checklist — Persona Team

Work through this list top-to-bottom before pushing to GitHub.

---

## 1. Replace YOUR_GITHUB_USERNAME everywhere

There are **8 occurrences** across **6 files**:

| File | Count |
|---|---|
| `install.sh` | 2 |
| `README.md` | 2 |
| `LINKEDIN.md` | 1 |
| `package.json` | 1 |
| `LICENSE` | 1 |
| `dashboard/public/index.html` | 1 |

Verify first:

```bash
grep -rn YOUR_GITHUB_USERNAME /Users/mac/workspace/persona-team
```

Replace all at once (macOS `sed` requires the empty-string argument after `-i`):

```bash
cd /Users/mac/workspace/persona-team
USERNAME="your-actual-github-username"
find . -not -path './.git/*' -type f \
  -exec sed -i '' "s/YOUR_GITHUB_USERNAME/${USERNAME}/g" {} +
```

On Linux (GNU sed, no empty-string argument needed):

```bash
find . -not -path './.git/*' -type f \
  -exec sed -i "s/YOUR_GITHUB_USERNAME/${USERNAME}/g" {} +
```

Confirm zero remaining occurrences:

```bash
grep -rl YOUR_GITHUB_USERNAME . | grep -v .git
# should print nothing
```

---

## 2. Update the LICENSE copyright name

`LICENSE` line 3 currently reads:

```
Copyright (c) 2026 YOUR_GITHUB_USERNAME
```

After the sed above it will read `Copyright (c) 2026 your-actual-github-username`. If you prefer a real name or org name instead of your handle, edit it manually:

```bash
open /Users/mac/workspace/persona-team/LICENSE
```

---

## 3. Confirm docs/dashboard.png exists

The README hero (`README.md` line 7) references `docs/dashboard.png`. The `docs/` directory does not currently exist in the repo.

**Option A — generate from the running dashboard (recommended):**

```bash
# Start the dashboard
node /Users/mac/workspace/persona-team/dashboard/server.mjs &

# Open http://localhost:7331 in your browser, then take a full-page screenshot
# On macOS: Cmd+Shift+4, Space, click the browser window → saves to Desktop
# Then:
mkdir -p /Users/mac/workspace/persona-team/docs
cp ~/Desktop/screenshot.png /Users/mac/workspace/persona-team/docs/dashboard.png
```

**Option B — generate programmatically (requires `node-screenshots` or Puppeteer):**

```bash
npm install -g puppeteer-cli   # or use your preferred headless-browser tool
```

Until the file exists, the README hero image will be a broken link on GitHub. Do not publish without it.

---

## 4. Git setup and push

```bash
cd /Users/mac/workspace/persona-team

# If not already a git repo:
git init
git branch -M main

# Stage everything
git add .
git status   # verify: no secrets, no .bak files, no node_modules

# Commit
git commit -m "feat: initial open-source release of Persona Team"

# Create the GitHub repo (requires the `gh` CLI — https://cli.github.com)
gh repo create persona-team --public --source=. --remote=origin --push

# Or create manually at https://github.com/new then:
# git remote add origin https://github.com/YOUR_USERNAME/persona-team.git
# git push -u origin main
```

After pushing, verify the raw install URL works:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/persona-team/main/install.sh | head -5
```

---

## 5. Smoke test for a fresh user

Run this sequence on a clean machine (or a temp user account) to verify the end-to-end install works:

```bash
# 1. Install
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/persona-team/main/install.sh | bash
# Expected: [ OK ] lines for all 14 installed files, no errors.

# 2. Verify files landed
ls ~/.claude/agents/*.md | wc -l          # expect 10
ls ~/.claude/commands/build-team.md       # expect: file exists
ls ~/.claude/PERSONA-TEAM.md             # expect: file exists
ls ~/.claude/persona-team/server.mjs     # expect: file exists
ls ~/.claude/persona-team/public/index.html  # expect: file exists

# 3. Start dashboard manually
node ~/.claude/persona-team/server.mjs &
# Expected: [persona-team] dashboard live -> http://localhost:7331

# 4. Open browser at http://localhost:7331
# Expected: dark Persona Team page, hero section, "connecting" dot turns green.

# 5. Open Claude Code in any project and run:
/build-team add a hello world endpoint

# Expected:
#  - Dashboard animates cards from queued -> working -> done
#  - Team lead returns an integrated delivery
#  - $PT complete fires and the pill turns green

# 6. Kill the server
pkill -f persona-team/server.mjs
```

---

## 6. Optional: add repo metadata on GitHub

After pushing:
- Add description: "A Claude Code add-on: 10 senior AI agents, live dashboard, no API keys."
- Add topics: `claude`, `ai-agents`, `claude-code`, `open-source`, `developer-tools`
- Add website: `https://github.com/YOUR_USERNAME/persona-team`
- Enable Issues (for community bug reports)

---

## 7. Post the LinkedIn article

Open `/Users/mac/workspace/persona-team/LINKEDIN.md`. The URL placeholder will have been replaced in step 1. Copy the text and post on LinkedIn.
