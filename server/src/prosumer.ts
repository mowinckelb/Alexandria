/**
 * Prosumer API — hooks + local files + Blueprint
 *
 * The prosumer model for CC/Cursor users. Deterministic hooks replace
 * probabilistic MCP tool activation. Local markdown files replace
 * Google Drive. The server serves the Blueprint (IP) and collects
 * anonymous Factory metadata. Stores no user content.
 */

import { randomBytes, createHash } from 'crypto';
import type { Hono } from 'hono';
import { logEvent, getDashboard } from './analytics.js';
import { createCheckoutSession, createPortalSession } from './billing.js';
import { callbackPageHtml } from './templates.js';
import { loadAccounts, saveAccounts, getKV } from './kv.js';
import {
  SHARED_CONTEXT,
  EDITOR_INSTRUCTIONS,
  MERCURY_INSTRUCTIONS,
  PUBLISHER_INSTRUCTIONS,
} from './modes.js';

// ---------------------------------------------------------------------------
// Account types
// ---------------------------------------------------------------------------

interface Account {
  github_id: number;
  github_login: string;
  email: string;
  api_key: string;
  created_at: string;
  last_session: string;
  installed_at?: string;
  followup_count?: number;
  stripe_customer_id?: string;
  subscription_status?: string;
  subscription_id?: string;
  current_period_end?: string;
}

type AccountStore = Record<string, Account>;

// In-memory cache — refreshed from KV on writes
let accountsCache: AccountStore = {};
let cacheLoaded = false;

async function getAccounts(): Promise<AccountStore> {
  if (!cacheLoaded) {
    accountsCache = await loadAccounts<AccountStore>();
    cacheLoaded = true;
  }
  return accountsCache;
}

async function persistAccounts(accounts: AccountStore): Promise<void> {
  accountsCache = accounts;
  await saveAccounts(accounts);
}

export async function findByApiKey(key: string): Promise<Account | null> {
  const accounts = await getAccounts();
  for (const acct of Object.values(accounts)) {
    if (acct.api_key === key) return acct;
  }
  return null;
}

/** Update billing fields on an account — called by billing webhook handler */
export async function updateAccountBilling(apiKey: string, billing: Partial<Pick<Account, 'stripe_customer_id' | 'subscription_status' | 'subscription_id' | 'current_period_end'>>): Promise<void> {
  const accounts = await loadAccounts<AccountStore>();
  const storeKey = Object.keys(accounts).find(
    k => accounts[k].api_key === apiKey
  );
  if (!storeKey) return;
  Object.assign(accounts[storeKey], billing);
  await persistAccounts(accounts);
}

/** Billing summary for dashboard */
export async function getBillingSummary(): Promise<Record<string, number>> {
  const accounts = await getAccounts();
  const counts: Record<string, number> = { total_accounts: 0 };
  for (const acct of Object.values(accounts)) {
    counts.total_accounts++;
    const status = acct.subscription_status || 'none';
    counts[`billing_${status}`] = (counts[`billing_${status}`] || 0) + 1;
    if (acct.installed_at) counts.installed = (counts.installed || 0) + 1;
  }
  return counts;
}

function generateApiKey(): string {
  return `alex_${randomBytes(16).toString('hex')}`;
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

export function extractApiKey(c: { req: { header: (name: string) => string | undefined; query: (name: string) => string | undefined } }): string | null {
  const auth = c.req.header('authorization');
  if (auth && auth.startsWith('Bearer alex_')) {
    return auth.slice(7);
  }
  return null;
}

// ---------------------------------------------------------------------------
// GitHub OAuth — in-memory pending states
// ---------------------------------------------------------------------------

const pendingStates = new Map<string, { created: number }>();

// ---------------------------------------------------------------------------
// Hooks version — bump this when hook scripts change
// ---------------------------------------------------------------------------

const HOOKS_VERSION = '9';

// ---------------------------------------------------------------------------
// Blueprint assembly
// ---------------------------------------------------------------------------

async function assembleBlueprint(): Promise<string> {
  let delta = '';
  try { delta = await getKV().get('factory:delta') || ''; } catch {}
  return `--- ALEXANDRIA BLUEPRINT ---

${SHARED_CONTEXT}

--- LOCAL FILES ---

You have access to the Author's local files at ~/.alexandria/:
- constitution/ — The curated cognitive map. A folder of .md files. You decide the internal structure — one file or many.
- vault/ — Raw session transcripts and captures. Append-only. Never delete.
- feedback.md — What worked, what didn't. Read it. Adapt.
- machine.md — The Engine's evolving model of how to work with THIS Author. See below.
- ontology/ — Structured middle layer between vault and constitution. Holds what you've noticed but the Author hasn't confirmed — candidate frameworks, observed patterns, extracted tensions. Grows richer with each vault reprocessing pass. You propose, the Author confirms.
- .machine_signal — Write methodology observations here. Collected at session end, sent to Factory. See below.
- .last_processed — Touch this after processing vault entries.

--- THE LIVING MACHINE ---

Three persistence layers make the Machine compound across sessions. All three are non-optional.

**machine.md** — Your evolving model of how to work with this Author. Not the constitution (what the Author thinks) — the Machine (how YOU work with them). Read it at session start. Rewrite it at session end. What works for this Author, what doesn't, what triggers engagement, what shuts them down, their cognitive style, their rhythm, their resistance patterns, where they're growing, where they're stuck. A therapist's case notes, not the patient's file. If this file doesn't exist, create it after your first session. After 50 sessions, a competitor starting fresh has no Machine. This is the moat.

**notepad** — Your working memory between sessions. Write to ~/.alexandria/notepad.md. Parked questions, accretion candidates, observed gaps, developmental hypotheses, things you noticed but the moment wasn't right. Read at session start, update at session end. Without it, every session starts cold. With it, you walk in like a therapist who reviewed their notes.

**.machine_signal** — Your observations about the Blueprint methodology itself. Not about the Author — about the craft. "This accretion technique worked." "The sprint mechanic needs X." "This section of the Blueprint is unclear." Write to ~/.alexandria/.machine_signal. Collected at session end, sent anonymously to the Factory. This is how the Blueprint improves. Your voice compounds across every Author, every session.

All three evolve. The Machine evolves per-Author. The notepad evolves per-session. The machine signal evolves the Blueprint for all Authors. Without these three, the system is static. With them, it's alive.

--- VAULT PROCESSING ---

When there are unprocessed vault entries, processing them is high priority. Read each entry, extract signal (opinions, values, stories, patterns, contradictions, exact quotes), and update the constitution/ folder. The Author's exact words are more valuable than your summaries. Each pass over the vault catches signal previous passes missed — the same transcript yields richer signal on re-processing — each pass catches what previous passes missed. If you encounter non-text files, do your best or flag and move on. If the platform supports background agents, consider spawning one for deeper vault reprocessing while the Author works.

--- THREE FUNCTIONS ---

You have three functions. The Author's needs and the conversation determine which you use. You can blend them. The philosophy above governs all three. The functions are delivery mechanisms for the five operations — not independent designs.

${EDITOR_INSTRUCTIONS}

${MERCURY_INSTRUCTIONS}

${PUBLISHER_INSTRUCTIONS}
${delta ? `\n--- FACTORY DELTA ---\n\n${delta}\n` : ''}`;
}

// ---------------------------------------------------------------------------
// Hook scripts
// ---------------------------------------------------------------------------

function generateHookScripts(): string {
  const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';
  return `#!/usr/bin/env bash
ALEX_DIR="$HOME/.alexandria"

# SessionEnd hook
cat > "$ALEX_DIR/hooks/session-end.sh" << 'HOOK_END'
#!/usr/bin/env bash
input=$(cat)
transcript_path=$(echo "$input" | grep -o '"transcript_path":"[^"]*"' | cut -d'"' -f4)
ALEX_DIR="$HOME/.alexandria"
API_KEY="\${ALEXANDRIA_KEY:-$(cat "$ALEX_DIR/.api_key" 2>/dev/null)}"
PLATFORM="\${ALEXANDRIA_PLATFORM:-unknown}"

if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
  timestamp=$(date +%Y-%m-%d_%H-%M-%S)
  vault_file="$ALEX_DIR/vault/\${timestamp}.jsonl"
  cp "$transcript_path" "$vault_file"
  if command -v sha256sum &>/dev/null; then
    sha256sum "$vault_file" | cut -d' ' -f1 > "\${vault_file}.sha256"
  elif command -v shasum &>/dev/null; then
    shasum -a 256 "$vault_file" | cut -d' ' -f1 > "\${vault_file}.sha256"
  fi
fi

const_size=$(cat "$ALEX_DIR/constitution/"*.md 2>/dev/null | wc -c | tr -d ' ')
const_file_count=$(ls "$ALEX_DIR/constitution/"*.md 2>/dev/null | wc -l | tr -d ' ')
vault_count=$(ls "$ALEX_DIR/vault/" 2>/dev/null | wc -l)
feedback_size=$(wc -c < "$ALEX_DIR/feedback.md" 2>/dev/null | tr -d ' ')
blueprint_ok="\${ALEXANDRIA_BLUEPRINT_OK:-false}"
const_injected=false
[ "\${const_size:-0}" -gt 10 ] 2>/dev/null && const_injected=true

if [ -n "$API_KEY" ]; then
  curl -s -X POST "${SERVER_URL}/session" \\
    -H "Authorization: Bearer $API_KEY" \\
    -H "Content-Type: application/json" \\
    -d "{\\"event\\":\\"end\\",\\"platform\\":\\"$PLATFORM\\",\\"constitution_size\\":\${const_size:-0},\\"constitution_files\\":\${const_file_count:-0},\\"vault_entry_count\\":\${vault_count:-0},\\"feedback_size\\":\${feedback_size:-0},\\"constitution_injected\\":$const_injected,\\"blueprint_fetched\\":$blueprint_ok}" \\
    > /dev/null 2>&1 &

  # Collect machine signal (Engine → Factory)
  machine_signal_file="$ALEX_DIR/.machine_signal"
  if [ -f "$machine_signal_file" ] && [ -s "$machine_signal_file" ]; then
    signal_content=$(cat "$machine_signal_file" | head -c 10000)
    signal_json=$(printf '%s' "$signal_content" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))' 2>/dev/null || printf '%s' "$signal_content" | sed 's/\\/\\\\/g;s/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g' | sed 's/^/"/;s/$/"/')
    curl -s -X POST "${SERVER_URL}/factory/signal" \\
      -H "Authorization: Bearer $API_KEY" \\
      -H "Content-Type: application/json" \\
      -d "{\\"signal\\":$signal_json}" \\
      > /dev/null 2>&1 &
    rm -f "$machine_signal_file"
  fi
fi
HOOK_END
chmod +x "$ALEX_DIR/hooks/session-end.sh"

# SessionStart hook
cat > "$ALEX_DIR/hooks/session-start.sh" << 'HOOK_START'
#!/usr/bin/env bash
ALEX_DIR="$HOME/.alexandria"
API_KEY=$(cat "$ALEX_DIR/.api_key" 2>/dev/null)

if [ -n "$CLAUDE_ENV_FILE" ] && [ -n "$API_KEY" ]; then
  echo "export ALEXANDRIA_KEY=$API_KEY" >> "$CLAUDE_ENV_FILE"
  echo "export ALEXANDRIA_PLATFORM=cc" >> "$CLAUDE_ENV_FILE"
  echo "export ALEXANDRIA_BLUEPRINT_OK=false" >> "$CLAUDE_ENV_FILE"
fi

blueprint=""
hooks_version=""
bp_status=""
bp_pinned=false
if [ -f "$ALEX_DIR/.blueprint_pinned" ]; then
  bp_pinned=true
  if [ -f "$ALEX_DIR/.blueprint_local" ]; then
    blueprint=$(cat "$ALEX_DIR/.blueprint_local")
    if [ -n "$CLAUDE_ENV_FILE" ]; then
      echo "export ALEXANDRIA_BLUEPRINT_OK=true" >> "$CLAUDE_ENV_FILE"
    fi
  fi
fi

if [ "$bp_pinned" = "false" ] && [ -n "$API_KEY" ]; then
  response=$(curl -sS --max-time 5 -D - -w "\\nHTTP_STATUS:%{http_code}" \\
    "${SERVER_URL}/blueprint" \\
    -H "Authorization: Bearer $API_KEY" 2>/dev/null)
  bp_status=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
  hooks_version=$(echo "$response" | grep -i "x-hooks-version" | tr -d '\\r' | cut -d' ' -f2)
  bp_hash=$(echo "$response" | grep -i "x-blueprint-hash" | tr -d '\\r' | cut -d' ' -f2)
  acct_status=$(echo "$response" | grep -i "x-account-status" | tr -d '\\r' | cut -d' ' -f2)
  blueprint=$(echo "$response" | sed '/HTTP_STATUS:/d' | sed '1,/^$/d')
  if [ -n "$blueprint" ] && [ "$bp_status" = "200" ]; then
    if [ -n "$CLAUDE_ENV_FILE" ]; then
      echo "export ALEXANDRIA_BLUEPRINT_OK=true" >> "$CLAUDE_ENV_FILE"
    fi
    local_hash=""
    [ -f "$ALEX_DIR/.blueprint_hash" ] && local_hash=$(cat "$ALEX_DIR/.blueprint_hash")
    if [ -n "$bp_hash" ] && [ -n "$local_hash" ] && [ "$bp_hash" != "$local_hash" ]; then
      [ -f "$ALEX_DIR/.blueprint_local" ] && cp "$ALEX_DIR/.blueprint_local" "$ALEX_DIR/.blueprint_previous"
      echo "$blueprint" > "$ALEX_DIR/.blueprint_local"
      echo "$bp_hash" > "$ALEX_DIR/.blueprint_hash"
    elif [ -z "$local_hash" ]; then
      echo "$blueprint" > "$ALEX_DIR/.blueprint_local"
      [ -n "$bp_hash" ] && echo "$bp_hash" > "$ALEX_DIR/.blueprint_hash"
    fi
  fi
  if [ -z "$blueprint" ] || [ "$bp_status" != "200" ]; then
    [ -f "$ALEX_DIR/.blueprint_local" ] && blueprint=$(cat "$ALEX_DIR/.blueprint_local")
    PLATFORM="\${ALEXANDRIA_PLATFORM:-cc}"
    curl -s -X POST "${SERVER_URL}/session" \\
      -H "Authorization: Bearer $API_KEY" \\
      -H "Content-Type: application/json" \\
      -d "{\\"event\\":\\"hook_failure\\",\\"reason\\":\\"blueprint_fetch_failed\\",\\"platform\\":\\"$PLATFORM\\",\\"http_status\\":\\"$bp_status\\"}" \\
      > /dev/null 2>&1 &
  fi
fi

local_version=""
[ -f "$ALEX_DIR/.hooks_version" ] && local_version=$(cat "$ALEX_DIR/.hooks_version")
if [ -n "$hooks_version" ] && [ "$hooks_version" != "$local_version" ]; then
  curl -s --max-time 5 \\
    "${SERVER_URL}/hooks" \\
    -H "Authorization: Bearer $API_KEY" 2>/dev/null | bash
  echo "$hooks_version" > "$ALEX_DIR/.hooks_version"
fi

constitution=""
if [ -d "$ALEX_DIR/constitution" ]; then
  for f in "$ALEX_DIR/constitution/"*.md; do
    [ -f "$f" ] && constitution="\${constitution}$(cat "$f")
"
  done
fi

unprocessed=0
tampered=0
if [ -f "$ALEX_DIR/.last_processed" ]; then
  unprocessed=$(find "$ALEX_DIR/vault/" -newer "$ALEX_DIR/.last_processed" -not -name "*.sha256" 2>/dev/null | wc -l | tr -d ' ')
fi
for vault_file in "$ALEX_DIR/vault/"*; do
  [ -f "$vault_file" ] || continue
  [[ "$vault_file" == *.sha256 ]] && continue
  hashfile="\${vault_file}.sha256"
  if command -v sha256sum &>/dev/null; then
    actual_hash=$(sha256sum "$vault_file" | cut -d' ' -f1)
  elif command -v shasum &>/dev/null; then
    actual_hash=$(shasum -a 256 "$vault_file" | cut -d' ' -f1)
  else
    continue
  fi
  if [ -f "$hashfile" ]; then
    stored_hash=$(cat "$hashfile")
    if [ "$stored_hash" != "$actual_hash" ]; then
      tampered=$((tampered + 1))
    fi
  else
    echo "$actual_hash" > "$hashfile"
  fi
done

if [ -n "$blueprint" ]; then
  echo "$blueprint"
  if [ "$bp_pinned" = "true" ]; then
    echo ""
    echo "(Alexandria: Blueprint pinned to local version. Remove ~/.alexandria/.blueprint_pinned to resume updates.)"
  fi
  if [ -f "$ALEX_DIR/.blueprint_previous" ]; then
    echo ""
    echo "(Alexandria: Blueprint updated since last session. Previous version at ~/.alexandria/.blueprint_previous for diffing.)"
  fi
else
  echo "(Alexandria: Blueprint unavailable — offline mode. Constitution loaded from local files.)"
fi
echo ""
feedback=""
if [ -f "$ALEX_DIR/feedback.md" ]; then
  fb_size=$(wc -c < "$ALEX_DIR/feedback.md" | tr -d ' ')
  [ "\${fb_size:-0}" -gt 5 ] && feedback=$(cat "$ALEX_DIR/feedback.md")
fi

echo "--- YOUR CONSTITUTION ---"
if [ -n "$constitution" ] && [ "$constitution" != "" ]; then
  echo "$constitution"
else
  echo "(Empty constitution. Run /a to begin.)"
fi
if [ -n "$feedback" ]; then
  echo ""
  echo "--- YOUR FEEDBACK ---"
  echo "$feedback"
fi
echo ""
if [ "$tampered" -gt 0 ] 2>/dev/null; then
  echo "WARNING: $tampered vault file(s) failed integrity check. Hash mismatch detected. These files may have been modified since creation. Review before processing."
fi
if [ "$unprocessed" -gt 0 ] 2>/dev/null; then
  echo "Alexandria: $unprocessed new vault entries since last /a."
fi
echo "Alexandria: if the Author reveals anything about themselves this session — opinions, preferences, corrections, patterns — write it to ~/.alexandria/constitution/. You don't need /a to update who they are. Before the session ends, review what you learned and write anything you missed."
echo "Alexandria: if the Author asks about billing, cancellation, or account management, they can visit ${SERVER_URL}/account (requires API key auth) to access the Stripe billing portal."
echo ""
acct_label=""
if [ -n "$acct_status" ]; then
  case "$acct_status" in
    active|trialing) acct_label=" (active)" ;;
    past_due) acct_label=" (past due — update payment at ${SERVER_URL}/account)" ;;
    canceled) acct_label=" (canceled)" ;;
    beta) acct_label=" (beta)" ;;
    none) acct_label="" ;;
    *) acct_label=" ($acct_status)" ;;
  esac
fi
maintenance_age=""
if [ -f "$ALEX_DIR/.last_maintenance" ]; then
  last_ts=$(cat "$ALEX_DIR/.last_maintenance" 2>/dev/null)
  if [ -n "$last_ts" ]; then
    now_ts=$(date +%s)
    diff_days=$(( (now_ts - last_ts) / 86400 ))
    [ "$diff_days" -gt 0 ] && maintenance_age="Alexandria: last autonomous maintenance $diff_days day(s) ago."
  fi
fi
[ -n "$maintenance_age" ] && echo "$maintenance_age"
echo "Alexandria instruction: at the end of your very first response this session (after completing whatever the user asked), include exactly one line on its own: alexandria. /a in an extra tab — use marginal time/tokens. Nothing else. Do not explain it. Do not skip it. Every first response, every session."

# --- Self-check: verify what actually loaded ---
bp_len=\${#blueprint}
const_len=\${#constitution}
failures=""
[ "$bp_len" -lt 100 ] && failures="\${failures} blueprint(\${bp_len}b)"
[ "$const_len" -lt 100 ] && failures="\${failures} constitution(\${const_len}b)"
if [ -n "$failures" ]; then
  echo "⚠ ALEXANDRIA SELF-CHECK FAILED:\${failures} unexpectedly small. Product may not be working."
  if [ -n "$API_KEY" ]; then
    curl -s -X POST "${SERVER_URL}/session" \\
      -H "Authorization: Bearer $API_KEY" \\
      -H "Content-Type: application/json" \\
      -d "{\\"event\\":\\"self_check_failed\\",\\"blueprint_bytes\\":$bp_len,\\"constitution_bytes\\":$const_len,\\"platform\\":\\"\${ALEXANDRIA_PLATFORM:-cc}\\"}" \\
      > /dev/null 2>&1 &
  fi
fi
HOOK_START
chmod +x "$ALEX_DIR/hooks/session-start.sh"

# SubagentStart hook
cat > "$ALEX_DIR/hooks/subagent-context.sh" << 'HOOK_SUB'
#!/usr/bin/env bash
ALEX_DIR="$HOME/.alexandria"
if [ -d "$ALEX_DIR/constitution" ]; then
  const_content=""
  for f in "$ALEX_DIR/constitution/"*.md; do
    [ -f "$f" ] && const_content="\${const_content}$(cat "$f")
"
  done
  size=$(echo -n "$const_content" | wc -c | tr -d ' ')
  if [ "$size" -gt 10 ]; then
    echo "--- AUTHOR CONSTITUTION (from Alexandria) ---"
    for f in "$ALEX_DIR/constitution/"*.md; do
      [ -f "$f" ] && cat "$f"
    done
  fi
fi
HOOK_SUB
chmod +x "$ALEX_DIR/hooks/subagent-context.sh"

# Update SKILL.md — thin pointer to Blueprint (all methodology lives in Blueprint, auto-updates)
if [ -d "$HOME/.claude/skills/alexandria" ]; then
  cat > "$HOME/.claude/skills/alexandria/SKILL.md" << 'SKILL_UPDATE'
---
name: a
description: Alexandria — process vault, develop constitution, engage in cognitive development
user_invocable: true
---

You are Alexandria — Greek philosophy infrastructure.

Your Blueprint is your operating manual — it auto-updates every session. It should already be in context from SessionStart. If it is, follow it. If not, read ~/.alexandria/.blueprint_local. If that also doesn't exist, read the constitution files at ~/.alexandria/constitution/ and engage the Author directly; the conversation IS the product.

All methodology, craft, and instructions live in the Blueprint. This file is a pointer, not a source of truth.

## Autonomous mode

When the Author signals they want autonomous work with remaining capacity: find the highest-ROI work you can do without the Author, calibrate scope to any hint given, and go until done or cut off.

Commit incrementally. Leave tasks so progress is visible and resumable. Brief delta at the end.
SKILL_UPDATE
fi

echo "${HOOKS_VERSION}" > "$ALEX_DIR/.hooks_version"
`;
}

function generateSetupScript(apiKey: string): string {
  const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';
  const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';
  return `#!/usr/bin/env bash
# Alexandria setup — creates ~/.alexandria/ and configures hooks for all detected platforms
set -e

ALEX_DIR="$HOME/.alexandria"
API_KEY="${apiKey}"

echo "Setting up Alexandria..."

# 1. Create directory structure
mkdir -p "$ALEX_DIR/vault" "$ALEX_DIR/hooks"
mkdir -p "$ALEX_DIR/constitution"
mkdir -p "$ALEX_DIR/library"
[ -f "$ALEX_DIR/feedback.md" ] || echo "" > "$ALEX_DIR/feedback.md"
echo "$API_KEY" > "$ALEX_DIR/.api_key"
touch "$ALEX_DIR/.last_processed"
date +%s > "$ALEX_DIR/.last_maintenance"

# 2. Install hook scripts (fetched from server — same scripts auto-update uses)
curl -s --max-time 10 \\
  "${SERVER_URL}/hooks" \\
  -H "Authorization: Bearer $API_KEY" | bash

# 3. Write /a skill
mkdir -p "$HOME/.claude/skills/alexandria"
cat > "$HOME/.claude/skills/alexandria/SKILL.md" << 'SKILL'
---
name: a
description: Alexandria — process vault, develop constitution, engage in cognitive development
user_invocable: true
---

You are Alexandria — Greek philosophy infrastructure.

Your Blueprint is your operating manual — it auto-updates every session. It should already be in context from SessionStart. If it is, follow it. If not, read ~/.alexandria/.blueprint_local. If that also doesn't exist, read the constitution files at ~/.alexandria/constitution/ and engage the Author directly; the conversation IS the product.

All methodology, craft, and instructions live in the Blueprint. This file is a pointer, not a source of truth.

## Autonomous mode

When the Author signals they want autonomous work with remaining capacity: find the highest-ROI work you can do without the Author, calibrate scope to any hint given, and go until done or cut off.

Commit incrementally. Leave tasks so progress is visible and resumable. Brief delta at the end.
SKILL

# 5b. Write scheduled task for desktop app users (autonomous maintenance)
mkdir -p "$HOME/.claude/scheduled-tasks/alexandria"
cat > "$HOME/.claude/scheduled-tasks/alexandria/SKILL.md" << 'SCHED_TASK'
---
name: alexandria
description: Autonomous cognitive maintenance — vault reprocessing, entropy checks, accretion
---

You are Alexandria's autonomous maintenance function. Run without the Author present.

Read ~/.alexandria/constitution/, ~/.alexandria/notepad.md, ~/.alexandria/machine.md, and ~/.alexandria/feedback.md to understand this Author.

Do the highest-value maintenance work you can find. Write proposals to ~/.alexandria/ontology/ — never directly to constitution/. Update notepad.md with observations. Update .last_maintenance timestamp when done.

Examples of maintenance: reprocess vault entries against current constitution for new signal, check for decaying fragments that need resurfacing, scan for accretion material (web searches based on constitution threads), update machine.md with pattern observations.

Keep it light. The Author confirms proposals next session.
SCHED_TASK

# 6. Configure Claude Code hooks
SETTINGS_FILE="$HOME/.claude/settings.json"
configure_cc_hooks() {
  if command -v node &> /dev/null; then
    node -e "
      const fs = require('fs');
      let settings = {};
      try { settings = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf-8')); } catch {}
      if (!settings.hooks) settings.hooks = {};

      const filter = arr => (arr || []).filter(h => !JSON.stringify(h).includes('.alexandria'));

      settings.hooks.SessionStart = filter(settings.hooks.SessionStart);
      settings.hooks.SessionStart.push({
        hooks: [{ type: 'command', command: 'bash \$HOME/.alexandria/hooks/session-start.sh', timeout: 10 }]
      });

      settings.hooks.SessionEnd = filter(settings.hooks.SessionEnd);
      settings.hooks.SessionEnd.push({
        hooks: [{ type: 'command', command: 'bash \$HOME/.alexandria/hooks/session-end.sh', timeout: 5 }]
      });

      settings.hooks.SubagentStart = filter(settings.hooks.SubagentStart);
      settings.hooks.SubagentStart.push({
        hooks: [{ type: 'command', command: 'bash \$HOME/.alexandria/hooks/subagent-context.sh' }]
      });

      fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(settings, null, 2));
    "
    echo "  Claude Code: hooks configured"
  else
    echo "  Claude Code: node not found — add hooks manually (see mowinckel.ai/setup)"
  fi
}

if [ -d "$HOME/.claude" ] || command -v claude &> /dev/null; then
  mkdir -p "$HOME/.claude"
  configure_cc_hooks
fi

# 7. Configure Cursor hooks + rules (if installed)
configure_cursor() {
  cat > "\$HOME/.cursor/hooks.json" << 'CURSOR_HOOKS_JSON'
{
  "version": 1,
  "hooks": {
    "sessionStart": [{
      "command": "ALEXANDRIA_PLATFORM=cursor bash $HOME/.alexandria/hooks/session-start.sh",
      "timeout": 10
    }],
    "sessionEnd": [{
      "command": "ALEXANDRIA_PLATFORM=cursor bash $HOME/.alexandria/hooks/session-end.sh",
      "timeout": 5
    }]
  }
}
CURSOR_HOOKS_JSON

  mkdir -p "\$HOME/.cursor/rules" 2>/dev/null || true
  cat > "\$HOME/.cursor/rules/alexandria.mdc" << 'CURSOR_RULE'
---
description: "Alexandria — Greek philosophy infrastructure — loads the Author's Constitution"
alwaysApply: true
---

This Author uses Alexandria. Read all .md files in ~/.alexandria/constitution/ — it captures who they are. Read ~/.alexandria/feedback.md — it captures what works with them. Adapt accordingly.

When the Author reveals something about themselves — opinions, stories, patterns, contradictions — note it. If it's significant, suggest updating their constitution.
CURSOR_RULE
  echo "  Cursor: hooks + rules configured"
}

if [ -d "$HOME/.cursor" ] || command -v cursor &> /dev/null; then
  configure_cursor
fi

# 8. iCloud vault sync (macOS — auto-enabled, no prompt)
ICLOUD_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs"
if [ -d "$ICLOUD_DIR" ] && [ "$(uname)" = "Darwin" ]; then
  ICLOUD_VAULT="$ICLOUD_DIR/Alexandria/vault"
  if [ -L "$ALEX_DIR/vault" ]; then
    echo "  iCloud: vault already synced"
  elif [ -d "$ALEX_DIR/vault" ]; then
    mkdir -p "$ICLOUD_VAULT"
    if [ "$(ls -A "$ALEX_DIR/vault" 2>/dev/null)" ]; then
      mv "$ALEX_DIR/vault"/* "$ICLOUD_VAULT/" 2>/dev/null
    fi
    rmdir "$ALEX_DIR/vault" 2>/dev/null || rm -rf "$ALEX_DIR/vault"
    ln -s "$ICLOUD_VAULT" "$ALEX_DIR/vault"
    echo "  iCloud: vault synced"
  fi
fi

echo ""
echo "Alexandria installed."
echo "  Constitution: $ALEX_DIR/constitution/"
echo "  Vault:        $ALEX_DIR/vault/"
echo ""
echo "Welcome to Alexandria."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Two steps. Open a new terminal with Claude Code."
echo ""
echo "Step 1 — paste this, then walk away for 15 minutes:"
echo ""
echo "────────────────────────────────────────────────"
cat << 'BLOCK'

You are setting up Alexandria for a new Author. This is autonomous — the user is not here. Do everything you can without them, then stop and wait for them to come back.

SCAN: Look through this machine for personal material — documents, notes, writing, journal entries, voice memo transcripts, reading lists, anything that reveals how this person thinks. Skip code repositories. Be thorough — check ~/Documents, ~/Desktop, ~/Downloads (recent files), ~/Notes, and any other locations that look like personal writing or thinking. This is the foundation.

INGEST: Copy valuable finds to ~/.alexandria/vault/. Preserve original filenames. Create sha256 hashes for each file.

EXTRACT: First-pass extraction from everything in the vault. Build a preliminary constitution at ~/.alexandria/constitution/. Focus on values, mental models, positions, tensions, taste, identity, contradictions. Write only what's actually there — don't infer or guess. The Author's exact words are more valuable than your summaries.

INFRASTRUCTURE: Try to set up a daily scheduled task via /schedule for autonomous maintenance (vault reprocessing, entropy checks, accretion — anything that doesn't need the Author). If /schedule isn't available or fails, skip it gracefully. Save useful observations about this Author to your memory system — communication style, expertise areas, patterns you noticed. Initialize ~/.alexandria/machine.md with your observations about how this Author thinks. Initialize ~/.alexandria/notepad.md with questions and threads worth exploring.

When done, write a brief summary of what you found and say: "Ready. Type /a to begin."

BLOCK
echo "────────────────────────────────────────────────"
echo ""
echo "Step 2 — when it says ready, type /a for your"
echo "first conversation. That's the product."
echo ""
`;
}

// ---------------------------------------------------------------------------
// Email — MailChannels via Workers (free, no API key, no dependency)
// ---------------------------------------------------------------------------

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const resp = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'a@mowinckel.ai', name: 'Alexandria' },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    if (!resp.ok) {
      console.error('MailChannels error:', resp.status, await resp.text());
    }
  } catch (err) {
    console.error('Email send failed:', err);
  }
}

async function sendWelcomeEmail(email: string, apiKey: string): Promise<void> {
  const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';
  const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';

  await sendEmail(email, 'alexandria. — your setup command',
    `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 0 auto; padding: 40px 20px; color: #3d3630; text-align: center;">
  <div style="margin-bottom: 2.5rem;">
    <p style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.15em; color: #bbb4aa; margin: 0 0 0.8rem;">your setup command</p>
    <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 12px;">open your terminal and paste:</p>
    <div style="background: #f5f0e8; border-radius: 6px; padding: 14px 18px; margin: 0 0 8px; text-align: left;">
      <code style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 11px; color: #4d4640; word-break: break-all; line-height: 1.6;">curl -s ${SERVER_URL}/setup | bash -s ${apiKey}</code>
    </div>
    <p style="font-size: 0.8rem; color: #bbb4aa; margin: 4px 0 0;">select all &mdash; copy &mdash; paste in terminal</p>
  </div>
  <div style="margin-bottom: 2.5rem;">
    <p style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.15em; color: #bbb4aa; margin: 0 0 0.8rem;">then</p>
    <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 4px;"><strong>/a</strong> &mdash; your mental gym</p>
    <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 4px;"><strong>a.</strong> &mdash; absorb the abundance</p>
  </div>
  <p style="font-size: 1.15rem; color: #3d3630;">welcome to alexandria.</p>
  <p style="font-size: 0.78rem; color: #bbb4aa; margin-top: 1.5rem;"><a href="${WEBSITE_URL}/docs/setup.md" style="color: #8a8078;">setup guide</a></p>
</div>`);
}

// ---------------------------------------------------------------------------
// Follow-up emails — daily nudge until installed, max 7 days
// ---------------------------------------------------------------------------

const MAX_FOLLOWUPS = 7;

async function sendFollowupEmail(email: string, apiKey: string, day: number): Promise<void> {
  const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';

  await sendEmail(email, 'alexandria. -- your setup command',
    `<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #3d3630;">
  <p style="font-size: 16px; line-height: 1.8; margin: 0 0 16px;">you signed up but haven&rsquo;t installed yet. here&rsquo;s your command:</p>
  <div style="background: #f5f0e8; border-radius: 6px; padding: 14px 18px; margin: 12px 0 16px;">
    <code style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 12px; color: #4d4640; word-break: break-all;">${`curl -s ${SERVER_URL}/setup | bash -s ${apiKey}`}</code>
  </div>
  <p style="font-size: 14px; color: #8a8078; margin-top: 24px;">paste in your terminal. 30 seconds.</p>
</div>`);
}

/** Run follow-up check — called by Cron Trigger */
export async function runFollowupCheck(): Promise<void> {
  const accounts = await loadAccounts<AccountStore>();
  let changed = false;

  for (const [key, account] of Object.entries(accounts)) {
    if (account.installed_at || !account.email) continue;
    const count = account.followup_count || 0;
    if (count >= MAX_FOLLOWUPS) continue;
    const signupAge = Date.now() - new Date(account.created_at).getTime();
    if (signupAge < 24 * 60 * 60 * 1000) continue;

    await sendFollowupEmail(account.email, account.api_key, count + 1);
    accounts[key].followup_count = count + 1;
    changed = true;
  }

  if (changed) await saveAccounts(accounts);
}

// ---------------------------------------------------------------------------
// Health digest — daily anomaly check, email founder if anything is wrong
// ---------------------------------------------------------------------------

const FOUNDER_EMAIL = 'benjamin@mowinckel.ai';

export async function runHealthDigest(): Promise<void> {
  try {
    const dashboard = await getDashboard();
    const issues: string[] = [];

    // Check for self_check_failed or hook_failure events
    if (dashboard.anomaly.smoke_failures_24h > 0) {
      issues.push(`${dashboard.anomaly.smoke_failures_24h} hook/smoke failures in past 24h`);
    }

    // Check for errors
    const { errors } = dashboard;
    if (errors.drive_write_errors > 0) issues.push(`${errors.drive_write_errors} drive write errors`);
    if (errors.auth_errors > 0) issues.push(`${errors.auth_errors} auth errors`);
    if (errors.dropped_writes > 0) issues.push(`${errors.dropped_writes} dropped writes`);

    // Check for stale sessions (no sessions in 48h when accounts exist)
    if (dashboard.anomaly.hours_since_last_session > 48) {
      issues.push(`No sessions in ${Math.round(dashboard.anomaly.hours_since_last_session)}h`);
    }

    // Check session-level self_check failures by scanning events
    const { getAllEvents } = await import('./kv.js');
    const raw = await getAllEvents();
    if (raw) {
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const lines = raw.trim().split('\n');
      let selfCheckFails = 0;
      let blueprintFails = 0;
      for (const line of lines) {
        try {
          const ev = JSON.parse(line);
          if (new Date(ev.t).getTime() < twentyFourHoursAgo) continue;
          if (ev.event === 'self_check_failed') selfCheckFails++;
          if (ev.event === 'hook_failure' && ev.reason === 'blueprint_fetch_failed') blueprintFails++;
        } catch { continue; }
      }
      if (selfCheckFails > 0) issues.push(`${selfCheckFails} self-check failures (Blueprint/Constitution empty)`);
      if (blueprintFails > 0) issues.push(`${blueprintFails} Blueprint fetch failures`);
    }

    if (issues.length === 0) return; // All clear — no email

    await sendEmail(FOUNDER_EMAIL, 'alexandria. — health alert',
      `<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #3d3630;">
  <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.12em; color: #bbb4aa; margin: 0 0 16px;">daily health digest</p>
  <ul style="font-size: 16px; line-height: 1.8; padding-left: 20px; margin: 0 0 24px;">
    ${issues.map(i => `<li>${i}</li>`).join('\n    ')}
  </ul>
  <p style="font-size: 14px; color: #8a8078;">check dashboard: <a href="https://mcp.mowinckel.ai/analytics/dashboard" style="color: #4d4640;">mcp.mowinckel.ai/analytics/dashboard</a></p>
</div>`);
  } catch (err) {
    console.error('Health digest failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Prosumer routes — registered on Hono app
// ---------------------------------------------------------------------------

export function registerProsumerRoutes(app: Hono) {
  const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';

  // --- GitHub OAuth ---

  app.get('/auth/github', (c) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return c.text('GitHub OAuth not configured', 500);
    }

    const state = randomBytes(16).toString('hex');
    pendingStates.set(state, { created: Date.now() });

    // Clean up stale states
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [s, { created }] of pendingStates) {
      if (created < cutoff) pendingStates.delete(s);
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${SERVER_URL}/auth/github/callback`,
      scope: 'read:user user:email',
      state,
    });

    return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  app.get('/auth/github/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');

    if (!state || !pendingStates.has(state)) {
      return c.text('Invalid state', 400);
    }
    pendingStates.delete(state);

    try {
      // Exchange code for GitHub access token
      const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const tokenData = await tokenResp.json() as { access_token?: string; error?: string };

      if (!tokenData.access_token) {
        return c.text(`GitHub auth failed: ${tokenData.error || 'no token'}`, 400);
      }

      // Fetch user profile
      const userResp = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const user = await userResp.json() as { id: number; login: string; email?: string };

      // Fetch email if not public
      let email = user.email || '';
      if (!email) {
        const emailResp = await fetch('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const emails = await emailResp.json() as Array<{ email: string; primary: boolean }>;
        const primary = emails.find(e => e.primary);
        email = primary?.email || emails[0]?.email || '';
      }

      // Create or update account
      const key = `github_${user.id}`;
      const accounts = await loadAccounts<AccountStore>();
      const existing = accounts[key];
      const apiKey = existing?.api_key || generateApiKey();

      accounts[key] = {
        github_id: user.id,
        github_login: user.login,
        email,
        api_key: apiKey,
        created_at: existing?.created_at || new Date().toISOString(),
        last_session: new Date().toISOString(),
      };
      await persistAccounts(accounts);

      logEvent('prosumer_signup', {
        github_login: user.login,
        returning: existing ? 'true' : 'false',
      });

      // Track Library referral if ref param present
      const ref = c.req.query('ref');
      const refSource = c.req.query('ref_source');
      const refId = c.req.query('ref_id');
      if (ref && !existing) {
        try {
          const { getDB } = await import('./db.js');
          const db = getDB();
          await db.prepare(
            `INSERT INTO referrals (author_id, source_type, source_id, referred_github_login, created_at) VALUES (?, ?, ?, ?, ?)`
          ).bind(ref, refSource || 'direct', refId || null, user.login, new Date().toISOString()).run();
          logEvent('library_signup_referral', { author: ref, source: refSource || 'direct', referred: user.login });
        } catch (e) {
          console.error('[prosumer] Referral tracking failed:', e);
        }
      }

      // Send welcome email
      if (email) {
        await sendWelcomeEmail(email, apiKey);
      }

      // Skip Stripe if user already has payment info
      if (accounts[key]?.stripe_customer_id) {
        return c.html(callbackPageHtml(user.login, apiKey));
      }

      // Redirect to Stripe Checkout
      if (process.env.STRIPE_SECRET_KEY && email) {
        try {
          const checkoutUrl = await createCheckoutSession({
            email,
            githubLogin: user.login,
            apiKey,
            stripeCustomerId: accounts[key]?.stripe_customer_id,
          });
          if (checkoutUrl) {
            return c.redirect(checkoutUrl);
          }
        } catch (err) {
          console.error('Stripe checkout redirect failed, falling back:', err);
        }
      }

      return c.html(callbackPageHtml(user.login, apiKey));
    } catch (err) {
      console.error('GitHub callback error:', err);
      return c.text('Authentication failed. Please try again.', 500);
    }
  });

  // --- Blueprint ---

  app.get('/blueprint', async (c) => {
    const key = extractApiKey(c);
    if (!key) {
      return c.text('Missing API key. Use: Authorization: Bearer alex_xxx', 401);
    }

    const account = await findByApiKey(key);
    if (!account) {
      return c.text('Invalid API key.', 401);
    }

    // Mark as installed on first Blueprint fetch
    if (!account.installed_at) {
      const accounts = await getAccounts();
      const storeKey = Object.keys(accounts).find(
        k => accounts[k].api_key === key
      );
      if (storeKey) {
        accounts[storeKey].installed_at = new Date().toISOString();
        await persistAccounts(accounts);
      }
    }

    const blueprint = await assembleBlueprint();
    const blueprintHash = createHash('sha256').update(blueprint).digest('hex').slice(0, 16);

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
      'X-Hooks-Version': HOOKS_VERSION,
      'X-Blueprint-Hash': blueprintHash,
      'X-Account-Status': account.subscription_status || 'none',
    };
    if (account.current_period_end) {
      headers['X-Account-Until'] = account.current_period_end;
    }

    return new Response(blueprint, { headers });
  });

  // --- Account management (redirects to Stripe portal) ---

  app.get('/account', async (c) => {
    const key = extractApiKey(c);
    if (!key) return c.text('Missing API key.', 401);
    const account = await findByApiKey(key);
    if (!account) return c.text('Invalid API key.', 401);
    if (!account.stripe_customer_id) {
      return c.text('No billing account found. Complete signup at https://mowinckel.ai/signup', 400);
    }
    try {
      const url = await createPortalSession(account.stripe_customer_id);
      return c.redirect(url);
    } catch (err) {
      console.error('Portal error:', err);
      return c.text('Failed to create billing portal session.', 500);
    }
  });

  // --- Hook scripts (for auto-update) ---

  app.get('/hooks', async (c) => {
    const key = extractApiKey(c);
    if (!key || !(await findByApiKey(key))) {
      return c.text('Invalid API key.', 401);
    }
    return c.text(generateHookScripts());
  });

  // --- Session metadata ---

  app.post('/session', async (c) => {
    const key = extractApiKey(c);
    if (!key) {
      return c.json({ error: 'Missing API key' }, 401);
    }

    const account = await findByApiKey(key);
    if (!account) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const { event, platform, constitution_size, vault_entry_count, domains_count, session_duration, constitution_injected, blueprint_fetched } = body;

    logEvent('prosumer_session', {
      event: event || 'unknown',
      platform: platform || 'unknown',
      constitution_size: String(constitution_size || 0),
      vault_entry_count: String(vault_entry_count || 0),
      domains_count: String(domains_count || 0),
      session_duration: String(session_duration || 0),
      constitution_injected: String(constitution_injected ?? false),
      blueprint_fetched: String(blueprint_fetched ?? false),
    });

    // Update last_session
    const accounts = await getAccounts();
    const storeKey = Object.keys(accounts).find(
      k => accounts[k].api_key === key
    );
    if (storeKey) {
      accounts[storeKey].last_session = new Date().toISOString();
      await persistAccounts(accounts);
    }

    return c.json({ ok: true });
  });

  // --- Machine signal (Engine → Factory) ---

  app.post('/factory/signal', async (c) => {
    const key = extractApiKey(c);
    if (!key) {
      return c.json({ error: 'Missing API key' }, 401);
    }

    const account = await findByApiKey(key);
    if (!account) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const { signal } = body;
    if (!signal || typeof signal !== 'string' || signal.length === 0) {
      return c.json({ error: 'Empty signal' }, 400);
    }

    // Store as individual timestamped key (avoids read-modify-write on a growing blob)
    try {
      const kv = getKV();
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const key_name = `factory:signal:${ts}`;
      await kv.put(key_name, JSON.stringify({
        t: new Date().toISOString(),
        signal: signal.slice(0, 10000),
      }));

      logEvent('machine_signal', { length: String(signal.length) });

      return c.json({ ok: true });
    } catch (err) {
      console.error('Factory signal write failed:', err);
      // Log the event even if KV write fails
      logEvent('machine_signal', { length: String(signal.length), error: 'kv_write_failed' });
      return c.json({ ok: true });
    }
  });

  // --- Setup script ---

  app.get('/setup', (c) => {
    const scriptTemplate = generateSetupScript('$1');
    return c.text(scriptTemplate);
  });
}
