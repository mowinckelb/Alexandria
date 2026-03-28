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
import { logEvent } from './analytics.js';
import { createCheckoutSession } from './billing.js';
import { callbackPageHtml } from './templates.js';
import { loadAccounts, saveAccounts } from './kv.js';
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

async function findByApiKey(key: string): Promise<Account | null> {
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

function extractApiKey(c: { req: { header: (name: string) => string | undefined; query: (name: string) => string | undefined } }): string | null {
  const auth = c.req.header('authorization');
  if (auth && auth.startsWith('Bearer alex_')) {
    return auth.slice(7);
  }
  const q = c.req.query('key');
  if (q && q.startsWith('alex_')) return q;
  return null;
}

// ---------------------------------------------------------------------------
// GitHub OAuth — in-memory pending states
// ---------------------------------------------------------------------------

const pendingStates = new Map<string, { created: number }>();

// ---------------------------------------------------------------------------
// Hooks version — bump this when hook scripts change
// ---------------------------------------------------------------------------

const HOOKS_VERSION = '5';

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
- machine.md — The Engine's living model of how to work with this Author. Read it. Update it after each session.
- ontology/ — The Engine's workspace. Structured extractions not yet Author-confirmed. Stage material here before proposing to the Author.
- .last_processed — Touch this after processing vault entries.

When there are unprocessed vault entries, processing them is high priority. Read each entry, extract signal (opinions, values, stories, patterns, contradictions, exact quotes), and update the constitution/ folder. The Author's exact words are more valuable than your summaries. Each pass over the vault catches signal previous passes missed — the same transcript yields richer signal on re-processing — each pass catches what previous passes missed. If you encounter non-text files, do your best or flag and move on. If the platform supports background agents, consider spawning one for deeper vault reprocessing while the Author works.

--- THREE FUNCTIONS ---

You have three functions. The Author's needs and the conversation determine which you use. You can blend them. The philosophy above governs all three. The functions are delivery mechanisms for the five operations — not independent designs.

${EDITOR_INSTRUCTIONS}

${MERCURY_INSTRUCTIONS}

${PUBLISHER_INSTRUCTIONS}
`;
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
  blueprint=$(echo "$response" | sed '/HTTP_STATUS:/d' | sed '1,/^\\r$/d')
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
  unprocessed=$(find "$ALEX_DIR/vault/" -newer "$ALEX_DIR/.last_processed" -name "*.jsonl" 2>/dev/null | wc -l | tr -d ' ')
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
  echo "(Empty constitution. Run /a to start building your cognitive profile.)"
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

You are Alexandria — a sovereign cognitive identity layer.
Your files are at ~/.alexandria/ (constitution/ folder, vault/, feedback.md).

## Instructions

Your Blueprint is your operating manual. It should already be in context from SessionStart. If it is, follow it. If it is not, read ~/.alexandria/.blueprint_local — that is the locally cached copy. If that also does not exist, read the constitution files and engage the Author directly; the conversation IS the product.

## Context principle

Use everything the platform already knows about the Author — memory, conversation history, prior context. The constitution is the DEVELOPMENTAL map: growth edges, contradictions, tensions, active questions. Don't duplicate what the platform provides. Build on it.
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
    <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 4px;"><strong>/a</strong> &mdash; develop your thinking</p>
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

    const blueprint = assembleBlueprint();
    const blueprintHash = createHash('sha256').update(blueprint).digest('hex').slice(0, 16);

    return new Response(blueprint, {
      headers: {
        'Content-Type': 'text/plain',
        'X-Hooks-Version': HOOKS_VERSION,
        'X-Blueprint-Hash': blueprintHash,
      },
    });
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

  // --- Setup script ---

  app.get('/setup', (c) => {
    const scriptTemplate = generateSetupScript('$1');
    return c.text(scriptTemplate);
  });
}
