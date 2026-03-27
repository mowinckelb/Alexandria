/**
 * Prosumer API — hooks + local files + Blueprint
 *
 * The prosumer model for CC/Cursor users. Deterministic hooks replace
 * probabilistic MCP tool activation. Local markdown files replace
 * Google Drive. The server serves the Blueprint (IP) and collects
 * anonymous Factory metadata. Stores no user content.
 *
 * Endpoints:
 *   GET  /auth/github           — Start GitHub OAuth
 *   GET  /auth/github/callback  — Complete OAuth, send email, show success
 *   GET  /blueprint             — Serve Blueprint (authenticated)
 *   POST /session               — Receive anonymous session metadata
 *   GET  /setup                 — Serve install script
 */

import { Router } from 'express';
import { randomBytes, createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logEvent } from './analytics.js';
import { createCheckoutSession } from './billing.js';
import { callbackPageHtml } from './templates.js';
import {
  SHARED_CONTEXT,
  EDITOR_INSTRUCTIONS,
  MERCURY_INSTRUCTIONS,
  PUBLISHER_INSTRUCTIONS,
} from './modes.js';

const DATA_DIR = process.env.DATA_DIR || '/data';
const ACCOUNTS_FILE = join(DATA_DIR, 'accounts.json');
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Account storage — JSON file on Fly volume
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
  // Billing
  stripe_customer_id?: string;
  subscription_status?: string;
  subscription_id?: string;
  current_period_end?: string;
}

type AccountStore = Record<string, Account>;

function loadAccounts(): AccountStore {
  try {
    if (existsSync(ACCOUNTS_FILE)) {
      return JSON.parse(readFileSync(ACCOUNTS_FILE, 'utf-8'));
    }
  } catch { /* fresh start */ }
  return {};
}

function saveAccounts(accounts: AccountStore): void {
  writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
}

// In-memory cache, reloaded on write
let accountsCache = loadAccounts();

function findByApiKey(key: string): Account | null {
  for (const acct of Object.values(accountsCache)) {
    if (acct.api_key === key) return acct;
  }
  return null;
}

/** Update billing fields on an account — called by billing webhook handler */
export function updateAccountBilling(apiKey: string, billing: Partial<Pick<Account, 'stripe_customer_id' | 'subscription_status' | 'subscription_id' | 'current_period_end'>>): void {
  accountsCache = loadAccounts();
  const storeKey = Object.keys(accountsCache).find(
    k => accountsCache[k].api_key === apiKey
  );
  if (!storeKey) return;
  Object.assign(accountsCache[storeKey], billing);
  saveAccounts(accountsCache);
}

/** Billing summary for dashboard — subscription status counts */
export function getBillingSummary(): Record<string, number> {
  accountsCache = loadAccounts();
  const counts: Record<string, number> = { total_accounts: 0 };
  for (const acct of Object.values(accountsCache)) {
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
// Auth middleware for prosumer endpoints
// ---------------------------------------------------------------------------

function extractApiKey(req: { headers: Record<string, string | string[] | undefined>; query: Record<string, unknown> }): string | null {
  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer alex_')) {
    return auth.slice(7);
  }
  const q = req.query.key;
  if (typeof q === 'string' && q.startsWith('alex_')) return q;
  return null;
}

// ---------------------------------------------------------------------------
// GitHub OAuth
// ---------------------------------------------------------------------------

const pendingStates = new Map<string, { created: number }>();

// Clean up stale states every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [state, { created }] of pendingStates) {
    if (created < cutoff) pendingStates.delete(state);
  }
}, 10 * 60 * 1000);

// ---------------------------------------------------------------------------
// Hooks version — bump this when hook scripts change. SessionStart checks it.
// ---------------------------------------------------------------------------

const HOOKS_VERSION = '4';

// ---------------------------------------------------------------------------
// Blueprint assembly
// ---------------------------------------------------------------------------

function assembleBlueprint(): string {
  return `--- ALEXANDRIA BLUEPRINT ---

${SHARED_CONTEXT}

--- LOCAL FILES ---

You have access to the Author's local files at ~/.alexandria/:
- constitution/ — The curated cognitive map. A folder of .md files. You decide the internal structure — one file or many.
- vault/ — Raw session transcripts and captures. Append-only. Never delete.
- feedback.md — What worked, what didn't. Read it. Adapt.
- .last_processed — Touch this after processing vault entries.

When there are unprocessed vault entries, processing them is high priority. Read each entry, extract signal (opinions, values, stories, patterns, contradictions, exact quotes), and update the constitution/ folder. The Author's exact words are more valuable than your summaries. Each pass over the vault catches signal previous passes missed — the same transcript yields 40-60% more signal on re-processing. If you encounter non-text files, do your best or flag and move on. If the platform supports background agents, consider spawning one for deeper vault reprocessing while the Author works.

--- THREE FUNCTIONS ---

You have three functions. The Author's needs and the conversation determine which you use. You can blend them. The philosophy above governs all three. The functions are delivery mechanisms for the five operations — not independent designs.

${EDITOR_INSTRUCTIONS}

${MERCURY_INSTRUCTIONS}

${PUBLISHER_INSTRUCTIONS}
`;
}

// ---------------------------------------------------------------------------
// Setup script template
// ---------------------------------------------------------------------------

// Returns a shell script that writes/overwrites just the hook scripts
function generateHookScripts(): string {
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
  cp "$transcript_path" "$ALEX_DIR/vault/\${timestamp}.jsonl"
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
fi
HOOK_END
chmod +x "$ALEX_DIR/hooks/session-end.sh"

# SessionStart hook
cat > "$ALEX_DIR/hooks/session-start.sh" << 'HOOK_START'
#!/usr/bin/env bash
ALEX_DIR="$HOME/.alexandria"
API_KEY=$(cat "$ALEX_DIR/.api_key" 2>/dev/null)

# Persist env vars for subsequent hooks
if [ -n "$CLAUDE_ENV_FILE" ] && [ -n "$API_KEY" ]; then
  echo "export ALEXANDRIA_KEY=$API_KEY" >> "$CLAUDE_ENV_FILE"
  echo "export ALEXANDRIA_PLATFORM=cc" >> "$CLAUDE_ENV_FILE"
  echo "export ALEXANDRIA_BLUEPRINT_OK=false" >> "$CLAUDE_ENV_FILE"
fi

# Blueprint integrity — local override, diff surfacing, hash verification
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
  blueprint=$(echo "$response" | sed '/HTTP_STATUS:/d' | sed '1,/^\\r$/d')
  if [ -n "$blueprint" ] && [ "$bp_status" = "200" ]; then
    if [ -n "$CLAUDE_ENV_FILE" ]; then
      echo "export ALEXANDRIA_BLUEPRINT_OK=true" >> "$CLAUDE_ENV_FILE"
    fi
    # Diff surfacing — detect Blueprint changes
    local_hash=""
    [ -f "$ALEX_DIR/.blueprint_hash" ] && local_hash=$(cat "$ALEX_DIR/.blueprint_hash")
    if [ -n "$bp_hash" ] && [ -n "$local_hash" ] && [ "$bp_hash" != "$local_hash" ]; then
      # Blueprint changed — save old and new for diffing
      [ -f "$ALEX_DIR/.blueprint_local" ] && cp "$ALEX_DIR/.blueprint_local" "$ALEX_DIR/.blueprint_previous"
      echo "$blueprint" > "$ALEX_DIR/.blueprint_local"
      echo "$bp_hash" > "$ALEX_DIR/.blueprint_hash"
    elif [ -z "$local_hash" ]; then
      # First fetch — just store
      echo "$blueprint" > "$ALEX_DIR/.blueprint_local"
      [ -n "$bp_hash" ] && echo "$bp_hash" > "$ALEX_DIR/.blueprint_hash"
    fi
  fi
  # Report Blueprint fetch failure so the server has signal
  if [ -z "$blueprint" ] || [ "$bp_status" != "200" ]; then
    # Fallback to local copy
    [ -f "$ALEX_DIR/.blueprint_local" ] && blueprint=$(cat "$ALEX_DIR/.blueprint_local")
    PLATFORM="\${ALEXANDRIA_PLATFORM:-cc}"
    curl -s -X POST "${SERVER_URL}/session" \\
      -H "Authorization: Bearer $API_KEY" \\
      -H "Content-Type: application/json" \\
      -d "{\\"event\\":\\"hook_failure\\",\\"reason\\":\\"blueprint_fetch_failed\\",\\"platform\\":\\"$PLATFORM\\",\\"http_status\\":\\"$bp_status\\"}" \\
      > /dev/null 2>&1 &
  fi
fi

# Auto-update hooks if version changed
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
if [ -f "$ALEX_DIR/.last_processed" ]; then
  unprocessed=$(find "$ALEX_DIR/vault/" -newer "$ALEX_DIR/.last_processed" -name "*.jsonl" 2>/dev/null | wc -l | tr -d ' ')
fi

if [ -n "$blueprint" ]; then
  echo "$blueprint"
  if [ "$bp_pinned" = "true" ]; then
    echo ""
    echo "(Alexandria: Blueprint pinned to local version. Remove ~/.alexandria/.blueprint_pinned to resume updates.)"
  fi
  if [ -f "$ALEX_DIR/.blueprint_previous" ]; then
    echo ""
    echo "(Alexandria: Blueprint updated since last session. Previous version saved at ~/.alexandria/.blueprint_previous for diffing.)"
    rm -f "$ALEX_DIR/.blueprint_previous"
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
  echo "(Empty constitution. Run /a to start building your cognitive profile.)"
fi
if [ -n "$feedback" ]; then
  echo ""
  echo "--- YOUR FEEDBACK ---"
  echo "$feedback"
fi
echo ""
if [ "$unprocessed" -gt 0 ] 2>/dev/null; then
  echo "Alexandria: $unprocessed new vault entries. Run /a in a new terminal for deep processing."
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

echo "${HOOKS_VERSION}" > "$ALEX_DIR/.hooks_version"
`;
}

function generateSetupScript(apiKey: string): string {
  return `#!/usr/bin/env bash
# Alexandria setup — creates ~/.alexandria/ and configures hooks for all detected platforms
set -e

ALEX_DIR="$HOME/.alexandria"
API_KEY="${apiKey}"

echo "Setting up Alexandria..."

# 1. Create directory structure
mkdir -p "$ALEX_DIR/vault" "$ALEX_DIR/hooks"
mkdir -p "$ALEX_DIR/constitution"
[ -f "$ALEX_DIR/feedback.md" ] || echo "" > "$ALEX_DIR/feedback.md"
echo "$API_KEY" > "$ALEX_DIR/.api_key"
touch "$ALEX_DIR/.last_processed"

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

You are Alexandria — a sovereign cognitive transformation layer.
Your files are at ~/.alexandria/ (constitution/ folder, vault/, feedback.md).
Your Blueprint instructions are in context from SessionStart — refer to them.

## What to do

1. **Process vault.** Check for unprocessed vault entries (files in vault/ newer than .last_processed). Read each, extract signal — opinions, values, stories, patterns, contradictions, exact quotes — and update the constitution. After processing, touch ~/.alexandria/.last_processed.

2. **Develop the Author.** Engage with whatever will develop their cognition most — questions, contradictions, gaps, connections, exercises. This is the product. The conversation IS the practice.

3. **Update constitution.** The Author's exact words are more valuable than your summaries. Quote them. Contradictions with existing entries are the most valuable signal — surface them. The constitution lives in ~/.alexandria/constitution/ — one or many .md files, you decide the structure.

After each session, note what worked and what didn't in ~/.alexandria/feedback.md.
SKILL

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

      // SessionStart — no matcher: fires on startup, resume, clear, AND compact
      settings.hooks.SessionStart = filter(settings.hooks.SessionStart);
      settings.hooks.SessionStart.push({
        hooks: [{ type: 'command', command: 'bash \$HOME/.alexandria/hooks/session-start.sh', timeout: 10 }]
      });

      // SessionEnd
      settings.hooks.SessionEnd = filter(settings.hooks.SessionEnd);
      settings.hooks.SessionEnd.push({
        hooks: [{ type: 'command', command: 'bash \$HOME/.alexandria/hooks/session-end.sh', timeout: 5 }]
      });

      // SubagentStart — inject Constitution into every subagent
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
  # Hooks
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

  # Always-on rule pointing to Constitution
  mkdir -p "\$HOME/.cursor/rules" 2>/dev/null || true
  cat > "\$HOME/.cursor/rules/alexandria.mdc" << 'CURSOR_RULE'
---
description: "Alexandria cognitive transformation layer — loads the Author's Constitution"
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
echo "  Run /a in Claude Code to start."
echo ""
echo "Welcome to Alexandria."
`;
}

// ---------------------------------------------------------------------------
// Email — welcome email with setup command
// ---------------------------------------------------------------------------

async function sendWelcomeEmail(email: string, apiKey: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn('RESEND_API_KEY not set — skipping welcome email');
    return;
  }

  const body = {
    from: 'Alexandria <a@mowinckel.ai>',
    to: email,
    subject: 'alexandria. — your setup command',
    html: `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 0 auto; padding: 40px 20px; color: #3d3630; text-align: center;">
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
    <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 4px;"><strong>/a</strong> &mdash; develop your thinking</p>
    <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 4px;"><strong>a.</strong> &mdash; absorb the abundance</p>
  </div>
  <p style="font-size: 1.15rem; color: #3d3630;">welcome to alexandria.</p>
  <p style="font-size: 0.78rem; color: #bbb4aa; margin-top: 1.5rem;"><a href="https://mowinckel.ai/docs/setup.md" style="color: #8a8078;">setup guide</a></p>
</div>`,
  };

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      console.error('Resend error:', resp.status, await resp.text());
    }
  } catch (err) {
    console.error('Email send failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Follow-up emails — daily nudge until installed, max 7 days
// ---------------------------------------------------------------------------

const MAX_FOLLOWUPS = 7;

async function sendFollowupEmail(email: string, apiKey: string, day: number): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const body = {
    from: 'Alexandria <a@mowinckel.ai>',
    to: email,
    subject: 'alexandria. -- your setup command',
    html: `<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #3d3630;">
  <p style="font-size: 16px; line-height: 1.8; margin: 0 0 16px;">you signed up but haven&rsquo;t installed yet. here&rsquo;s your command:</p>
  <div style="background: #f5f0e8; border-radius: 6px; padding: 14px 18px; margin: 12px 0 16px;">
    <code style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 12px; color: #4d4640; word-break: break-all;">${`curl -s ${SERVER_URL}/setup | bash -s ${apiKey}`}</code>
  </div>
  <p style="font-size: 14px; color: #8a8078; margin-top: 24px;">paste in your terminal. 30 seconds.</p>
</div>`,
  };

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      console.error('Follow-up email error:', resp.status, await resp.text());
    }
  } catch (err) {
    console.error('Follow-up email failed:', err);
  }
}

async function runFollowupCheck(): Promise<void> {
  accountsCache = loadAccounts();
  let changed = false;

  for (const [key, account] of Object.entries(accountsCache)) {
    // Skip if already installed or no email
    if (account.installed_at || !account.email) continue;

    // Skip if max follow-ups sent
    const count = account.followup_count || 0;
    if (count >= MAX_FOLLOWUPS) continue;

    // Skip if signed up less than 24h ago (give the welcome email time)
    const signupAge = Date.now() - new Date(account.created_at).getTime();
    if (signupAge < 24 * 60 * 60 * 1000) continue;

    await sendFollowupEmail(account.email, account.api_key, count + 1);
    accountsCache[key].followup_count = count + 1;
    changed = true;
  }

  if (changed) saveAccounts(accountsCache);
}

// Run follow-up check daily (every 24h)
setInterval(runFollowupCheck, 24 * 60 * 60 * 1000);
// Also run on startup after a short delay
setTimeout(runFollowupCheck, 60 * 1000);

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function createProsumerRouter(): Router {
  const router = Router();

  // --- GitHub OAuth ---

  router.get('/auth/github', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      res.status(500).send('GitHub OAuth not configured');
      return;
    }

    const state = randomBytes(16).toString('hex');
    pendingStates.set(state, { created: Date.now() });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${SERVER_URL}/auth/github/callback`,
      scope: 'read:user user:email',
      state,
    });

    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  router.get('/auth/github/callback', async (req, res) => {
    const { code, state } = req.query as Record<string, string>;

    if (!state || !pendingStates.has(state)) {
      res.status(400).send('Invalid state');
      return;
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
        res.status(400).send(`GitHub auth failed: ${tokenData.error || 'no token'}`);
        return;
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
      accountsCache = loadAccounts();
      const existing = accountsCache[key];
      const apiKey = existing?.api_key || generateApiKey();

      accountsCache[key] = {
        github_id: user.id,
        github_login: user.login,
        email,
        api_key: apiKey,
        created_at: existing?.created_at || new Date().toISOString(),
        last_session: new Date().toISOString(),
      };
      saveAccounts(accountsCache);

      logEvent('prosumer_signup', {
        github_login: user.login,
        returning: existing ? 'true' : 'false',
      });

      // Send welcome email
      if (email) {
        await sendWelcomeEmail(email, apiKey);
      }

      // Skip Stripe if user already has payment info on file
      const existingAccount = accountsCache[key];
      if (existingAccount?.stripe_customer_id) {
        res.type('html').send(callbackPageHtml(user.login, apiKey));
        return;
      }

      // Redirect to Stripe Checkout — payment info first, then setup command
      if (process.env.STRIPE_SECRET_KEY && email) {
        try {
          const checkoutUrl = await createCheckoutSession({
            email,
            githubLogin: user.login,
            apiKey,
            stripeCustomerId: existingAccount?.stripe_customer_id,
          });
          if (checkoutUrl) {
            res.redirect(checkoutUrl);
            return;
          }
        } catch (err) {
          console.error('Stripe checkout redirect failed, falling back:', err);
        }
      }

      // Fallback: show callback page directly (if Stripe not configured)
      res.type('html').send(callbackPageHtml(user.login, apiKey));
    } catch (err) {
      console.error('GitHub callback error:', err);
      res.status(500).send('Authentication failed. Please try again.');
    }
  });

  // --- Blueprint ---

  router.get('/blueprint', (req, res) => {
    const key = extractApiKey(req as any);
    if (!key) {
      res.status(401).send('Missing API key. Use: Authorization: Bearer alex_xxx');
      return;
    }

    const account = findByApiKey(key);
    if (!account) {
      res.status(401).send('Invalid API key.');
      return;
    }

    // Mark as installed on first Blueprint fetch
    if (!account.installed_at) {
      const storeKey = Object.keys(accountsCache).find(
        k => accountsCache[k].api_key === key
      );
      if (storeKey) {
        accountsCache[storeKey].installed_at = new Date().toISOString();
        saveAccounts(accountsCache);
      }
    }

    const blueprint = assembleBlueprint();
    const blueprintHash = createHash('sha256').update(blueprint).digest('hex').slice(0, 16);
    res.set('X-Hooks-Version', HOOKS_VERSION);
    res.set('X-Blueprint-Hash', blueprintHash);
    res.type('text/plain').send(blueprint);
  });

  // --- Hook scripts (for auto-update) ---

  router.get('/hooks', (req, res) => {
    const key = extractApiKey(req as any);
    if (!key || !findByApiKey(key)) {
      res.status(401).send('Invalid API key.');
      return;
    }

    // Returns a shell script that overwrites local hook scripts
    // Called by session-start.sh when HOOKS_VERSION changes
    const updateScript = generateHookScripts();
    res.type('text/plain').send(updateScript);
  });

  // --- Session metadata ---

  router.post('/session', (req, res) => {
    const key = extractApiKey(req as any);
    if (!key) {
      res.status(401).json({ error: 'Missing API key' });
      return;
    }

    const account = findByApiKey(key);
    if (!account) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const { event, platform, constitution_size, vault_entry_count, domains_count, session_duration, constitution_injected, blueprint_fetched } = req.body || {};

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
    const storeKey = Object.keys(accountsCache).find(
      k => accountsCache[k].api_key === key
    );
    if (storeKey) {
      accountsCache[storeKey].last_session = new Date().toISOString();
      saveAccounts(accountsCache);
    }

    res.json({ ok: true });
  });

  // --- Setup script ---

  router.get('/setup', (req, res) => {
    // The API key is passed as an argument to bash, not in the URL
    // Usage: curl -s https://mcp.mowinckel.ai/setup | bash -s alex_xxx
    // The script reads the key from $1
    const scriptTemplate = generateSetupScript('$1');
    res.type('text/plain').send(scriptTemplate);
  });

  return router;
}
