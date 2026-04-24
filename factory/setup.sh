#!/usr/bin/env bash
# Alexandria setup — creates ~/Alexandria/ and connects to the protocol
# Usage: curl -sSL https://raw.githubusercontent.com/mowinckelb/Alexandria/main/factory/setup.sh | bash -s -- <API_KEY>
# NO set -e — every section must succeed or fail independently.

ALEX_DIR="$HOME/Alexandria"
API_KEY="$1"
FACTORY_RAW="https://raw.githubusercontent.com/mowinckelb/Alexandria/main/factory"

if [ -z "$API_KEY" ]; then
  echo "Usage: bash setup.sh <API_KEY>"
  echo "Get your key at https://mowinckel.ai/signup"
  exit 1
fi

# ── Prerequisites ─────────────────────────────────────────────────

echo "Checking prerequisites..."
command -v git &>/dev/null && echo "  git: ok" || echo "  git: missing — install from https://git-scm.com (optional, enables backup)"
command -v node &>/dev/null && echo "  node: ok" || echo "  node: missing — install from https://nodejs.org (required for Claude Code)"
if command -v gh &>/dev/null; then
  gh auth status &>/dev/null 2>&1 && echo "  github cli: ok" || echo "  github cli: not logged in — run 'gh auth login' (optional, enables cloud backup)"
else
  echo "  github cli: not installed — https://cli.github.com (optional)"
fi
echo ""
echo "Setting up Alexandria..."

# ── 1. Directory structure ────────────────────────────────────────

mkdir -p "$ALEX_DIR/vault" "$ALEX_DIR/hooks" "$ALEX_DIR/constitution" "$ALEX_DIR/ontology" "$ALEX_DIR/library" "$ALEX_DIR/inbox" "$ALEX_DIR/.autoloop"
echo "$API_KEY" > "$ALEX_DIR/.api_key"
chmod 600 "$ALEX_DIR/.api_key"
touch "$ALEX_DIR/.last_processed"
date +%s > "$ALEX_DIR/.last_maintenance"

# ── 2. Factory files from GitHub ──────────────────────────────────

# Templates (don't overwrite existing)
for f in machine.md notepad.md feedback.md agent.md; do
  [ -f "$ALEX_DIR/$f" ] || curl -sS "$FACTORY_RAW/templates/$f" -o "$ALEX_DIR/$f" 2>/dev/null
done
for d in constitution ontology vault library; do
  [ -f "$ALEX_DIR/$d/README.md" ] || curl -sS "$FACTORY_RAW/templates/$d/README.md" -o "$ALEX_DIR/$d/README.md" 2>/dev/null
done

# Hooks (always update)
curl -sS "$FACTORY_RAW/hooks/shim.sh" -o "$ALEX_DIR/hooks/shim.sh" 2>/dev/null
chmod +x "$ALEX_DIR/hooks/shim.sh"
curl -sS "$FACTORY_RAW/hooks/payload.sh" -o "$ALEX_DIR/.hooks_payload" 2>/dev/null

# Canon (cache locally — one module)
curl -sS "$FACTORY_RAW/canon/methodology.md" -o "$ALEX_DIR/.canon_local" 2>/dev/null

# Block (cache locally for easy access)
curl -sS "$FACTORY_RAW/block.md" -o "$ALEX_DIR/.block" 2>/dev/null

# ── 3. Platform configuration ─────────────────────────────────────

# Claude Code — skill + hooks
if command -v node &>/dev/null && { [ -d "$HOME/.claude" ] || command -v claude &>/dev/null; }; then
  mkdir -p "$HOME/.claude/skills/alexandria" 2>/dev/null
  curl -sS "$FACTORY_RAW/skills/claudecode.md" -o "$HOME/.claude/skills/alexandria/SKILL.md" 2>/dev/null

  mkdir -p "$HOME/.claude/scheduled-tasks/alexandria" 2>/dev/null
  # Bootstrap pattern: SKILL.md is a tiny stub that fetches scheduled.md on every
  # run. Same compounding architecture as hooks/shim.sh → payload.sh. Keeps the
  # frontmatter (which Claude Code reads locally for scheduling) stable while the
  # live instructions stay pinned to the current canonical playbook.
  curl -sS "$FACTORY_RAW/skills/scheduled-bootstrap.md" -o "$HOME/.claude/scheduled-tasks/alexandria/SKILL.md" 2>/dev/null

  node -e "
    const fs = require('fs'), path = require('path');
    const f = path.join(process.env.HOME, '.claude', 'settings.json');
    let settings = {};
    try { settings = JSON.parse(fs.readFileSync(f, 'utf-8')); } catch {}
    if (!settings.hooks) settings.hooks = {};
    const filter = arr => (arr || []).filter(h => !JSON.stringify(h).toLowerCase().includes('alexandria/hooks/shim'));
    settings.hooks.SessionStart = filter(settings.hooks.SessionStart);
    settings.hooks.SessionStart.push({
      hooks: [{ type: 'command', command: 'bash \$HOME/Alexandria/hooks/shim.sh session-start', timeout: 10 }]
    });
    settings.hooks.SessionEnd = filter(settings.hooks.SessionEnd);
    settings.hooks.SessionEnd.push({
      hooks: [{ type: 'command', command: 'bash \$HOME/Alexandria/hooks/shim.sh session-end', timeout: 15 }]
    });
    settings.hooks.SubagentStart = filter(settings.hooks.SubagentStart);
    settings.hooks.SubagentStart.push({
      hooks: [{ type: 'command', command: 'bash \$HOME/Alexandria/hooks/shim.sh subagent' }]
    });
    fs.writeFileSync(f, JSON.stringify(settings, null, 2));
  " 2>/dev/null
  echo "  Claude Code: configured"
fi

# Cursor
if [ -d "$HOME/.cursor" ] || command -v cursor &>/dev/null; then
  mkdir -p "$HOME/.cursor/rules" 2>/dev/null
  curl -sS "$FACTORY_RAW/skills/cursor.mdc" -o "$HOME/.cursor/rules/alexandria.mdc" 2>/dev/null
  echo "  Cursor: configured"
fi

# Codex
if [ -d "$HOME/.codex" ] || command -v codex &>/dev/null; then
  mkdir -p "$HOME/.codex" 2>/dev/null
  [ -f "$HOME/.codex/instructions.md" ] && {
    if [ "$(uname)" = "Darwin" ]; then
      sed -i '' '/^<!-- alexandria:start -->/,/^<!-- alexandria:end -->/d' "$HOME/.codex/instructions.md"
    else
      sed -i '/^<!-- alexandria:start -->/,/^<!-- alexandria:end -->/d' "$HOME/.codex/instructions.md"
    fi
  }
  curl -sS "$FACTORY_RAW/skills/codex.md" >> "$HOME/.codex/instructions.md" 2>/dev/null
  echo "  Codex: configured"
fi

# ── 4. Git backup (nice to have) ─────────────────────────────────

if command -v git &>/dev/null; then
  (
    cd "$ALEX_DIR"
    if [ ! -d ".git" ]; then
      cat > .gitignore << 'GITIGNORE'
.canon_local
.api_key
hooks/
.machine_signal
.session_feedback
.cli_alert
.hooks_version
.hooks_payload
.last_processed
.last_maintenance
.setup_complete
.block_complete
library/
.autoloop/proposals/
GITIGNORE
      git init -q
      git add -A
      git commit -q -m "alexandria: genesis" --no-gpg-sign
    fi
    if command -v gh &>/dev/null && gh auth status &>/dev/null; then
      gh repo create alexandria-private --private --source=. --push --yes 2>/dev/null || true
    fi
  ) &>/dev/null || true
fi

# ── 5. iCloud sync (macOS) ───────────────────────────────────────

ICLOUD_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs"
if [ -d "$ICLOUD_DIR" ] && [ "$(uname)" = "Darwin" ]; then
  ICLOUD_ALEX="$ICLOUD_DIR/Alexandria"
  for sync_dir in vault constitution ontology library; do
    icloud_target="$ICLOUD_ALEX/$sync_dir"
    local_dir="$ALEX_DIR/$sync_dir"
    if [ -L "$local_dir" ]; then continue; fi
    mkdir -p "$icloud_target"
    [ -d "$local_dir" ] && [ "$(ls -A "$local_dir" 2>/dev/null)" ] && cp -R "$local_dir"/* "$icloud_target/" 2>/dev/null
    [ -d "$local_dir" ] && rm -rf "$local_dir"
    ln -s "$icloud_target" "$local_dir"
  done
  echo "  iCloud: synced"
fi

# ── Verify API key works ──────────────────────────────────────────

# Fail loudly if the key is wrong — silent failures at setup time
# mean every session start/end/call POSTs against a dead auth and we
# never find out until the Author wonders why nothing happened.
KEY_STATUS=""
if command -v curl &>/dev/null; then
  KEY_STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $API_KEY" \
    --max-time 8 \
    "https://mcp.mowinckel.ai/alexandria" 2>/dev/null || echo "000")
fi

# ── Done ──────────────────────────────────────────────────────────

touch "$ALEX_DIR/.setup_complete"

MISSING=""
[ ! -f "$ALEX_DIR/.api_key" ] && MISSING="$MISSING api_key"
[ ! -f "$ALEX_DIR/hooks/shim.sh" ] && MISSING="$MISSING hooks"
[ ! -f "$ALEX_DIR/.canon_local" ] && MISSING="$MISSING canon"
[ ! -f "$ALEX_DIR/.hooks_payload" ] && MISSING="$MISSING hooks_payload"
[ ! -f "$ALEX_DIR/.block" ] && MISSING="$MISSING block"
for f in machine.md notepad.md feedback.md; do
  [ ! -f "$ALEX_DIR/$f" ] && MISSING="$MISSING $f"
done
for f in constitution/README.md ontology/README.md vault/README.md library/README.md; do
  [ ! -f "$ALEX_DIR/$f" ] && MISSING="$MISSING $f"
done

if [ -n "$MISSING" ]; then
  echo ""
  echo "WARNING: missing:$MISSING — re-run to fix"
elif [ "$KEY_STATUS" = "401" ]; then
  echo ""
  echo "WARNING: API key rejected by server (401). Sign in again at"
  echo "  https://mowinckel.ai/signup"
  echo "to get a fresh key, then re-run the curl."
elif [ -n "$KEY_STATUS" ] && [ "$KEY_STATUS" != "200" ] && [ "$KEY_STATUS" != "000" ]; then
  echo ""
  echo "NOTE: server responded $KEY_STATUS — setup finished but check"
  echo "  https://mcp.mowinckel.ai/health"
  echo "Everything local works; the protocol may be degraded."
else
  echo ""
  echo "Alexandria installed. ~/Alexandria/ — your mind, on your machine."
  echo ""
  echo "Open a new Claude Code or Cursor tab and paste the block."
  echo "If it's not in your clipboard: cat ~/Alexandria/.block"
fi
