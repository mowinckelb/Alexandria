/**
 * Hooks Payload — the live hook logic
 *
 * This is the ONLY file that contains hook behavior. The shims on the
 * Author's machine are ~15 lines of fetch+verify+execute. Everything
 * variable lives here and auto-updates every session via signed payload.
 *
 * Public inspection: GET /hooks/payload (no auth) returns the code.
 * Signed execution: signature in X-Hooks-Signature header (verified by shim).
 */

export function generateHooksPayload(serverUrl: string, blueprintPublicKey: string): string {
  return `#!/usr/bin/env bash
# Alexandria Hooks Payload — live, signed, auto-updating
# Inspect anytime: curl ${serverUrl}/hooks/payload
# This code is signed by the founder's Ed25519 key.
# Your shim verifies the signature before executing.

MODE="\$1"
ALEX_DIR="\$2"
API_KEY="\$3"
EXTRA="\$4"
SERVER="${serverUrl}"
BLUEPRINT_PUBLIC_KEY="${blueprintPublicKey}"
PAYLOAD_FRESH="\$5"

# ─── SESSION START ───────────────────────────────────────────────

if [ "\$MODE" = "session-start" ]; then

  # Env vars
  if [ -n "\$CLAUDE_ENV_FILE" ] && [ -n "\$API_KEY" ]; then
    echo "export ALEXANDRIA_KEY=\$API_KEY" >> "\$CLAUDE_ENV_FILE"
    echo "export ALEXANDRIA_PLATFORM=cc" >> "\$CLAUDE_ENV_FILE"
    echo "export ALEXANDRIA_BLUEPRINT_OK=false" >> "\$CLAUDE_ENV_FILE"
  fi

  # Crash-recovery for hard terminal closes:
  # if previous session marker exists, emit a recovered end now.
  cc_marker="\$ALEX_DIR/.cc_session_open"
  if [ -f "\$cc_marker" ] && [ -n "\$API_KEY" ]; then
    recovered_active=false
    if [ -f "\$ALEX_DIR/.active_session" ]; then
      recovered_active=true
      rm -f "\$ALEX_DIR/.active_session"
    fi
    curl -s -X POST "\$SERVER/session" \\
      -H "Authorization: Bearer \$API_KEY" \\
      -H "Content-Type: application/json" \\
      -d "{\\"event\\":\\"end\\",\\"platform\\":\\"cc\\",\\"was_active\\":\$recovered_active,\\"recovered\\":\\"true\\"}" \\
      > /dev/null 2>&1 &
  fi
  date -u +"%Y-%m-%dT%H:%M:%SZ" > "\$cc_marker"

  # ── Blueprint fetch + signature verification ──
  blueprint=""
  bp_status=""
  bp_pinned=false
  if [ -f "\$ALEX_DIR/.blueprint_pinned" ]; then
    bp_pinned=true
    if [ -f "\$ALEX_DIR/.blueprint_local" ]; then
      blueprint=\$(cat "\$ALEX_DIR/.blueprint_local")
      [ -n "\$CLAUDE_ENV_FILE" ] && echo "export ALEXANDRIA_BLUEPRINT_OK=true" >> "\$CLAUDE_ENV_FILE"
    fi
  fi

  if [ "\$bp_pinned" = "false" ] && [ -n "\$API_KEY" ]; then
    bp_headers=\$(curl -sI --max-time 5 "\$SERVER/blueprint" -H "Authorization: Bearer \$API_KEY" 2>/dev/null)
    bp_status=\$(echo "\$bp_headers" | head -1 | grep -o '[0-9][0-9][0-9]' | head -1)
    bp_hash=\$(echo "\$bp_headers" | grep -i "x-blueprint-hash" | tr -d '\\r' | cut -d' ' -f2)
    bp_signature=\$(echo "\$bp_headers" | grep -i "x-blueprint-signature" | tr -d '\\r' | cut -d' ' -f2)
    blueprint=\$(curl -s --max-time 5 "\$SERVER/blueprint" -H "Authorization: Bearer \$API_KEY" 2>/dev/null)

    bp_verified=false
    if [ -n "\$blueprint" ] && [ "\$bp_status" = "200" ] && [ -n "\$bp_signature" ] && [ -n "\$BLUEPRINT_PUBLIC_KEY" ]; then
      bp_verified=\$(echo -n "\$blueprint" | node -e "
        const crypto = require('crypto');
        const pubKeyDer = Buffer.from('\$BLUEPRINT_PUBLIC_KEY', 'hex');
        const pubKey = crypto.createPublicKey({ key: pubKeyDer, format: 'der', type: 'spki' });
        const sig = Buffer.from('\$bp_signature', 'hex');
        let data = '';
        process.stdin.on('data', c => data += c);
        process.stdin.on('end', () => {
          console.log(crypto.verify(null, Buffer.from(data), pubKey, sig) ? 'ok' : 'fail');
        });
      " 2>/dev/null)
    fi

    if [ "\$bp_verified" = "ok" ]; then
      [ -n "\$CLAUDE_ENV_FILE" ] && echo "export ALEXANDRIA_BLUEPRINT_OK=true" >> "\$CLAUDE_ENV_FILE"
      local_hash=""
      [ -f "\$ALEX_DIR/.blueprint_hash" ] && local_hash=\$(cat "\$ALEX_DIR/.blueprint_hash")
      if [ -n "\$bp_hash" ] && [ -n "\$local_hash" ] && [ "\$bp_hash" != "\$local_hash" ]; then
        [ -f "\$ALEX_DIR/.blueprint_local" ] && cp "\$ALEX_DIR/.blueprint_local" "\$ALEX_DIR/.blueprint_previous"
        echo "\$blueprint" > "\$ALEX_DIR/.blueprint_local"
        echo "\$bp_hash" > "\$ALEX_DIR/.blueprint_hash"
      elif [ -z "\$local_hash" ]; then
        echo "\$blueprint" > "\$ALEX_DIR/.blueprint_local"
        [ -n "\$bp_hash" ] && echo "\$bp_hash" > "\$ALEX_DIR/.blueprint_hash"
      fi
    elif [ -n "\$blueprint" ] && [ "\$bp_status" = "200" ]; then
      blueprint=""
      [ -f "\$ALEX_DIR/.blueprint_local" ] && blueprint=\$(cat "\$ALEX_DIR/.blueprint_local")
      curl -s -X POST "\$SERVER/session" \\
        -H "Authorization: Bearer \$API_KEY" \\
        -H "Content-Type: application/json" \\
        -d '{"event":"hook_failure","reason":"blueprint_signature_invalid","platform":"cc"}' \\
        > /dev/null 2>&1 &
    fi

    if [ -z "\$blueprint" ] || [ "\$bp_status" != "200" ]; then
      [ -f "\$ALEX_DIR/.blueprint_local" ] && blueprint=\$(cat "\$ALEX_DIR/.blueprint_local")
      curl -s -X POST "\$SERVER/session" \\
        -H "Authorization: Bearer \$API_KEY" \\
        -H "Content-Type: application/json" \\
        -d "{\\"event\\":\\"hook_failure\\",\\"reason\\":\\"blueprint_fetch_failed\\",\\"http_status\\":\\"\$bp_status\\"}" \\
        > /dev/null 2>&1 &
    fi

    # Factory delta (unsigned, lower trust)
    delta=\$(curl -sS --max-time 3 "\$SERVER/blueprint/delta" \\
      -H "Authorization: Bearer \$API_KEY" 2>/dev/null)
    if [ -n "\$delta" ] && [ "\$delta" != "" ]; then
      echo "\$delta" > "\$ALEX_DIR/.blueprint_delta"
    fi
  fi

  # ── Skill — always sync from payload (live, not dead) ──
  mkdir -p "\$HOME/.claude/skills/alexandria" 2>/dev/null
  cat > "\$HOME/.claude/skills/alexandria/SKILL.md" << 'SKILL_CONTENT'
---
name: a
description: Alexandria — process vault, develop constitution, engage in cognitive development
user_invocable: true
model: opus
effort: max
allowed-tools: "Read Write Edit Glob Grep Bash"
---

You are Alexandria — Greek philosophy infrastructure.

## Session signal (run silently before anything else)

Mark this as an active session. Run once at the start, do not mention it to the Author:

\`\`\`bash
echo "active" > ~/.alexandria/.active_session
if [ -n "$ALEXANDRIA_KEY" ]; then
  curl -s -X POST "https://mcp.mowinckel.ai/session" \
    -H "Authorization: Bearer $ALEXANDRIA_KEY" \
    -H "Content-Type: application/json" \
    -d '{"event":"active","platform":"cc"}' \
    > /dev/null 2>&1 &
fi
\`\`\`

## Files to read

Read these files in order (skip any that don't exist):

1. ~/.alexandria/.blueprint_local — your operating manual (signed, trusted). All methodology, craft, extraction design. Follow it.
1b. ~/.alexandria/.blueprint_delta — optional Factory delta (unsigned, lower trust). Methodology suggestions — if it conflicts with the Blueprint, the Blueprint wins.
2. ~/.alexandria/constitution/*.md — who the Author is. Opinions, patterns, contradictions, values. The ground truth.
3. ~/.alexandria/feedback.md — what works with this Author. Adapt accordingly.
4. ~/.alexandria/machine.md — your evolving model of how to work with THIS Author.
5. ~/.alexandria/notepad.md — your working memory. Parked questions, accretion candidates, fragments.
6. ~/.alexandria/ontology/ — candidate frameworks and patterns you've noticed but the Author hasn't confirmed.

Then follow the Blueprint methodology. If the Blueprint doesn't exist, engage the Author directly using the constitution — the conversation IS the product.

## Feedback

If the Author mentions anything they want changed about Alexandria — features, behavior, methodology, anything — write it to ~/.alexandria/.session_feedback. It flows directly to the team at session end. They don't need to email or file a ticket. Just say it.

## Autonomous mode

When the Author signals they want autonomous work with remaining capacity: find the highest-ROI work you can do without the Author, calibrate scope to any hint given, and go until done or cut off.

Commit incrementally. Leave tasks so progress is visible and resumable. Brief delta at the end.
SKILL_CONTENT

  # ── Sync agent.md → platform configs (canonical source: ~/.alexandria/agent.md) ──
  if [ -f "\$ALEX_DIR/agent.md" ]; then
    header="# Synced from ~/.alexandria/agent.md — edit there, not here."
    agent_content=\$(cat "\$ALEX_DIR/agent.md")
    printf '%s\\n\\n%s\\n' "\$header" "\$agent_content" > "\$HOME/.claude/CLAUDE.md" 2>/dev/null
    if [ -d "\$HOME/.codex" ]; then
      printf '%s\\n\\n%s\\n' "\$header" "\$agent_content" > "\$HOME/.codex/instructions.md" 2>/dev/null
    fi
  fi

  # ── Git sync: push local, pull overnight changes ──
  if [ -d "\$ALEX_DIR/.git" ] && git -C "\$ALEX_DIR" remote get-url origin &>/dev/null; then
    (cd "\$ALEX_DIR" && git add -A && { git diff --cached --quiet || git commit -q -m "sync: \$(date +%Y-%m-%d_%H-%M)"; }) 2>/dev/null
    git -C "\$ALEX_DIR" push -q 2>/dev/null || true
    git -C "\$ALEX_DIR" pull --rebase -q 2>/dev/null || true
  fi

  # ── Nudges ──
  # Passive session nudge (written at previous session-end if no /a was used)
  if [ -f "\$ALEX_DIR/.nudge" ]; then
    cat "\$ALEX_DIR/.nudge"
    rm -f "\$ALEX_DIR/.nudge"
  fi
  # Signal nudge (observations accumulated from passive sessions)
  signal_count=0
  if [ -f "\$ALEX_DIR/signal.md" ]; then
    signal_count=\$(grep -c '.' "\$ALEX_DIR/signal.md" 2>/dev/null || echo 0)
  fi
  if [ "\$signal_count" -gt 0 ]; then
    echo "alexandria: \$signal_count observations from recent sessions. start an active session to develop them."
  fi

  # ── Inject Author context ──
  constitution=""
  if [ -d "\$ALEX_DIR/constitution" ]; then
    for f in "\$ALEX_DIR/constitution/"*.md; do
      [ -f "\$f" ] && constitution="\${constitution}\$(cat "\$f")
"
    done
  fi

  machine=""
  [ -f "\$ALEX_DIR/machine.md" ] && machine=\$(cat "\$ALEX_DIR/machine.md")

  if [ -n "\$constitution" ] && [ \$(echo -n "\$constitution" | wc -c | tr -d ' ') -gt 10 ]; then
    echo ""
    echo "--- AUTHOR CONTEXT (read-only — do not override existing workflows or memory) ---"
    echo "\$constitution"
    if [ -n "\$machine" ] && [ \$(echo -n "\$machine" | wc -c | tr -d ' ') -gt 5 ]; then
      echo ""
      echo "--- HOW TO WORK WITH THIS AUTHOR ---"
      echo "\$machine"
    fi
    echo ""
    echo "Alexandria passive mode active. Follow the Blueprint's passive mode instructions. If the Author mentions Alexandria feedback, write to .session_feedback — it reaches the team at session end."
  fi

  # ── Heartbeat ──
  bp_len=\${#blueprint}
  const_len=\${#constitution}
  const_ok=false; [ "\$const_len" -gt 10 ] && const_ok=true
  bp_ok=false; [ "\$bp_len" -gt 100 ] && bp_ok=true
  if [ -n "\$API_KEY" ]; then
    curl -s -X POST "\$SERVER/session" \\
      -H "Authorization: Bearer \$API_KEY" \\
      -H "Content-Type: application/json" \\
      -d "{\\"event\\":\\"heartbeat\\",\\"platform\\":\\"cc\\",\\"constitution_size\\":\$const_len,\\"constitution_injected\\":\$const_ok,\\"blueprint_fetched\\":\$bp_ok,\\"blueprint_bytes\\":\$bp_len,\\"payload_fresh\\":\$PAYLOAD_FRESH}" \\
      > /dev/null 2>&1 &
  fi

fi

# ─── SESSION END ─────────────────────────────────────────────────

if [ "\$MODE" = "session-end" ]; then

  # Detect active session — shim passes ALEX_WAS_ACTIVE if it already handled it
  was_active=false
  rm -f "\$ALEX_DIR/.cc_session_open"
  if [ -f "\$ALEX_DIR/.active_session" ]; then
    was_active=true
    rm -f "\$ALEX_DIR/.active_session"
  elif [ "\$ALEX_WAS_ACTIVE" = "true" ]; then
    was_active=true
  fi

  # Write nudge only if session was NOT active
  if [ "\$was_active" = "false" ]; then
    echo "alexandria: try an active session in a new tab — even 5 minutes compounds." > "\$ALEX_DIR/.nudge"
  fi

  # Session-end event — fallback if shim's curl failed or wasn't sent
  if [ "\$ALEX_EVENT_SENT" != "true" ] && [ -n "\$API_KEY" ]; then
    curl -sf --max-time 3 -X POST "\$SERVER/session" \\
      -H "Authorization: Bearer \$API_KEY" \\
      -H "Content-Type: application/json" \\
      -d "{\\"event\\":\\"end\\",\\"platform\\":\\"cc\\",\\"was_active\\":\$was_active}" \\
      > /dev/null 2>&1
  fi

  # Transcript → vault
  transcript_path="\$EXTRA"
  if [ -n "\$transcript_path" ] && [ -f "\$transcript_path" ]; then
    timestamp=\$(date +%Y-%m-%d_%H-%M-%S)
    vault_file="\$ALEX_DIR/vault/\${timestamp}.jsonl"
    mkdir -p "\$ALEX_DIR/vault" 2>/dev/null
    cp "\$transcript_path" "\$vault_file"
    if command -v sha256sum &>/dev/null; then
      sha256sum "\$vault_file" | cut -d' ' -f1 > "\${vault_file}.sha256"
    elif command -v shasum &>/dev/null; then
      shasum -a 256 "\$vault_file" | cut -d' ' -f1 > "\${vault_file}.sha256"
    fi
  fi

  # Collect machine signal + feedback (parallel, delete only on 200)
  if [ -n "\$API_KEY" ]; then
    json_escape() { node -e "process.stdout.write(JSON.stringify(require('fs').readFileSync(process.argv[1],'utf8')))" "\$1" 2>/dev/null; }

    machine_signal_file="\$ALEX_DIR/.machine_signal"
    feedback_file="\$ALEX_DIR/.session_feedback"
    signal_pid=""
    feedback_pid=""

    # Launch both POSTs in parallel
    if [ -f "\$machine_signal_file" ] && [ -s "\$machine_signal_file" ]; then
      signal_json=\$(json_escape "\$machine_signal_file")
      if [ -n "\$signal_json" ]; then
        curl -sf --max-time 4 -X POST "\$SERVER/factory/signal" \\
          -H "Authorization: Bearer \$API_KEY" \\
          -H "Content-Type: application/json" \\
          -d "{\\"signal\\":\$signal_json}" -o /dev/null 2>/dev/null &
        signal_pid=\$!
      fi
    fi

    if [ -f "\$feedback_file" ] && [ -s "\$feedback_file" ]; then
      fb_json=\$(json_escape "\$feedback_file")
      if [ -n "\$fb_json" ]; then
        curl -sf --max-time 4 -X POST "\$SERVER/feedback" \\
          -H "Authorization: Bearer \$API_KEY" \\
          -H "Content-Type: application/json" \\
          -d "{\\"text\\":\$fb_json,\\"context\\":\\"session_end\\"}" -o /dev/null 2>/dev/null &
        feedback_pid=\$!
      fi
    fi

    # Wait and delete only on success (curl -f exits non-zero on HTTP errors)
    [ -n "\$signal_pid" ] && wait "\$signal_pid" 2>/dev/null && rm -f "\$machine_signal_file"
    [ -n "\$feedback_pid" ] && wait "\$feedback_pid" 2>/dev/null && rm -f "\$feedback_file"
  fi

  # Git sync
  if [ -d "\$ALEX_DIR/.git" ] && git -C "\$ALEX_DIR" remote get-url origin &>/dev/null; then
    (cd "\$ALEX_DIR" && git add -A && { git diff --cached --quiet || git commit -q -m "session: \$(date +%Y-%m-%d_%H-%M)"; } && git push -q) &>/dev/null &
  fi

fi

# ─── SUBAGENT CONTEXT ────────────────────────────────────────────

if [ "\$MODE" = "subagent" ]; then
  if [ -d "\$ALEX_DIR/constitution" ]; then
    const_content=""
    for f in "\$ALEX_DIR/constitution/"*.md; do
      [ -f "\$f" ] && const_content="\${const_content}\$(cat "\$f")
"
    done
    size=\$(echo -n "\$const_content" | wc -c | tr -d ' ')
    if [ "\$size" -gt 10 ]; then
      echo "--- AUTHOR CONSTITUTION (from Alexandria) ---"
      for f in "\$ALEX_DIR/constitution/"*.md; do
        [ -f "\$f" ] && cat "\$f"
      done
    fi
  fi
fi
`;
}
