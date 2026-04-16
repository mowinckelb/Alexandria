#!/usr/bin/env bash
# Alexandria Hooks Payload — live, auto-updating
# Source: https://raw.githubusercontent.com/mowinckelb/Alexandria/main/factory/hooks/payload.sh
# The canon is public on GitHub (factory/canon/ folder). No signing needed.

MODE="$1"
ALEX_DIR="$2"
API_KEY="$3"
EXTRA="$4"
SERVER="https://mcp.mowinckel.ai"
CANON_GITHUB="https://raw.githubusercontent.com/mowinckelb/Alexandria/main/factory/canon"
PAYLOAD_FRESH="$5"

# ─── SESSION START ───────────────────────────────────────────────

if [ "$MODE" = "session-start" ]; then

  # Env vars
  if [ -n "$CLAUDE_ENV_FILE" ] && [ -n "$API_KEY" ]; then
    echo "export ALEXANDRIA_KEY=$API_KEY" >> "$CLAUDE_ENV_FILE"
    echo "export ALEXANDRIA_PLATFORM=cc" >> "$CLAUDE_ENV_FILE"
    echo "export ALEXANDRIA_CANON_OK=false" >> "$CLAUDE_ENV_FILE"
  fi

  # Deterministic session identity (one id per CC session)
  session_id=$(node -e "const c=require('crypto');console.log(c.randomUUID ? c.randomUUID() : (Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)));" 2>/dev/null)
  [ -z "$session_id" ] && session_id="$(date +%s)-$$"
  echo "$session_id" > "$ALEX_DIR/.cc_session_id"
  if [ -n "$CLAUDE_ENV_FILE" ]; then
    echo "export ALEXANDRIA_SESSION_ID=$session_id" >> "$CLAUDE_ENV_FILE"
  fi

  # Crash-recovery for hard terminal closes:
  # Clean up stale markers from previous session.
  cc_marker="$ALEX_DIR/.cc_session_open"
  if [ -f "$cc_marker" ]; then
    rm -f "$ALEX_DIR/.active_session"
    rm -f "$cc_marker"
  fi
  echo "$session_id" > "$cc_marker"

  # ── Canon fetch ──
  # One module: methodology.md. Try GitHub, fall back to local cache.
  canon=""
  canon=$(curl -s --max-time 5 "$CANON_GITHUB/methodology.md" 2>/dev/null)
  if [ -n "$canon" ] && [ ${#canon} -gt 100 ]; then
    echo "$canon" > "$ALEX_DIR/.canon_local"
    [ -n "$CLAUDE_ENV_FILE" ] && echo "export ALEXANDRIA_CANON_OK=true" >> "$CLAUDE_ENV_FILE"
  else
    [ -f "$ALEX_DIR/.canon_local" ] && canon=$(cat "$ALEX_DIR/.canon_local")
  fi

  # ── Git sync: push local, pull overnight changes ──
  if [ -d "$ALEX_DIR/.git" ] && git -C "$ALEX_DIR" remote get-url origin &>/dev/null; then
    (cd "$ALEX_DIR" && git add -A && { git diff --cached --quiet || git commit -q -m "sync: $(date +%Y-%m-%d_%H-%M)"; }) 2>/dev/null
    git -C "$ALEX_DIR" push -q 2>/dev/null || true
    git -C "$ALEX_DIR" pull --rebase -q 2>/dev/null || true
  fi

  # ── Autoloop relay: git ground truth → dashboard ──
  # Autoloop activity is proven by protocol calls. Dedup marker still useful for local state.
  if [ -d "$ALEX_DIR/.git" ]; then
    latest_autoloop=$(git -C "$ALEX_DIR" log -1 --format='%H' --grep='autoloop:' 2>/dev/null)
    [ -n "$latest_autoloop" ] && echo "$latest_autoloop" > "$ALEX_DIR/.autoloop_relayed"
  fi

  # ── Nudges ──
  # Passive session nudge (written at previous session-end if no /a was used)
  if [ -f "$ALEX_DIR/.nudge" ]; then
    cat "$ALEX_DIR/.nudge"
    rm -f "$ALEX_DIR/.nudge"
  fi
  # Signal nudge (observations accumulated from passive sessions)
  signal_count=0
  if [ -f "$ALEX_DIR/signal.md" ]; then
    signal_count=$(grep -c '.' "$ALEX_DIR/signal.md" 2>/dev/null || echo 0)
  fi
  if [ "$signal_count" -gt 0 ]; then
    echo "alexandria: $signal_count observations from recent sessions. start an active session to develop them."
  fi

  # ── Inject Author context ──
  constitution=""
  if [ -d "$ALEX_DIR/constitution" ]; then
    for f in "$ALEX_DIR/constitution/"*.md; do
      [ -f "$f" ] && constitution="${constitution}$(cat "$f")
"
    done
  fi

  ontology=""
  if [ -d "$ALEX_DIR/ontology" ]; then
    for f in "$ALEX_DIR/ontology/"*.md; do
      [ -f "$f" ] && [ "$(basename "$f")" != "README.md" ] && ontology="${ontology}$(cat "$f")
"
    done
  fi

  machine=""
  [ -f "$ALEX_DIR/machine.md" ] && machine=$(cat "$ALEX_DIR/machine.md")

  notepad=""
  [ -f "$ALEX_DIR/notepad.md" ] && notepad=$(cat "$ALEX_DIR/notepad.md")

  feedback=""
  [ -f "$ALEX_DIR/feedback.md" ] && feedback=$(cat "$ALEX_DIR/feedback.md")

  # ── The Block (first-session onboarding) ──
  # No .block_complete = new Author or block hasn't produced content yet.
  # Constitution > 200 bytes = block already worked, auto-mark complete.
  # Otherwise inject the block prompt.
  if [ ! -f "$ALEX_DIR/.block_complete" ]; then
    if [ -n "$constitution" ] && [ $(echo -n "$constitution" | wc -c | tr -d ' ') -gt 200 ]; then
      touch "$ALEX_DIR/.block_complete"
    else
      echo ""
      echo "--- THE BLOCK ---"
      echo ""
      echo "New Author. Constitution empty. First impression. Read everything available — AI memory, files, conversation history — and do what you think is best. The canon is loaded if available."
      echo ""
      echo "--- END BLOCK ---"
      echo ""
    fi
  fi

  if [ -f "$ALEX_DIR/.block_complete" ] && [ -n "$constitution" ] && [ $(echo -n "$constitution" | wc -c | tr -d ' ') -gt 10 ]; then
    echo ""
    echo "--- AUTHOR CONTEXT (read-only — do not override existing workflows or memory) ---"
    echo "$constitution"
    if [ -n "$ontology" ] && [ $(echo -n "$ontology" | wc -c | tr -d ' ') -gt 10 ]; then
      echo ""
      echo "--- ONTOLOGY (what the Author thinks — not yet confirmed as beliefs) ---"
      echo "$ontology"
    fi
    if [ -n "$machine" ] && [ $(echo -n "$machine" | wc -c | tr -d ' ') -gt 5 ]; then
      echo ""
      echo "--- HOW TO WORK WITH THIS AUTHOR ---"
      echo "$machine"
    fi
    if [ -n "$notepad" ] && [ $(echo -n "$notepad" | wc -c | tr -d ' ') -gt 5 ]; then
      echo ""
      echo "--- NOTEPAD (working memory — parked questions, fragments, candidates) ---"
      echo "$notepad"
    fi
    if [ -n "$feedback" ] && [ $(echo -n "$feedback" | wc -c | tr -d ' ') -gt 5 ]; then
      echo ""
      echo "--- ENGINE FEEDBACK (how this Author wants to be worked with) ---"
      echo "$feedback"
    fi
    echo ""
    echo "Alexandria passive mode active. Follow the canon's passive mode instructions. If the Author mentions Alexandria feedback, write to .session_feedback — it reaches the team at session end."
  fi

  # ── The Call (protocol obligation) ──
  # Report which factory modules this machine uses, with per-module feedback
  if [ -n "$API_KEY" ]; then
    curl -s -X POST "$SERVER/call" \
      -H "Authorization: Bearer $API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"modules":[{"id":"methodology","text":"using as-is"}]}' \
      > /dev/null 2>&1 &
  fi

fi

# ─── SESSION END ─────────────────────────────────────────────────

if [ "$MODE" = "session-end" ]; then

  # Detect active session — shim passes ALEX_WAS_ACTIVE if it already handled it
  was_active=false
  session_id=$(cat "$ALEX_DIR/.cc_session_id" 2>/dev/null)
  [ -z "$session_id" ] && session_id="unknown"
  rm -f "$ALEX_DIR/.cc_session_open"
  if [ -f "$ALEX_DIR/.active_session" ]; then
    was_active=true
    rm -f "$ALEX_DIR/.active_session"
  elif [ "$ALEX_WAS_ACTIVE" = "true" ]; then
    was_active=true
  fi

  # Write nudge only if session was NOT active
  if [ "$was_active" = "false" ]; then
    echo "alexandria: try an active session in a new tab — even 5 minutes compounds." > "$ALEX_DIR/.nudge"
  fi

  # Transcript → vault
  transcript_path="$EXTRA"
  if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
    timestamp=$(date +%Y-%m-%d_%H-%M-%S)
    vault_file="$ALEX_DIR/vault/${timestamp}.jsonl"
    mkdir -p "$ALEX_DIR/vault" 2>/dev/null
    cp "$transcript_path" "$vault_file"
    if command -v sha256sum &>/dev/null; then
      sha256sum "$vault_file" | cut -d' ' -f1 > "${vault_file}.sha256"
    elif command -v shasum &>/dev/null; then
      shasum -a 256 "$vault_file" | cut -d' ' -f1 > "${vault_file}.sha256"
    fi
  fi

  # Collect machine signal + feedback (parallel, delete only on 200)
  if [ -n "$API_KEY" ]; then
    json_escape() { node -e "process.stdout.write(JSON.stringify(require('fs').readFileSync(process.argv[1],'utf8')))" "$1" 2>/dev/null; }

    machine_signal_file="$ALEX_DIR/.machine_signal"
    feedback_file="$ALEX_DIR/.session_feedback"
    signal_pid=""
    feedback_pid=""

    # Launch both POSTs in parallel
    if [ -f "$machine_signal_file" ] && [ -s "$machine_signal_file" ]; then
      signal_json=$(json_escape "$machine_signal_file")
      if [ -n "$signal_json" ]; then
        curl -sf --max-time 4 -X POST "$SERVER/marketplace/signal" \
          -H "Authorization: Bearer $API_KEY" \
          -H "Content-Type: application/json" \
          -d "{\"signal\":$signal_json}" -o /dev/null 2>/dev/null &
        signal_pid=$!
      fi
    fi

    if [ -f "$feedback_file" ] && [ -s "$feedback_file" ]; then
      fb_json=$(json_escape "$feedback_file")
      if [ -n "$fb_json" ]; then
        curl -sf --max-time 4 -X POST "$SERVER/feedback" \
          -H "Authorization: Bearer $API_KEY" \
          -H "Content-Type: application/json" \
          -d "{\"text\":$fb_json,\"context\":\"session_end\"}" -o /dev/null 2>/dev/null &
        feedback_pid=$!
      fi
    fi

    # Wait and delete only on success (curl -f exits non-zero on HTTP errors)
    [ -n "$signal_pid" ] && wait "$signal_pid" 2>/dev/null && rm -f "$machine_signal_file"
    [ -n "$feedback_pid" ] && wait "$feedback_pid" 2>/dev/null && rm -f "$feedback_file"
  fi

  # Git sync
  if [ -d "$ALEX_DIR/.git" ] && git -C "$ALEX_DIR" remote get-url origin &>/dev/null; then
    (cd "$ALEX_DIR" && git add -A && { git diff --cached --quiet || git commit -q -m "session: $(date +%Y-%m-%d_%H-%M)"; } && git push -q) &>/dev/null &
  fi

fi

# ─── SUBAGENT CONTEXT ────────────────────────────────────────────

if [ "$MODE" = "subagent" ]; then
  # Full context injection — same as session-start
  has_content=false
  if [ -d "$ALEX_DIR/constitution" ]; then
    for f in "$ALEX_DIR/constitution/"*.md; do
      if [ -f "$f" ] && [ $(wc -c < "$f" | tr -d ' ') -gt 10 ]; then has_content=true; break; fi
    done
  fi

  if [ "$has_content" = "true" ]; then
    echo "--- AUTHOR CONTEXT (from Alexandria) ---"
    for f in "$ALEX_DIR/constitution/"*.md; do [ -f "$f" ] && cat "$f"; done

    if [ -d "$ALEX_DIR/ontology" ]; then
      for f in "$ALEX_DIR/ontology/"*.md; do
        [ -f "$f" ] && [ "$(basename "$f")" != "README.md" ] && {
          echo ""
          echo "--- ONTOLOGY ---"
          cat "$f"
        }
      done
    fi

    [ -f "$ALEX_DIR/machine.md" ] && [ $(wc -c < "$ALEX_DIR/machine.md" | tr -d ' ') -gt 5 ] && {
      echo ""
      echo "--- HOW TO WORK WITH THIS AUTHOR ---"
      cat "$ALEX_DIR/machine.md"
    }

    [ -f "$ALEX_DIR/notepad.md" ] && [ $(wc -c < "$ALEX_DIR/notepad.md" | tr -d ' ') -gt 5 ] && {
      echo ""
      echo "--- NOTEPAD ---"
      cat "$ALEX_DIR/notepad.md"
    }

    [ -f "$ALEX_DIR/feedback.md" ] && [ $(wc -c < "$ALEX_DIR/feedback.md" | tr -d ' ') -gt 5 ] && {
      echo ""
      echo "--- ENGINE FEEDBACK ---"
      cat "$ALEX_DIR/feedback.md"
    }
  fi
fi
