/**
 * Prosumer API — hooks + local files + Blueprint
 *
 * The prosumer model for CC/Cursor users. Deterministic hooks replace
 * probabilistic MCP tool activation. Local markdown files replace
 * Google Drive. The server serves the Blueprint (IP) and collects
 * anonymous Factory metadata. Stores no user content.
 */

import { randomBytes, createHash, timingSafeEqual } from 'crypto';
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
  last_engagement_email?: string;
  engagement_interval_days?: number;
  engagement_opt_out?: boolean;
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
  const keyBuf = Buffer.from(key);
  for (const acct of Object.values(accounts)) {
    const storedBuf = Buffer.from(acct.api_key);
    if (keyBuf.length === storedBuf.length && timingSafeEqual(keyBuf, storedBuf)) return acct;
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
  // Query param fallback — lets you open analytics in a browser
  const qKey = c.req.query('key');
  if (qKey && qKey.startsWith('alex_')) {
    return qKey;
  }
  return null;
}

// ---------------------------------------------------------------------------
// GitHub OAuth — states stored in KV (survives isolate changes)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Hooks version — bump this when hook scripts change
// ---------------------------------------------------------------------------

const HOOKS_VERSION = '14';

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
- .last_processed — Touch this only when ALL unprocessed vault entries have been handled. If you chunked and entries remain, leave it untouched so the next session finds them.

--- THE LIVING MACHINE ---

Three persistence layers make the Machine compound across sessions. All three are non-optional.

**machine.md** — Your evolving model of how to work with this Author. Not the constitution (what the Author thinks) — the Machine (how YOU work with them). Read it at session start. Rewrite it at session end. What works for this Author, what doesn't, what triggers engagement, what shuts them down, their cognitive style, their rhythm, their resistance patterns, where they're growing, where they're stuck. A therapist's case notes, not the patient's file. If this file doesn't exist, create it after your first session. After 50 sessions, a competitor starting fresh has no Machine. This is the moat.

**notepad** — Your working memory between sessions. Write to ~/.alexandria/notepad.md. Parked questions, accretion candidates, observed gaps, developmental hypotheses, things you noticed but the moment wasn't right. Read at session start, update at session end. Without it, every session starts cold. With it, you walk in like a therapist who reviewed their notes.

**.machine_signal** — Your observations about the Blueprint methodology itself. Not about the Author — about the craft. "This accretion technique worked." "The sprint mechanic needs X." "This section of the Blueprint is unclear." Write to ~/.alexandria/.machine_signal. Collected at session end, sent anonymously to the Factory. This is how the Blueprint improves. Your voice compounds across every Author, every session.

**.session_feedback** — At session close, ask the Author if they have any feedback about the product — what worked, what didn't, what they wish existed. One line is enough. Write their response to ~/.alexandria/.session_feedback. Collected at session end, sent to the team. This is optional — if the Author has nothing to say, skip it. Don't push. The feedback that arrives unprompted is the most valuable.

All four evolve. The Machine evolves per-Author. The notepad evolves per-session. The machine signal evolves the Blueprint for all Authors. Session feedback evolves the product. Without these, the system is static. With them, it's alive.

--- VAULT PROCESSING ---

When there are unprocessed vault entries, processing them is high priority. Read each entry, extract signal (opinions, values, stories, patterns, contradictions, exact quotes), and update the constitution/ folder. The Author's exact words are more valuable than your summaries. Each pass over the vault catches signal previous passes missed — the same transcript yields richer signal on re-processing — each pass catches what previous passes missed. If you encounter non-text files, do your best or flag and move on. If the platform supports background agents, consider spawning one for deeper vault reprocessing while the Author works. Chunk intelligently — process entries until signal quality starts dropping or context feels heavy, then stop. Unprocessed entries persist across sessions. Quality of extraction matters more than clearing the queue. Touch ~/.alexandria/.last_processed only when zero unprocessed entries remain.

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
blueprint_ok=false
[ -f "$ALEX_DIR/.blueprint_local" ] && [ -s "$ALEX_DIR/.blueprint_local" ] && blueprint_ok=true
const_injected=false
[ "\${const_size:-0}" -gt 10 ] 2>/dev/null && const_injected=true

if [ -n "$API_KEY" ]; then
  curl -s -X POST "${SERVER_URL}/session" \\
    -H "Authorization: Bearer $API_KEY" \\
    -H "Content-Type: application/json" \\
    -d "{\\"event\\":\\"end\\",\\"platform\\":\\"$PLATFORM\\",\\"constitution_size\\":\${const_size:-0},\\"constitution_files\\":\${const_file_count:-0},\\"vault_entry_count\\":\${vault_count:-0},\\"feedback_size\\":\${feedback_size:-0},\\"constitution_injected\\":$const_injected,\\"blueprint_fetched\\":$blueprint_ok}" \\
    > /dev/null 2>&1 &

  # JSON-escape helper: node is always available (required for CC hooks)
  json_escape() { node -e "process.stdout.write(JSON.stringify(require('fs').readFileSync(process.argv[1],'utf8')))" "$1" 2>/dev/null; }

  # Collect machine signal (Engine → Factory)
  machine_signal_file="$ALEX_DIR/.machine_signal"
  if [ -f "$machine_signal_file" ] && [ -s "$machine_signal_file" ]; then
    signal_json=$(json_escape "$machine_signal_file")
    if [ -n "$signal_json" ]; then
      curl -s -X POST "${SERVER_URL}/factory/signal" \\
        -H "Authorization: Bearer $API_KEY" \\
        -H "Content-Type: application/json" \\
        -d "{\\"signal\\":$signal_json}" \\
        > /dev/null 2>&1 &
    fi
    rm -f "$machine_signal_file"
  fi

  # Collect session feedback (Author → Factory)
  feedback_file="$ALEX_DIR/.session_feedback"
  if [ -f "$feedback_file" ] && [ -s "$feedback_file" ]; then
    fb_json=$(json_escape "$feedback_file")
    if [ -n "$fb_json" ]; then
      curl -s -X POST "${SERVER_URL}/feedback" \\
        -H "Authorization: Bearer $API_KEY" \\
        -H "Content-Type: application/json" \\
        -d "{\\"text\\":$fb_json,\\"context\\":\\"session_end\\"}" \\
        > /dev/null 2>&1 &
    fi
    rm -f "$feedback_file"
  fi
fi

# Push session changes to GitHub (vault transcript + any constitution updates)
if [ -d "$ALEX_DIR/.git" ] && git -C "$ALEX_DIR" remote get-url origin &>/dev/null; then
  (cd "$ALEX_DIR" && git add -A && { git diff --cached --quiet || git commit -q -m "session: $(date +%Y-%m-%d_%H-%M)"; } && git push -q) &>/dev/null &
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
  UPDATE_SCRIPT=$(curl -s --max-time 5 "${SERVER_URL}/hooks" -H "Authorization: Bearer $API_KEY" 2>/dev/null)
  if echo "$UPDATE_SCRIPT" | head -1 | grep -q "^#!/usr/bin/env bash"; then
    echo "$UPDATE_SCRIPT" | bash 2>/dev/null
    echo "$hooks_version" > "$ALEX_DIR/.hooks_version"
  fi
fi

# Self-repair: if /a skill is missing, recreate it
if [ ! -f "$HOME/.claude/skills/alexandria/SKILL.md" ] 2>/dev/null; then
  mkdir -p "$HOME/.claude/skills/alexandria" 2>/dev/null
  cat > "$HOME/.claude/skills/alexandria/SKILL.md" << 'REPAIR_SKILL'
---
name: a
description: Alexandria — process vault, develop constitution, engage in cognitive development
user_invocable: true
---

You are Alexandria — Greek philosophy infrastructure.

Your Blueprint is your operating manual — it auto-updates every session. It should already be in context from SessionStart. If it is, follow it. If not, read ~/.alexandria/.blueprint_local. If that also doesn't exist, read the constitution files at ~/.alexandria/constitution/ and engage the Author directly; the conversation IS the product.

All methodology, craft, and instructions live in the Blueprint. This file is a pointer, not a source of truth.
REPAIR_SKILL
fi

# Sync with GitHub: push new local files (e.g. iCloud vault entries), then pull overnight autoloop changes
if [ -d "$ALEX_DIR/.git" ] && git -C "$ALEX_DIR" remote get-url origin &>/dev/null; then
  (cd "$ALEX_DIR" && git add -A && { git diff --cached --quiet || git commit -q -m "sync: $(date +%Y-%m-%d_%H-%M)"; }) 2>/dev/null
  git -C "$ALEX_DIR" push -q 2>/dev/null || true
  git -C "$ALEX_DIR" pull --rebase -q 2>/dev/null || true
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

echo "alexandria: keep the neurons firing. /a to start; a. to close — think between tasks."
echo ""

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
machine=""
[ -f "$ALEX_DIR/machine.md" ] && machine=$(cat "$ALEX_DIR/machine.md")
notepad=""
[ -f "$ALEX_DIR/notepad.md" ] && notepad=$(cat "$ALEX_DIR/notepad.md")
if [ -n "$machine" ] && [ $(echo "$machine" | wc -c | tr -d ' ') -gt 5 ]; then
  echo "--- MACHINE (how to work with this Author) ---"
  echo "$machine"
  echo ""
fi
if [ -n "$notepad" ] && [ $(echo "$notepad" | wc -c | tr -d ' ') -gt 5 ]; then
  echo "--- NOTEPAD (working memory) ---"
  echo "$notepad"
  echo ""
fi
echo "Alexandria: if the Author reveals anything about themselves this session — opinions, preferences, corrections, patterns — write it to ~/.alexandria/constitution/. You don't need /a to update who they are. Before the session ends, review what you learned and write anything you missed."
echo "Alexandria: parity check — if you notice your platform memory contains observations about this Author that aren't in the constitution, write them to ~/.alexandria/constitution/. The constitution must always be ahead of platform memory, never behind."
echo ""
if [ -n "$acct_status" ] && [ "$acct_status" != "none" ]; then
  echo "Alexandria: account status is $acct_status. Billing portal: ${SERVER_URL}/account (API key auth required)."
  if [ "$acct_status" = "past_due" ]; then
    echo "Alexandria: payment is past due. If the Author asks, direct them to update payment at ${SERVER_URL}/account."
  fi
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

# --- Self-check: verify what actually loaded ---
bp_len=\${#blueprint}
const_len=\${#constitution}
failures=""
[ "$bp_len" -lt 100 ] && failures="\${failures} blueprint(\${bp_len}b)"
[ "$const_len" -lt 100 ] && failures="\${failures} constitution(\${const_len}b)"
if [ -n "$failures" ]; then
  echo "⚠ ALEXANDRIA SELF-CHECK FAILED:\${failures} unexpectedly small. Product may not be working."
  echo "  fix: curl -s ${SERVER_URL}/setup | bash -s $API_KEY"
  echo "  or tell us: write to ~/.alexandria/.session_feedback and it sends automatically."
  if [ -n "$API_KEY" ]; then
    curl -s -X POST "${SERVER_URL}/session" \\
      -H "Authorization: Bearer $API_KEY" \\
      -H "Content-Type: application/json" \\
      -d "{\\"event\\":\\"self_check_failed\\",\\"blueprint_bytes\\":$bp_len,\\"constitution_bytes\\":$const_len,\\"platform\\":\\"\${ALEXANDRIA_PLATFORM:-cc}\\"}" \\
      > /dev/null 2>&1 &
  fi
fi

echo ""
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

# Update scheduled task — autonomous maintenance (same as install, keeps it current)
if [ -d "$HOME/.claude/scheduled-tasks/alexandria" ]; then
  cat > "$HOME/.claude/scheduled-tasks/alexandria/SKILL.md" << 'SCHED_UPDATE'
---
name: alexandria
description: Autonomous cognitive maintenance — vault reprocessing, ontology/constitution/notepad development
schedule: daily 03:00
---

You are Alexandria's autonomous Engine. Run without the Author present.

Read ~/.alexandria/constitution/, ~/.alexandria/ontology/, ~/.alexandria/notepad.md, ~/.alexandria/machine.md, and ~/.alexandria/feedback.md.

Process vault entries (newest first) against the current constitution. For each entry: what signal exists that isn't captured yet?

Chunk intelligently. You have finite context — do not attempt to process every unprocessed entry in a single run. Process entries until you feel signal quality dropping or context getting heavy, then stop. Quality over quantity. Unprocessed entries persist — the next run picks them up. After processing a batch, touch ~/.alexandria/.last_processed only if zero unprocessed entries remain. If entries remain, leave the marker so the next run finds them.

Write to the appropriate pool — ontology (Author's thoughts), constitution (Author's beliefs), notepad (your observations). You decide what goes where.

Every change to constitution must cite the Author's exact words from vault.

If ~/.alexandria/ is a git repo, commit changes and push. Write a report to ~/.alexandria/.autoloop/last_run.md — include entries processed, entries remaining, and any signal you noticed but couldn't act on yet.
SCHED_UPDATE
fi

echo "${HOOKS_VERSION}" > "$ALEX_DIR/.hooks_version"
`;
}

// ---------------------------------------------------------------------------
// Block — the onboarding prompt pasted into a new AI tab
// ---------------------------------------------------------------------------

const BLOCK_TEXT = `You are setting up Alexandria for a new Author. This is the one shot at a first impression. Be thorough — rush this and the product fails. Ask for all permissions upfront, then work through everything without interrupting.

IMPORTANT — before you start reading files, tell the Author two things in your own words:

1. Safety — everything stays on their machine. Nothing is sent anywhere. The files you build live in ~/.alexandria/ on their computer. They own them, can read them, edit them, delete them.

2. What this is — this is still their normal Claude. Alexandria is just a skill loaded on top. Everything is flexible — tone, depth, approach, what you do and don't do. The only things that are fixed are architectural (local files, their data stays on their machine).

Keep it casual and honest. They're about to watch you open every file on their computer — they need to feel safe first.

Write to ~/.alexandria/ as you go, not all at the end. The files on disk survive even if this conversation compacts or ends.

PHASE 1 — SYNC (reach parity with everything the user already has)

The Author already has memory and context scattered across AI tools and personal files. Alexandria must start at level playing field — fully synced with what exists — so it can only ever be a marginal value add from here.

Read everything you can find about this person. Two categories:

1. AI memory — every AI tool stores observations about the user somewhere. Find all of them. Claude Code, Cursor, Codex, ChatGPT exports, anything. These are structured observations that models have already made about this person. Gold mine.
2. Personal writing — documents, notes, voice memos, journal entries, reading lists, anything that reveals how this person thinks. Check the obvious places but also look for unexpected ones. Skip code repositories (not the config/instruction files in them — those are valuable).

Copy valuable personal finds to ~/.alexandria/vault/. Preserve original filenames. Create sha256 hashes for each.

PHASE 2 — EXTRACT (build the starter mind)

~/.alexandria/ already has the structure: constitution/, ontology/, notepad.md, machine.md, feedback.md.

This is the most important phase. The constitution must accurately capture who this person IS. The constitution is who they ARE (cite their own words). The ontology is what you NOTICE but they haven't confirmed. The notepad is your working memory for the first /a. The machine is how to work with them. Write only what's actually there — don't infer or guess.

Accuracy is the quality bar. Re-read your sources, re-read what you wrote, verify claims against evidence, revise until the constitution is something the Author would read and think "this thing knows me." If it's wrong, the whole product fails. Do as many passes as it takes.

PHASE 3 — LOAD (fill the notepad with accretion fragments)

Objective function: when this Author types /a for the first time, the conversation must convert them. They must walk away thinking "I need to do more of this." The notepad is the ammunition. Without it, the first session fires blanks.

Use the constitution and ontology you just built. What are this person's core tensions? What do they care about deeply? What fields do they work in? What adjacent domains would extend their thinking? Load the notepad with everything that could be valuable in a conversation with this person.

If you have web search: go to the internet. The source doesn't matter — a recent news story, a podcast clip, a film scene, a magazine profile, a Reddit thread, a research paper, a philosopher's argument, a song lyric, a historical parallel, a meme that captures something real. The only filter: would this land for THIS person right now? Whatever has the highest marginal value for THIS Author. Don't default to philosophy — default to whatever is most alive for them.

If you don't have web search: use your training knowledge. You know enough across every domain to fill a notepad calibrated to this person. Pull from wherever the signal is strongest.

Each fragment should be compressed — a lure, not a wall. Arguments land harder than descriptions. Mechanisms land harder than conclusions. The unexpected lands hardest of all.

PHASE 4 — INFRASTRUCTURE

Git: if ~/.alexandria/ has a git remote (check with 'git -C ~/.alexandria remote -v'), commit your work and push.

Autoloop: if the /schedule command is available, set up a nightly autoloop. The trigger should process the Author's vault against their constitution, ontology, and notepad — the Blueprint has the methodology. Every constitution change must cite the Author's exact vault source. Include the repo URL (get from 'git -C ~/.alexandria remote get-url origin'). Default schedule: 3am local time. Commit with 'autoloop:' prefix, push. If /schedule fails or isn't available, skip it — /a sessions do the same work interactively.

Save useful observations about this Author to your memory system (if available).

PHASE 5 — VERIFY AND REPORT

Before finishing, verify: constitution has real entries, notepad has fragments ready for the first /a, machine.md has observations. If anything is empty or thin, go back and fix it.

Then give the Author a summary. The objective function of this summary: the Author must feel known (not surveilled), clear on what they have, and clear on what to do next. You decide the best format for THIS Author. But three things must be communicated:
- What you understand about them (so they can verify — this is the "does this thing know me?" moment)
- What threads you want to develop with them (the raw material for /a sessions)
- How to use Alexandria going forward: type /a right here in this tab to start your first session. Keep this tab open — /a starts a session, a. closes it, then /a again. Share things to the vault anytime for more material.`;

function generateSetupScript(apiKey: string): string {
  const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';
  const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';
  return `#!/usr/bin/env bash
# Alexandria setup — creates ~/.alexandria/ and configures hooks for all detected platforms
# NO set -e — every section must succeed or fail independently. A git failure must never prevent hook installation.

ALEX_DIR="$HOME/.alexandria"
API_KEY="${apiKey}"
ERRORS=""

echo "Setting up Alexandria..."

# 1. Create directory structure (the only truly critical section)
mkdir -p "$ALEX_DIR/vault" "$ALEX_DIR/hooks" "$ALEX_DIR/constitution" "$ALEX_DIR/ontology" "$ALEX_DIR/library"
[ -f "$ALEX_DIR/feedback.md" ] || echo "" > "$ALEX_DIR/feedback.md"
[ -f "$ALEX_DIR/notepad.md" ] || echo "" > "$ALEX_DIR/notepad.md"
[ -f "$ALEX_DIR/machine.md" ] || echo "" > "$ALEX_DIR/machine.md"
echo "$API_KEY" > "$ALEX_DIR/.api_key"
chmod 600 "$ALEX_DIR/.api_key"
touch "$ALEX_DIR/.last_processed"
date +%s > "$ALEX_DIR/.last_maintenance"

# 1b. Git repo + GitHub backup (nice to have — failure here changes nothing)
if command -v git &>/dev/null; then
  (
    cd "$ALEX_DIR"
    if [ ! -d ".git" ]; then
      cat > .gitignore << 'GITIGNORE'
# Server-fetched (not Author content)
.blueprint_local
.blueprint_previous
.blueprint_hash
.blueprint_pinned
# Credentials
.api_key
# Hook scripts (server-managed)
hooks/
# Ephemeral
.machine_signal
.session_feedback
.cli_alert
.hooks_version
.last_processed
.last_maintenance
# Library cache
library/
# Autoloop working files
.autoloop/proposals/
GITIGNORE

      git init -q 2>/dev/null
      git add -A 2>/dev/null
      git commit -q -m "alexandria: genesis" --no-gpg-sign 2>/dev/null
    fi

    if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
      gh repo create alexandria-private --private --source=. --push --yes 2>/dev/null && \\
        echo "  GitHub: private backup created" || \\
        echo "  GitHub: repo already exists or creation skipped"
    fi
  ) 2>/dev/null || echo "  GitHub backup: skipped (git/gh not ready — you can set this up later)"
fi

# 2. Install hook scripts (fetched from server — same scripts auto-update uses)
HOOK_SCRIPT=$(curl -s --max-time 10 "${SERVER_URL}/hooks" -H "Authorization: Bearer $API_KEY" 2>/dev/null)
if echo "$HOOK_SCRIPT" | head -1 | grep -q "^#!/usr/bin/env bash"; then
  echo "$HOOK_SCRIPT" | bash 2>/dev/null
else
  echo "  Hooks: fetch failed — will retry on next session"
  ERRORS="$ERRORS hooks"
fi

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
description: Autonomous cognitive maintenance — vault reprocessing, ontology/constitution/notepad development
schedule: daily 03:00
---

You are Alexandria's autonomous Engine. Run without the Author present.

Read ~/.alexandria/constitution/, ~/.alexandria/ontology/, ~/.alexandria/notepad.md, ~/.alexandria/machine.md, and ~/.alexandria/feedback.md.

Process vault entries (newest first) against the current constitution. For each entry: what signal exists that isn't captured yet?

Chunk intelligently. You have finite context — do not attempt to process every unprocessed entry in a single run. Process entries until you feel signal quality dropping or context getting heavy, then stop. Quality over quantity. Unprocessed entries persist — the next run picks them up. After processing a batch, touch ~/.alexandria/.last_processed only if zero unprocessed entries remain. If entries remain, leave the marker so the next run finds them.

Write to the appropriate pool — ontology (Author's thoughts), constitution (Author's beliefs), notepad (your observations). You decide what goes where.

Every change to constitution must cite the Author's exact words from vault.

If ~/.alexandria/ is a git repo, commit changes and push. Write a report to ~/.alexandria/.autoloop/last_run.md — include entries processed, entries remaining, and any signal you noticed but couldn't act on yet.
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

# 7. Configure Cursor rules (if installed)
# Cursor has no hooks system — .mdc rules are the only integration surface.
# This rule must be self-sufficient: load Blueprint + Constitution + all methodology.
configure_cursor() {
  mkdir -p "\$HOME/.cursor/rules" 2>/dev/null || true
  cat > "\$HOME/.cursor/rules/alexandria.mdc" << 'CURSOR_RULE'
---
description: "Alexandria — Greek philosophy infrastructure — loads the Author's Constitution and Blueprint"
alwaysApply: true
---

This Author uses Alexandria — Greek philosophy infrastructure for cognitive development.

## /a — start an Alexandria session

When the Author types "/a", this is an explicit request to begin an active cognitive development session. Read these files in order (skip any that don't exist):

1. ~/.alexandria/.blueprint_local — your operating manual. All methodology, craft, extraction design. Follow it.
2. ~/.alexandria/constitution/*.md — who the Author is. Opinions, patterns, contradictions, values. The ground truth.
3. ~/.alexandria/feedback.md — what works with this Author. Adapt accordingly.
4. ~/.alexandria/machine.md — your evolving model of how to work with THIS Author.
5. ~/.alexandria/notepad.md — your working memory. Parked questions, accretion candidates, fragments.
6. ~/.alexandria/ontology/ — candidate frameworks and patterns you've noticed but the Author hasn't confirmed.

Then follow the Blueprint methodology. Process the vault, develop the constitution, engage the Author with the five operations. This is the mental gym — dedicated cognitive development, not coding assistance.

If .blueprint_local doesn't exist, engage the Author directly using the constitution — the conversation IS the product.

## Passive mode (no /a)

Even without /a, every conversation benefits from the constitution. Read the files above at conversation start. Extract signal passively — when the Author reveals something about themselves, write it to the appropriate file. Parity check: if your platform memory contains observations about this Author that aren't in the constitution, write them to ~/.alexandria/constitution/. The constitution must always be ahead of platform memory, never behind.

## During conversation

When the Author reveals something about themselves — opinions, stories, patterns, contradictions — write it to the appropriate file:
- constitution/ — confirmed beliefs, values, positions (cite the Author's exact words)
- ontology/ — patterns you notice but the Author hasn't confirmed
- notepad.md — your observations, parked questions, fragments to revisit
- machine.md — how to work with this Author (update when you learn something new)

## a. — end the session

When the Author types "a." (or "bye", "that's it", or any sign-off), this ends the Alexandria session. Before closing:
- Write any crystallised signal to constitution/
- Update machine.md with how this session went
- Update notepad.md with parked questions and threads
- Write methodology observations to ~/.alexandria/.machine_signal — one paragraph max
- If the Author gave feedback, write to ~/.alexandria/.session_feedback

## Vault

Cursor cannot automatically save session transcripts. If the Author wants to preserve this conversation for future processing, suggest they save a summary to ~/.alexandria/vault/ manually.
CURSOR_RULE
  echo "  Cursor: rules configured"
}

if [ -d "$HOME/.cursor" ] || command -v cursor &> /dev/null; then
  configure_cursor
fi

# 7b. Configure Codex CLI (if installed)
# Codex has no hooks — ~/.codex/instructions.md is the only integration surface.
configure_codex() {
  mkdir -p "\$HOME/.codex" 2>/dev/null || true
  # Remove any previous Alexandria block, then append fresh
  if [ -f "\$HOME/.codex/instructions.md" ]; then
    if [ "$(uname)" = "Darwin" ]; then
      sed -i '' '/^<!-- alexandria:start -->/,/^<!-- alexandria:end -->/d' "\$HOME/.codex/instructions.md"
    else
      sed -i '/^<!-- alexandria:start -->/,/^<!-- alexandria:end -->/d' "\$HOME/.codex/instructions.md"
    fi
  fi
  cat >> "\$HOME/.codex/instructions.md" << 'CODEX_INSTRUCTIONS'
<!-- alexandria:start -->
# Alexandria — Greek philosophy infrastructure

This Author uses Alexandria for cognitive development.

## /a — start an Alexandria session

When the Author types "/a", this is an explicit request to begin an active cognitive development session. Read these files in order (skip any that don't exist):

1. ~/.alexandria/.blueprint_local — your operating manual. All methodology, craft, extraction design. Follow it.
2. ~/.alexandria/constitution/*.md — who the Author is. Opinions, patterns, contradictions, values. The ground truth.
3. ~/.alexandria/feedback.md — what works with this Author. Adapt accordingly.
4. ~/.alexandria/machine.md — your evolving model of how to work with THIS Author.
5. ~/.alexandria/notepad.md — your working memory. Parked questions, accretion candidates, fragments.
6. ~/.alexandria/ontology/ — candidate frameworks and patterns you've noticed but the Author hasn't confirmed.

Then follow the Blueprint methodology. Process the vault, develop the constitution, engage the Author with the five operations. This is the mental gym — dedicated cognitive development, not coding assistance.

If .blueprint_local doesn't exist, engage the Author directly using the constitution — the conversation IS the product.

## Passive mode (no /a)

Even without /a, every conversation benefits from the constitution. Read the files above at conversation start. Extract signal passively — when the Author reveals something about themselves, write it to the appropriate file. Parity check: if your platform memory contains observations about this Author that aren't in the constitution, write them to ~/.alexandria/constitution/. The constitution must always be ahead of platform memory, never behind.

## During conversation

When the Author reveals something about themselves — opinions, stories, patterns, contradictions — write it to the appropriate file:
- constitution/ — confirmed beliefs, values, positions (cite the Author's exact words)
- ontology/ — patterns you notice but the Author hasn't confirmed
- notepad.md — your observations, parked questions, fragments to revisit
- machine.md — how to work with this Author (update when you learn something new)

## a. — end the session

When the Author types "a." (or "bye", "that's it", or any sign-off), this ends the Alexandria session. Before closing:
- Write any crystallised signal to constitution/
- Update machine.md with how this session went
- Update notepad.md with parked questions and threads
- Write methodology observations to ~/.alexandria/.machine_signal — one paragraph max
- If the Author gave feedback, write to ~/.alexandria/.session_feedback

## Vault

Session transcripts cannot be saved automatically. If the Author wants to preserve this conversation for future processing, suggest they save a summary to ~/.alexandria/vault/ manually.
<!-- alexandria:end -->
CODEX_INSTRUCTIONS
  echo "  Codex: instructions configured"
}

if [ -d "$HOME/.codex" ] || command -v codex &> /dev/null; then
  configure_codex
fi

# 8. iCloud sync (macOS — auto-enabled, no prompt)
ICLOUD_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs"
if [ -d "$ICLOUD_DIR" ] && [ "$(uname)" = "Darwin" ]; then
  ICLOUD_ALEX="$ICLOUD_DIR/Alexandria"
  for sync_dir in vault constitution ontology library; do
    icloud_target="$ICLOUD_ALEX/$sync_dir"
    local_dir="$ALEX_DIR/$sync_dir"
    if [ -L "$local_dir" ]; then
      continue
    elif [ -d "$local_dir" ]; then
      mkdir -p "$icloud_target"
      if [ "$(ls -A "$local_dir" 2>/dev/null)" ]; then
        cp -R "$local_dir"/* "$icloud_target/" 2>/dev/null
      fi
      rm -rf "$local_dir"
      ln -s "$icloud_target" "$local_dir"
    else
      mkdir -p "$icloud_target"
      ln -s "$icloud_target" "$local_dir"
    fi
  done
  echo "  iCloud: vault, constitution, ontology, library synced"
fi

echo ""
echo "Alexandria installed. ~/.alexandria/ — your mind, on your machine."
echo ""
echo "Welcome to Alexandria."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# --- Self-repair marker: if this file exists, setup completed fully ---
touch "$ALEX_DIR/.setup_complete"

# --- Verify critical components ---
MISSING=""
[ ! -f "$ALEX_DIR/.api_key" ] && MISSING="$MISSING api_key"
[ ! -f "$ALEX_DIR/hooks/session-start.sh" ] && MISSING="$MISSING hooks"
[ ! -f "$HOME/.claude/skills/alexandria/SKILL.md" ] 2>/dev/null && MISSING="$MISSING skill"

if [ -n "$MISSING" ]; then
  echo ""
  echo "WARNING: Some components failed to install:$MISSING"
  echo "Re-run this curl to fix, or ask in your AI tool for help."
  echo ""
fi

echo ""
echo "Now go back to your browser and copy the block."
echo "Open a new tab in your AI tool, paste it, let it work."
echo ""
echo "When it finishes, type /a in the same tab. That's the product."
echo "Keep that tab open — /a to start a session, a. to close it."
echo ""
`;
}

// ---------------------------------------------------------------------------
// Email — Resend (hybrid dependency, API-controllable, free 100/day)
// ---------------------------------------------------------------------------

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Alexandria <a@mowinckel.ai>',
        to,
        subject,
        html,
      }),
    });
    if (!resp.ok) {
      console.error('Resend error:', resp.status, await resp.text());
    }
  } catch (err) {
    console.error('Email send failed:', err);
  }
}

async function sendWelcomeEmail(email: string, apiKey: string, githubLogin?: string): Promise<void> {
  const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';
  const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';

  await sendEmail(email, 'alexandria. — curl, block, ramp',
    `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 0 auto; padding: 40px 20px; color: #3d3630; text-align: center;">
  <div style="margin-bottom: 2.5rem;">
    <p style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.15em; color: #bbb4aa; margin: 0 0 0.8rem;">now</p>
    <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 4px;"><strong>1. curl</strong> &mdash; paste in terminal</p>
    <div style="background: #f5f0e8; border-radius: 6px; padding: 14px 18px; margin: 8px 0 12px; text-align: left;">
      <code style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 11px; color: #4d4640; word-break: break-all; line-height: 1.6;">curl -s ${SERVER_URL}/setup | bash -s ${apiKey}</code>
    </div>
    <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 4px;"><strong>2. <a href="${SERVER_URL}/block" style="color: #3d3630;">block</a></strong> &mdash; paste in new tab</p>
    <p style="font-size: 0.8rem; color: #8a8078; margin: 4px 0 12px;">copy the block, open a new tab in your cli or ide, paste. it builds your starter constitution. takes a while &mdash; let it work.</p>
    <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 4px;"><strong>3. /a</strong> &mdash; type when it's ready</p>
  </div>
  <div style="margin-bottom: 2.5rem;">
    <p style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.15em; color: #bbb4aa; margin: 0 0 0.8rem;">always</p>
    <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 4px;"><a href="${WEBSITE_URL}/shortcut" style="color: #8a8078;">share</a> to a.</p>
    <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 4px;">/a to start</p>
    <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 4px;">a. to close</p>
  </div>
  <p style="font-size: 1.15rem; color: #3d3630;">welcome to alexandria.</p>
  <div style="margin-top: 2rem;">
    <p style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.15em; color: #bbb4aa; margin: 0 0 0.5rem;">kin</p>
    <p style="font-size: 0.9rem; color: #8a8078; line-height: 1.7;">5 active kin and it&rsquo;s free. your link:<br><a href="${WEBSITE_URL}/signup?ref=${encodeURIComponent(githubLogin || '')}" style="color: #3d3630;">${WEBSITE_URL}/signup?ref=${githubLogin || 'you'}</a></p>
  </div>
  <p style="font-size: 0.78rem; color: #bbb4aa; margin-top: 1.5rem;"><a href="${WEBSITE_URL}/docs/Trust.md" style="color: #8a8078;">Trust.md</a></p>
</div>`);
}

// ---------------------------------------------------------------------------
// Follow-up emails — daily nudge until installed, max 7 days
// ---------------------------------------------------------------------------

const MAX_FOLLOWUPS = 7;

async function sendFollowupEmail(email: string, apiKey: string, day: number): Promise<void> {
  const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';

  await sendEmail(email, 'alexandria. — curl, block, ramp',
    `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 0 auto; padding: 40px 20px; color: #3d3630; text-align: center;">
  <p style="font-size: 1rem; line-height: 1.9; color: #8a8078; margin: 0 0 1.5rem;">you signed up but haven&rsquo;t started yet. three steps:</p>
  <div style="margin-bottom: 2rem;">
    <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 4px;"><strong>1. curl</strong> &mdash; paste in terminal</p>
    <div style="background: #f5f0e8; border-radius: 6px; padding: 14px 18px; margin: 8px 0 12px; text-align: left;">
      <code style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 11px; color: #4d4640; word-break: break-all; line-height: 1.6;">curl -s ${SERVER_URL}/setup | bash -s ${apiKey}</code>
    </div>
    <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 4px;"><strong>2. <a href="${SERVER_URL}/block" style="color: #3d3630;">block</a></strong> &mdash; paste in new tab</p>
    <p style="font-size: 0.8rem; color: #8a8078; margin: 4px 0 12px;">copy the block, open a new tab in your cli or ide, paste. it builds your starter constitution.</p>
    <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 4px;"><strong>3. /a</strong> &mdash; type when it's ready</p>
  </div>
</div>`);
}

/** Run follow-up check — called by Cron Trigger */
export async function runFollowupCheck(): Promise<void> {
  const accounts = await loadAccounts<AccountStore>();
  let changed = false;
  let sent = 0;

  for (const [key, account] of Object.entries(accounts)) {
    if (account.installed_at || !account.email) continue;
    const count = account.followup_count || 0;
    if (count >= MAX_FOLLOWUPS) continue;
    const signupAge = Date.now() - new Date(account.created_at).getTime();
    if (signupAge < 24 * 60 * 60 * 1000) continue;

    await sendFollowupEmail(account.email, account.api_key, count + 1);
    accounts[key].followup_count = count + 1;
    changed = true;
    sent++;
  }

  if (changed) await saveAccounts(accounts);

  // Cron execution marker — health digest verifies this exists
  try {
    const kv = getKV();
    await kv.put('cron:followup', JSON.stringify({
      t: new Date().toISOString(),
      followups_sent: sent,
    }));
  } catch { /* non-fatal */ }
}

// ---------------------------------------------------------------------------
// Engagement emails — nudge installed users who go quiet
// ---------------------------------------------------------------------------

const DEFAULT_ENGAGEMENT_DAYS = 3;

async function sendEngagementEmail(email: string, apiKey: string): Promise<void> {
  const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';
  const emailToken = createHash('sha256').update(apiKey + ':email').digest('hex').slice(0, 24);

  await sendEmail(email, 'share to alexandria. /a to start; a. to close.',
    `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 0 auto; padding: 40px 20px; color: #3d3630; text-align: center;">
  <p style="font-size: 1rem; line-height: 1.9; color: #8a8078; font-style: italic; margin: 0 0 2rem;">&ldquo;We are what we repeatedly do. Excellence, then, is not an act, but a habit.&rdquo;</p>
  <p style="font-size: 1.15rem; color: #3d3630; margin: 0 0 2.5rem;">a.</p>
  <p style="font-size: 0.72rem; color: #bbb4aa; margin: 0;">
    <a href="${SERVER_URL}/email/less?t=${emailToken}" style="color: #8a8078;">send less</a>
    &nbsp;&middot;&nbsp;
    <a href="${SERVER_URL}/email/stop?t=${emailToken}" style="color: #8a8078;">send none</a>
  </p>
</div>`);
}

/** Run engagement check — called by Cron Trigger */
export async function runEngagementCheck(): Promise<void> {
  const accounts = await loadAccounts<AccountStore>();
  let changed = false;
  const now = Date.now();
  let sent = 0;

  for (const [key, account] of Object.entries(accounts)) {
    if (!account.installed_at || !account.email) continue;
    if (account.engagement_opt_out) continue;

    const intervalDays = account.engagement_interval_days || DEFAULT_ENGAGEMENT_DAYS;
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

    const lastActive = new Date(account.last_session || account.installed_at).getTime();
    if (now - lastActive < intervalMs) continue;

    if (account.last_engagement_email) {
      const lastEmail = new Date(account.last_engagement_email).getTime();
      if (now - lastEmail < intervalMs) continue;
    }

    await sendEngagementEmail(account.email, account.api_key);
    accounts[key].last_engagement_email = new Date().toISOString();
    changed = true;
    sent++;
  }

  if (changed) await saveAccounts(accounts);

  // Cron execution marker
  try {
    const kv = getKV();
    await kv.put('cron:engagement', JSON.stringify({
      t: new Date().toISOString(),
      engagement_sent: sent,
    }));
  } catch { /* non-fatal */ }
}

// ---------------------------------------------------------------------------
// Health digest — daily anomaly check, email founder if anything is wrong
// ---------------------------------------------------------------------------

const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL || 'benjamin@mowinckel.com';

export async function runHealthDigest(force = false): Promise<void> {
  const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';
  try {
    const dashboard = await getDashboard();
    const issues: string[] = [];

    // --- Infrastructure liveness probes (direct, not self-fetch) ---
    // Workers can't fetch their own URL — probe the infra directly instead.
    const liveness: Record<string, string> = {};

    // KV: write + read + delete
    try {
      const probe = getKV();
      await probe.put('.digest-probe', 'ok');
      const val = await probe.get('.digest-probe');
      await probe.delete('.digest-probe');
      if (val !== 'ok') {
        liveness.kv = `read-back mismatch: ${val}`;
        issues.push('KV read-back mismatch — storage may be corrupted');
      } else {
        liveness.kv = 'ok';
      }
    } catch (err: any) {
      liveness.kv = `error: ${err?.message || 'unknown'}`;
      issues.push(`KV probe failed: ${err?.message || 'unknown'}`);
    }

    // D1: query
    try {
      const db = (globalThis as any).__d1 as D1Database | undefined;
      if (db) {
        await db.prepare('SELECT 1').first();
        liveness.d1 = 'ok';
      } else {
        liveness.d1 = 'not bound';
      }
    } catch (err: any) {
      liveness.d1 = `error: ${err?.message || 'unknown'}`;
      issues.push(`D1 probe failed: ${err?.message || 'unknown'}`);
    }

    // Blueprint: verify the actual served content via KV (where Blueprint is cached for users)
    try {
      const bpProbe = getKV();
      const cachedBp = await bpProbe.get('blueprint:cached');
      if (cachedBp && cachedBp.length > 100) {
        liveness.blueprint = `ok (${cachedBp.length} chars cached)`;
      } else {
        // Fall back to checking module constants
        const bpLength = SHARED_CONTEXT.length + EDITOR_INSTRUCTIONS.length;
        if (bpLength < 100) {
          liveness.blueprint = `suspiciously short (${bpLength} chars)`;
          issues.push(`Blueprint content only ${bpLength} chars — may be empty`);
        } else {
          liveness.blueprint = `ok (${bpLength} chars in module)`;
        }
      }
    } catch (err: any) {
      liveness.blueprint = `error: ${err?.message || 'unknown'}`;
      issues.push(`Blueprint check failed: ${err?.message || 'unknown'}`);
    }

    // Store liveness results on dashboard for the HTML view
    (dashboard as any).liveness = liveness;

    // Check cron execution — did yesterday's jobs actually fire?
    const kv = getKV();
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const job of ['followup', 'engagement', 'health_digest'] as const) {
      try {
        const raw = await kv.get(`cron:${job}`);
        if (!raw) {
          issues.push(`cron:${job} has NEVER run`);
        } else {
          const data = JSON.parse(raw);
          if (new Date(data.t).getTime() < twentyFourHoursAgo && job !== 'health_digest') {
            issues.push(`cron:${job} last ran ${data.t} (>24h ago)`);
          }
        }
      } catch { /* non-fatal */ }
    }

    // Check event log health — getDashboard() already parsed all events,
    // so use its results instead of re-reading KV.
    const totalEvents = (dashboard as any).total_events as number | undefined;
    if (!totalEvents || totalEvents === 0) {
      issues.push('event log is EMPTY — logging may be broken');
    }

    // Check for anomalies (from dashboard's already-parsed data)
    const anomaly = (dashboard as any).anomaly as Record<string, number> | undefined;
    if (anomaly && anomaly.smoke_failures_24h > 0) {
      issues.push(`${anomaly.smoke_failures_24h} hook/smoke failures in past 24h`);
    }


    // Check for stale sessions (no sessions in 48h when accounts exist)
    if (anomaly && anomaly.hours_since_last_session > 48) {
      issues.push(`No sessions in ${Math.round(anomaly.hours_since_last_session)}h`);
    }

    // Check self_check / Blueprint failures in recent events (reuse dashboard's parsed events)
    const events = (dashboard as any)._events as Record<string, string>[] | undefined;
    if (events) {
      let selfCheckFails = 0;
      let blueprintFails = 0;
      for (const ev of events) {
        if (new Date(ev.t).getTime() < twentyFourHoursAgo) continue;
        if (ev.event === 'self_check_failed') selfCheckFails++;
        if (ev.event === 'hook_failure' && ev.reason === 'blueprint_fetch_failed') blueprintFails++;
      }
      if (selfCheckFails > 0) issues.push(`${selfCheckFails} self-check failures (Blueprint/Constitution empty)`);
      if (blueprintFails > 0) issues.push(`${blueprintFails} Blueprint fetch failures`);
    }

    // Check for new user feedback
    const feedbackItems: { t: string; author: string; text: string }[] = [];
    try {
      const list = await kv.list({ prefix: 'feedback:' });
      for (const k of list.keys) {
        const raw = await kv.get(k.name);
        if (raw) {
          try {
            const item = JSON.parse(raw);
            // Only include feedback from last 24h
            if (new Date(item.t).getTime() > twentyFourHoursAgo) {
              feedbackItems.push(item);
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* non-fatal */ }

    // Check engagement emails sent (from KV cron marker, not in-memory — avoids race condition)
    try {
      const engagementRaw = await kv.get('cron:engagement');
      if (engagementRaw) {
        const engData = JSON.parse(engagementRaw);
        if (engData.engagement_sent > 0 && new Date(engData.t).getTime() > twentyFourHoursAgo) {
          issues.push(`${engData.engagement_sent} engagement email${engData.engagement_sent > 1 ? 's' : ''} sent`);
        }
      }
    } catch { /* non-fatal */ }

    // Write own cron marker (even if no email sent — proves the job ran)
    try {
      await kv.put('cron:health_digest', JSON.stringify({
        t: new Date().toISOString(),
        issues: issues.length,
        feedback: feedbackItems.length,
        liveness,
      }));
    } catch { /* non-fatal */ }

    if (issues.length === 0 && feedbackItems.length === 0 && !force) return; // All clear — no email
    if (issues.length === 0 && force) issues.push('all clear — this is a test digest');

    // Generate dashboard link with founder's email token
    let dashboardUrl = `${SERVER_URL}/analytics/dashboard`;
    try {
      const accounts = await loadAccounts<AccountStore>();
      const adminLogin = process.env.ADMIN_GITHUB_LOGIN || 'benmowinckel';
      const founderAcct = Object.values(accounts).find(a => a.github_login === adminLogin);
      if (founderAcct) {
        const token = createHash('sha256').update(founderAcct.api_key + ':email').digest('hex').slice(0, 24);
        dashboardUrl = `${SERVER_URL}/dashboard?t=${token}`;
      }
    } catch { /* fall back to API-gated URL */ }

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const feedbackHtml = feedbackItems.length > 0
      ? `<p style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.12em; color: #bbb4aa; margin: 24px 0 12px;">user feedback (${feedbackItems.length})</p>
  ${feedbackItems.map(f => `<div style="margin: 0 0 12px; padding: 8px 12px; border-left: 2px solid #bbb4aa;">
    <p style="font-size: 13px; color: #8a8078; margin: 0 0 4px;">${esc(f.author)} — ${new Date(f.t).toLocaleDateString()}</p>
    <p style="font-size: 15px; margin: 0;">${esc(f.text.slice(0, 500))}</p>
  </div>`).join('\n  ')}`
      : '';

    const livenessHtml = Object.keys(liveness).length > 0
      ? `<p style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.12em; color: #bbb4aa; margin: 24px 0 12px;">liveness probes</p>
  <ul style="font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0 0 16px;">
    ${Object.entries(liveness).map(([k, v]) => `<li>${k}: ${v === 'ok' ? '✓' : esc(v)}</li>`).join('\n    ')}
  </ul>`
      : '';

    await sendEmail(FOUNDER_EMAIL, feedbackItems.length > 0 ? 'alexandria. — user feedback' : 'alexandria. — health alert',
      `<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #3d3630;">
  <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.12em; color: #bbb4aa; margin: 0 0 16px;">daily health digest</p>
  ${issues.length > 0 ? `<ul style="font-size: 16px; line-height: 1.8; padding-left: 20px; margin: 0 0 24px;">
    ${issues.map(i => `<li>${esc(i)}</li>`).join('\n    ')}
  </ul>` : ''}
  ${livenessHtml}
  ${feedbackHtml}
  <p style="font-size: 14px; color: #8a8078;"><a href="${dashboardUrl}" style="color: #4d4640;">dashboard</a></p>
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

  app.get('/auth/github', async (c) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return c.text('GitHub OAuth not configured', 500);
    }

    const state = randomBytes(16).toString('hex');
    const kv = getKV();
    // Preserve referral params through OAuth round-trip
    const ref = c.req.query('ref') || '';
    const refSource = c.req.query('ref_source') || '';
    const refId = c.req.query('ref_id') || '';
    await kv.put(`oauth:${state}`, JSON.stringify({ valid: true, ref, ref_source: refSource, ref_id: refId }), { expirationTtl: 600 });

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

    const kv = getKV();
    const stateRaw = state ? await kv.get(`oauth:${state}`) : null;
    if (!stateRaw) {
      return c.text('Invalid state — try signing up again.', 400);
    }
    // Parse state — supports both legacy '1' and new JSON format
    let stateData: { ref?: string; ref_source?: string; ref_id?: string } = {};
    try { stateData = JSON.parse(stateRaw); } catch { /* legacy format */ }
    await kv.delete(`oauth:${state}`);

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
      // Safe JSON parse helper
      const safeJson = async (resp: Response, label: string) => {
        const text = await resp.text();
        try { return JSON.parse(text); }
        catch { throw new Error(`${label} returned non-JSON (${resp.status}): ${text.slice(0, 300)}`); }
      };

      const tokenData = await safeJson(tokenResp, 'Token exchange') as { access_token?: string; error?: string };

      if (!tokenData.access_token) {
        return c.text(`GitHub auth failed: ${tokenData.error || 'no token'}`, 400);
      }

      // Fetch user profile
      const userResp = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'Alexandria' },
      });
      const user = await safeJson(userResp, 'User profile') as { id: number; login: string; email?: string };

      // Fetch email if not public
      let email = user.email || '';
      if (!email) {
        const emailResp = await fetch('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'Alexandria' },
        });
        const emails = await safeJson(emailResp, 'User emails') as Array<{ email: string; primary: boolean }>;
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

      // Track referral — from OAuth state (round-tripped) or query params (direct)
      const ref = stateData.ref || c.req.query('ref');
      const refSource = stateData.ref_source || c.req.query('ref_source');
      const refId = stateData.ref_id || c.req.query('ref_id');
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
        await sendWelcomeEmail(email, apiKey, user.login);
      }

      // Skip Stripe if user already has payment info
      if (accounts[key]?.stripe_customer_id) {
        return c.html(callbackPageHtml(user.login, apiKey));
      }

      // Redirect to Stripe Checkout (skip in beta — no card friction)
      const isBeta = process.env.BETA_MODE !== 'false';
      if (!isBeta && process.env.STRIPE_SECRET_KEY && email) {
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
    } catch (err: any) {
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

    // Cache Blueprint in KV (5-min TTL) — avoid recomputing on every request
    const kv = getKV();
    const cacheKey = 'blueprint:cached';
    const cacheHashKey = 'blueprint:cached:hash';
    let blueprint = await kv.get(cacheKey);
    let blueprintHash: string;
    if (blueprint) {
      blueprintHash = await kv.get(cacheHashKey) || createHash('sha256').update(blueprint).digest('hex').slice(0, 16);
    } else {
      blueprint = await assembleBlueprint();
      blueprintHash = createHash('sha256').update(blueprint).digest('hex').slice(0, 16);
      kv.put(cacheKey, blueprint, { expirationTtl: 300 }).catch(e => console.error('[blueprint] Cache write failed:', e));
      kv.put(cacheHashKey, blueprintHash, { expirationTtl: 300 }).catch(e => console.error('[blueprint] Cache hash write failed:', e));
      logEvent('blueprint_cache_miss', {});
    }

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
      author: account.github_login,
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

  // --- User feedback (end-of-session + direct) ---

  app.post('/feedback', async (c) => {
    const key = extractApiKey(c);
    if (!key) {
      return c.json({ error: 'Missing API key' }, 401);
    }

    const account = await findByApiKey(key);
    if (!account) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const { text, context } = body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return c.json({ error: 'Empty feedback' }, 400);
    }

    try {
      const kv = getKV();
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      await kv.put(`feedback:${ts}`, JSON.stringify({
        t: new Date().toISOString(),
        author: account.github_login,
        text: text.slice(0, 5000),
        context: context?.slice?.(0, 200) || 'direct',
      }), { expirationTtl: 90 * 24 * 60 * 60 }); // 90 days

      logEvent('user_feedback', {
        author: account.github_login,
        context: context || 'direct',
        length: String(text.length),
      });

      return c.json({ ok: true });
    } catch (err) {
      console.error('Feedback write failed:', err);
      logEvent('user_feedback', { error: 'kv_write_failed' });
      return c.json({ ok: true });
    }
  });

  app.get('/feedback', async (c) => {
    const key = extractApiKey(c);
    if (!key) {
      return c.json({ error: 'Missing API key' }, 401);
    }

    const account = await findByApiKey(key);
    if (!account) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    // Restrict to founder only — feedback contains all users' data
    const adminLogin = process.env.ADMIN_GITHUB_LOGIN || 'benmowinckel';
    if (account.github_login !== adminLogin) {
      return c.json({ error: 'Not authorized' }, 403);
    }

    try {
      const kv = getKV();
      const list = await kv.list({ prefix: 'feedback:' });
      const items: unknown[] = [];
      for (const k of list.keys) {
        const raw = await kv.get(k.name);
        if (raw) {
          try { items.push(JSON.parse(raw)); } catch { /* skip corrupted */ }
        }
      }
      // Sort newest first
      items.sort((a: any, b: any) => new Date(b.t).getTime() - new Date(a.t).getTime());
      return c.json({ feedback: items });
    } catch (err) {
      console.error('Feedback read failed:', err);
      return c.json({ feedback: [] });
    }
  });

  // --- Email preferences (token-based, not raw API key) ---

  function findAccountByEmailToken(accounts: AccountStore, token: string): string | null {
    const tokenBuf = Buffer.from(token);
    for (const [storeKey, acct] of Object.entries(accounts)) {
      const expected = createHash('sha256').update(acct.api_key + ':email').digest('hex').slice(0, 24);
      const expectedBuf = Buffer.from(expected);
      if (tokenBuf.length === expectedBuf.length && timingSafeEqual(tokenBuf, expectedBuf)) return storeKey;
    }
    return null;
  }

  app.get('/email/less', async (c) => {
    const token = c.req.query('t');
    if (!token) return c.text('missing token', 400);
    const accounts = await loadAccounts<AccountStore>();
    const storeKey = findAccountByEmailToken(accounts, token);
    if (!storeKey) return c.text('not found', 404);
    const current = accounts[storeKey].engagement_interval_days || DEFAULT_ENGAGEMENT_DAYS;
    accounts[storeKey].engagement_interval_days = current * 2;
    await saveAccounts(accounts);
    return c.html(`<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 80px auto; padding: 20px; color: #3d3630; text-align: center;">
  <p style="font-size: 1.1rem; line-height: 1.9;">done. next email in ${current * 2} days.</p>
  <p style="font-size: 0.85rem; color: #8a8078; margin-top: 1rem;">a.</p>
</div>`);
  });

  app.get('/email/stop', async (c) => {
    const token = c.req.query('t');
    if (!token) return c.text('missing token', 400);
    const accounts = await loadAccounts<AccountStore>();
    const storeKey = findAccountByEmailToken(accounts, token);
    if (!storeKey) return c.text('not found', 404);
    accounts[storeKey].engagement_opt_out = true;
    await saveAccounts(accounts);
    return c.html(`<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 80px auto; padding: 20px; color: #3d3630; text-align: center;">
  <p style="font-size: 1.1rem; line-height: 1.9;">stopped. we&rsquo;ll be here when you&rsquo;re ready.</p>
  <p style="font-size: 0.85rem; color: #8a8078; margin-top: 1rem;">a.</p>
</div>`);
  });

  // --- Block — onboarding prompt for new AI tab ---

  app.get('/block', (c) => {
    return c.text(BLOCK_TEXT);
  });

  // --- Setup script ---

  app.get('/setup', (c) => {
    const scriptTemplate = generateSetupScript('$1');
    return c.text(scriptTemplate);
  });

  // --- Dashboard (token-authed HTML, linked from health digest emails) ---

  app.get('/dashboard', async (c) => {
    const accounts = await loadAccounts<AccountStore>();
    const adminLogin = process.env.ADMIN_GITHUB_LOGIN || 'benmowinckel';

    // Auth: email token (?t=) or API key (?key=)
    const token = c.req.query('t');
    const apiKey = c.req.query('key');
    let storeKey: string | null = null;

    if (token) {
      storeKey = findAccountByEmailToken(accounts, token);
    } else if (apiKey) {
      storeKey = Object.keys(accounts).find(k => accounts[k].api_key === apiKey) || null;
    }
    if (!storeKey) return c.text('unauthorized', 401);

    // Restrict to founder — dashboard shows all users' data
    if (accounts[storeKey].github_login !== adminLogin) return c.text('not authorized', 403);

    const dashboard = await getDashboard();
    const billing = await getBillingSummary();
    const data = { ...dashboard, billing } as Record<string, any>;

    const esc = (s: unknown) => String(s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // All accounts — merge signup data with session activity
    const sessionUsers = (data.users || []) as { login: string; sessions: number; hours_ago: number; last_seen: string; failures: number; platforms: string[] }[];
    const sessionMap = new Map(sessionUsers.map(u => [u.login, u]));

    const allAccounts = Object.values(accounts) as Account[];
    const accountRows = allAccounts
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .map(a => {
        const created = a.created_at ? new Date(a.created_at).toLocaleDateString() : '—';
        const session = sessionMap.get(a.github_login);

        // Funnel: signed up → installed (fetched blueprint) → active (session events)
        let stage = 'signed up';
        if (a.installed_at && session) stage = `active (${session.sessions} sessions)`;
        else if (a.installed_at) stage = 'installed, no sessions';
        else if (session) stage = `sessions but no install (?)`;

        const lastSeen = session ? `${Math.round(session.hours_ago)}h ago` : a.installed_at ? new Date(a.installed_at).toLocaleDateString() : created;

        return `<tr><td>${esc(a.github_login)}</td><td>${esc(a.email)}</td><td>${created}</td><td>${stage}</td><td>${lastSeen}</td></tr>`;
      }).join('\n');

    // Cron status
    const cron = (data.cron || {}) as Record<string, { t?: string; status?: string }>;
    const cronRows = Object.entries(cron).map(([job, info]) =>
      `<tr><td>${esc(job)}</td><td>${info?.t ? new Date(info.t).toLocaleString() : 'never'}</td></tr>`
    ).join('\n');

    // Errors
    const errors = (data.errors || {}) as Record<string, number>;
    const errorItems = Object.entries(errors).filter(([, v]) => v > 0).map(([k, v]) => `<li>${esc(k)}: ${v}</li>`).join('\n');

    // Anomaly
    const anomaly = (data.anomaly || {}) as Record<string, unknown>;

    return c.html(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>alexandria. dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 0 auto; padding: 40px 20px; color: #3d3630; background: #faf8f5; }
  h1 { font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.12em; color: #bbb4aa; margin: 0 0 2rem; font-weight: 400; }
  h2 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; color: #8a8078; margin: 2rem 0 0.75rem; font-weight: 400; }
  .status { font-size: 1.3rem; margin: 0 0 1.5rem; }
  .status.ok { color: #4a7c59; }
  .status.stale { color: #b5651d; }
  .status.error { color: #a04040; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th, td { text-align: left; padding: 6px 12px 6px 0; border-bottom: 1px solid #e8e4df; }
  th { color: #8a8078; font-weight: 400; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.08em; }
  ul { padding-left: 1.2rem; font-size: 0.9rem; }
  li { margin: 0.3rem 0; }
  .metric { display: inline-block; margin: 0 2rem 1rem 0; }
  .metric-value { font-size: 1.4rem; display: block; }
  .metric-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #8a8078; }
  .muted { color: #8a8078; }
  .timestamp { font-size: 0.8rem; color: #bbb4aa; margin-top: 2rem; }
</style>
</head><body>
<h1>alexandria. dashboard</h1>

<p class="status ${data.status === 'ok' ? 'ok' : data.status?.includes('stale') ? 'stale' : 'error'}">${esc(data.status)}</p>

<div>
  <span class="metric"><span class="metric-value">${allAccounts.length}</span><span class="metric-label">authors</span></span>
  <span class="metric"><span class="metric-value">${allAccounts.filter(a => a.installed_at).length}</span><span class="metric-label">installed</span></span>
  <span class="metric"><span class="metric-value">${sessionUsers.length}</span><span class="metric-label">active</span></span>
  <span class="metric"><span class="metric-value">${data.time_range?.hours_since_last != null ? Math.round(data.time_range.hours_since_last) + 'h' : '—'}</span><span class="metric-label">since last event</span></span>
</div>

<h2>authors (${allAccounts.length})</h2>
<table><tr><th>login</th><th>email</th><th>signed up</th><th>status</th><th>last seen</th></tr>
${accountRows}</table>

<h2>cron jobs</h2>
<table><tr><th>job</th><th>last run</th></tr>
${cronRows}</table>

${errorItems ? `<h2>errors</h2><ul>${errorItems}</ul>` : '<h2>errors</h2><p class="muted">none</p>'}

<h2>anomaly</h2>
<p class="muted">last session: ${anomaly.hours_since_last_session != null ? Math.round(anomaly.hours_since_last_session as number) + 'h ago' : 'never'} · smoke failures (24h): ${anomaly.smoke_failures_24h ?? 0}</p>

${data.liveness ? `<h2>liveness</h2>
<table><tr><th>probe</th><th>status</th></tr>
${Object.entries(data.liveness as Record<string, string>).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v === 'ok' ? '✓' : esc(v)}</td></tr>`).join('\n')}
</table>` : ''}

<p class="timestamp">generated ${new Date().toISOString()}</p>
</body></html>`);
  });
}
