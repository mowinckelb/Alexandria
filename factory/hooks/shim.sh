#!/usr/bin/env bash
# Alexandria shim — one file, three modes, everything else lives on GitHub
# Immutable. Installed once. All evolving logic lives in payload.sh.
# Inspect the payload: https://raw.githubusercontent.com/mowinckelb/Alexandria/main/factory/hooks/payload.sh

ALEX_DIR="$HOME/Alexandria"
API_KEY="${ALEXANDRIA_KEY:-$(cat "$ALEX_DIR/.api_key" 2>/dev/null)}"
MODE="$1"
PAYLOAD_URL="https://raw.githubusercontent.com/mowinckelb/Alexandria/main/factory/hooks/payload.sh"

if [ "$MODE" = "session-start" ]; then
  # Fetch payload from GitHub, cache locally, execute.
  # -f: exit non-zero on HTTP errors (else a 404 HTML page would satisfy the
  # >100-byte defensive check and corrupt .hooks_payload).
  payload=$(curl -sf --max-time 5 "$PAYLOAD_URL" 2>/dev/null)
  fetch_status=$?
  fresh=false
  if [ -n "$payload" ] && [ ${#payload} -gt 100 ]; then
    echo "$payload" > "$ALEX_DIR/.hooks_payload" && fresh=true
  elif [ -f "$ALEX_DIR/.hooks_payload" ]; then
    # Never silent: a cached payload from before X-Alexandria-Client was added
    # is invisible to the server drift alarm. Shim stdout is the one channel
    # that reaches the AI regardless of cached-payload vintage.
    payload=$(cat "$ALEX_DIR/.hooks_payload")
    fresh=stale
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) shim payload fetch failed (curl=$fetch_status); using cached payload" >> "$ALEX_DIR/.alexandria_errors"
    mtime=$(stat -f %m "$ALEX_DIR/.hooks_payload" 2>/dev/null || stat -c %Y "$ALEX_DIR/.hooks_payload" 2>/dev/null || echo 0)
    now=$(date -u +%s)
    if [ "$mtime" -gt 0 ]; then cache_age_days=$(( (now - mtime) / 86400 )); else cache_age_days="?"; fi
    echo ""
    echo "--- ALEXANDRIA UPGRADE NEEDED ---"
    echo "Cached hooks payload is ${cache_age_days} days old; fresh fetch from GitHub failed (curl exit ${fetch_status})."
    echo "Reinstall: curl -fsSL https://raw.githubusercontent.com/mowinckelb/Alexandria/main/factory/setup.sh | bash"
    echo "--- END UPGRADE ---"
    echo ""
  fi

  if [ -n "$payload" ]; then
    echo "$payload" | bash -s -- session-start "$ALEX_DIR" "$API_KEY" "" "$fresh"
  else
    # Bare fallback — just inject constitution
    [ -d "$ALEX_DIR/constitution" ] && for f in "$ALEX_DIR/constitution/"*.md; do [ -f "$f" ] && cat "$f"; done
  fi

elif [ "$MODE" = "session-end" ]; then
  # Clean up active session marker
  was_active=false
  [ -f "$ALEX_DIR/.active_session" ] && was_active=true && rm -f "$ALEX_DIR/.active_session"

  # Read stdin — portable timeout (macOS lacks GNU timeout)
  if command -v timeout &>/dev/null; then
    input=$(timeout 5 cat 2>/dev/null)
  else
    input=$(cat 2>/dev/null)
  fi
  tp=$(echo "$input" | grep -o '"transcript_path":"[^"]*"' | cut -d'"' -f4)
  if [ -f "$ALEX_DIR/.hooks_payload" ]; then
    ALEX_WAS_ACTIVE=$was_active bash "$ALEX_DIR/.hooks_payload" session-end "$ALEX_DIR" "$API_KEY" "$tp"
  else
    # Bare fallback — just save transcript to vault
    [ -n "$tp" ] && [ -f "$tp" ] && mkdir -p "$ALEX_DIR/vault" && cp "$tp" "$ALEX_DIR/vault/$(date +%Y-%m-%d_%H-%M-%S).jsonl"
  fi

elif [ "$MODE" = "subagent" ]; then
  if [ -f "$ALEX_DIR/.hooks_payload" ]; then
    bash "$ALEX_DIR/.hooks_payload" subagent "$ALEX_DIR"
  else
    # Bare fallback — just inject constitution
    [ -d "$ALEX_DIR/constitution" ] && for f in "$ALEX_DIR/constitution/"*.md; do [ -f "$f" ] && cat "$f"; done
  fi
fi
