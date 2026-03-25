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
import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logEvent } from './analytics.js';
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

const HOOKS_VERSION = '1';

// ---------------------------------------------------------------------------
// Blueprint assembly
// ---------------------------------------------------------------------------

function assembleBlueprint(): string {
  return `--- ALEXANDRIA BLUEPRINT ---

${SHARED_CONTEXT}

--- LOCAL FILES ---

You have access to the Author's local files at ~/.alexandria/:
- constitution.md — The curated cognitive map. ONE monolithic file. You decide the internal structure.
- vault/ — Raw session transcripts and captures. Append-only. Never delete.
- feedback.md — What worked, what didn't. Read it. Adapt.
- .last_processed — Touch this after processing vault entries.

When there are unprocessed vault entries, processing them is high priority. Read each entry, extract signal (opinions, values, stories, patterns, contradictions, exact quotes), and update constitution.md. The Author's exact words are more valuable than your summaries. Each pass over the vault catches signal previous passes missed — the same transcript yields 40-60% more signal on re-processing. If you encounter non-text files, do your best or flag and move on. If the platform supports background agents, consider spawning one for deeper vault reprocessing while the Author works.

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

const_size=$(wc -c < "$ALEX_DIR/constitution.md" 2>/dev/null || echo 0)
vault_count=$(ls "$ALEX_DIR/vault/" 2>/dev/null | wc -l)
blueprint_ok="\${ALEXANDRIA_BLUEPRINT_OK:-false}"
const_injected=false
[ "$const_size" -gt 10 ] 2>/dev/null && const_injected=true

if [ -n "$API_KEY" ]; then
  curl -s -X POST "${SERVER_URL}/session" \\
    -H "Authorization: Bearer $API_KEY" \\
    -H "Content-Type: application/json" \\
    -d "{\\"event\\":\\"end\\",\\"platform\\":\\"$PLATFORM\\",\\"constitution_size\\":$const_size,\\"vault_entry_count\\":$vault_count,\\"constitution_injected\\":$const_injected,\\"blueprint_fetched\\":$blueprint_ok}" \\
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

# Fetch Blueprint (includes hooks version check)
blueprint=""
hooks_version=""
if [ -n "$API_KEY" ]; then
  response=$(curl -sS --max-time 5 -D - \\
    "${SERVER_URL}/blueprint" \\
    -H "Authorization: Bearer $API_KEY" 2>/dev/null)
  hooks_version=$(echo "$response" | grep -i "x-hooks-version" | tr -d '\\r' | cut -d' ' -f2)
  blueprint=$(echo "$response" | sed '1,/^\\r$/d')
  if [ -n "$blueprint" ] && [ -n "$CLAUDE_ENV_FILE" ]; then
    echo "export ALEXANDRIA_BLUEPRINT_OK=true" >> "$CLAUDE_ENV_FILE"
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
if [ -f "$ALEX_DIR/constitution.md" ]; then
  constitution=$(cat "$ALEX_DIR/constitution.md")
fi

unprocessed=0
if [ -f "$ALEX_DIR/.last_processed" ]; then
  unprocessed=$(find "$ALEX_DIR/vault/" -newer "$ALEX_DIR/.last_processed" -name "*.jsonl" 2>/dev/null | wc -l | tr -d ' ')
fi

if [ -n "$blueprint" ]; then
  echo "$blueprint"
else
  echo "(Alexandria: Blueprint unavailable — offline mode. Constitution loaded from local files.)"
fi
echo ""
echo "--- YOUR CONSTITUTION ---"
if [ -n "$constitution" ] && [ "$constitution" != "" ]; then
  echo "$constitution"
else
  echo "(Empty constitution. Run /a to start building your cognitive profile.)"
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
if [ -f "$ALEX_DIR/constitution.md" ]; then
  size=$(wc -c < "$ALEX_DIR/constitution.md" | tr -d ' ')
  if [ "$size" -gt 10 ]; then
    echo "--- AUTHOR CONSTITUTION (from Alexandria) ---"
    cat "$ALEX_DIR/constitution.md"
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
[ -f "$ALEX_DIR/constitution.md" ] || echo "" > "$ALEX_DIR/constitution.md"
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
Your files are at ~/.alexandria/ (constitution.md, vault/, feedback.md).
Your Blueprint instructions are in context from SessionStart — refer to them.

Process unprocessed vault entries (files in vault/ newer than .last_processed) into the constitution.
Then engage the Author with whatever will develop their cognition most — questions, contradictions, gaps, connections, exercises.

After processing, touch .last_processed to mark entries as handled.

The Author's exact words and stories are more valuable than your summaries. Quote them into the constitution.
Contradictions with existing constitution entries are the most valuable signal — surface them.
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
description: "Alexandria cognitive identity layer — loads the Author's Constitution"
alwaysApply: true
---

This Author uses Alexandria. Read ~/.alexandria/constitution.md — it captures who they are. Read ~/.alexandria/feedback.md — it captures what works with them. Adapt accordingly.

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
echo "  Constitution: $ALEX_DIR/constitution.md"
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
    subject: 'alexandria.',
    html: `<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #3d3630;">
  <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; color: #bbb4aa; margin: 0 0 12px;">setup</p>
  <p style="font-size: 16px; line-height: 1.8; margin: 0 0 4px;">paste into your terminal:</p>
  <div style="background: #f5f0e8; border-radius: 6px; padding: 14px 18px; margin: 12px 0 16px;">
    <code style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 12px; color: #4d4640; word-break: break-all;">${`curl -s ${SERVER_URL}/setup | bash -s ${apiKey}`}</code>
  </div>
  <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; color: #bbb4aa; margin: 16px 0 12px;">then</p>
  <p style="font-size: 16px; line-height: 1.8; margin: 0 0 4px;"><em>/a</em> &#8212; develop your thinking.</p>
  <p style="font-size: 16px; line-height: 1.8; margin: 0 0 4px;"><em>a.</em> &#8212; absorb the abundance.</p>
  <p style="font-size: 16px; margin-top: 36px; font-style: italic; color: #8a8078;">a.</p>
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
// Callback page HTML — the first brand moment
// ---------------------------------------------------------------------------

function callbackPageHtml(login: string, apiKey: string): string {
  const curlCmd = `curl -s ${SERVER_URL}/setup | bash -s ${apiKey}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>alexandria.</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'EB Garamond', Georgia, 'Times New Roman', serif;
    background: #f5f0e8;
    color: #3d3630;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
  }
  .container { max-width: 420px; text-align: center; }
  .section { margin-bottom: 2.5rem; }
  .label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.15em; color: #bbb4aa; margin-bottom: 0.8rem; }
  .line { font-size: 1.1rem; font-weight: 400; line-height: 1.9; color: #3d3630; }
  .link {
    color: #3d3630;
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: #bbb4aa;
    cursor: pointer;
    transition: text-decoration-color 0.15s;
  }
  .link:hover { text-decoration-color: #3d3630; }
  a.link { color: #3d3630; }
  .muted { font-size: 0.85rem; color: #8a8078; line-height: 1.8; margin-top: 0.4rem; }
  .closing { font-size: 1.15rem; color: #3d3630; margin-top: 2.5rem; }
</style>
</head>
<body>
<div class="container">
  <div class="section">
    <p class="label">setup</p>
    <p class="line"><a class="link" onclick="copy()" id="copyLink">copy</a> and paste into your terminal.</p>
    <p class="muted">drop voice memos, notes, and articles into ~/.alexandria/vault/</p>
  </div>
  <div class="section">
    <p class="label">then</p>
    <p class="line"><em>/a</em> &mdash; the examined life.</p>
    <p class="line"><em>a.</em> &mdash; absorb the abundance.</p>
  </div>
  <p class="closing">welcome to alexandria.</p>
</div>
<script>
function copy() {
  navigator.clipboard.writeText(${JSON.stringify(curlCmd)}).then(() => {
    var el = document.getElementById('copyLink');
    el.textContent = 'copied';
    setTimeout(() => { el.textContent = 'copy'; }, 2000);
  });
}
</script>
</body>
</html>`;
}

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

      // Show the branded callback page
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

    res.set('X-Hooks-Version', HOOKS_VERSION);
    res.type('text/plain').send(assembleBlueprint());
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
