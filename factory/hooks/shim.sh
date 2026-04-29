#!/usr/bin/env bash
# Alexandria shim — one file, three modes, everything else lives on GitHub
# Immutable. Installed once. All evolving logic lives in payload.sh.
# Inspect the payload: https://raw.githubusercontent.com/mowinckelb/alexandria/main/factory/hooks/payload.sh

ALEX_DIR="$HOME/alexandria"
API_KEY="${ALEXANDRIA_KEY:-$(cat "$ALEX_DIR/system/.api_key" 2>/dev/null)}"
MODE="$1"
PAYLOAD_URL="https://raw.githubusercontent.com/mowinckelb/alexandria/main/factory/hooks/payload.sh"

if [ "$MODE" = "session-start" ]; then
  # Fetch payload from GitHub, cache locally, execute.
  # -f: exit non-zero on HTTP errors (else a 404 HTML page would satisfy the
  # >100-byte defensive check and corrupt .hooks_payload).
  payload=$(curl -sf --max-time 5 "$PAYLOAD_URL" 2>/dev/null)
  fetch_status=$?
  fresh=false
  if [ -n "$payload" ] && [ ${#payload} -gt 100 ]; then
    echo "$payload" > "$ALEX_DIR/system/.hooks_payload" && fresh=true
  elif [ -f "$ALEX_DIR/system/.hooks_payload" ]; then
    # Fetch failed — decide whether the cached payload is safe to fall back to.
    # Hard cutoff at 14d: any cache older than that likely predates current
    # protocol guarantees (e.g. X-Alexandria-Client header). Running stale
    # code silently is worse than running bare. Soft warning under the cutoff.
    mtime=$(stat -f %m "$ALEX_DIR/system/.hooks_payload" 2>/dev/null || stat -c %Y "$ALEX_DIR/system/.hooks_payload" 2>/dev/null || echo 0)
    now=$(date -u +%s)
    if [ "$mtime" -gt 0 ]; then cache_age_days=$(( (now - mtime) / 86400 )); else cache_age_days=999; fi

    if [ "$cache_age_days" -ge 14 ]; then
      # Delete the stale cache so session-end + subagent modes also fall through
      # to bare. One coherent failure mode beats three drifting ones.
      rm -f "$ALEX_DIR/system/.hooks_payload"
      echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) shim payload fetch failed (curl=$fetch_status); cache ${cache_age_days}d old — deleted, bare mode" >> "$ALEX_DIR/system/.alexandria_errors"
      echo ""
      echo "--- ALEXANDRIA CACHE EXPIRED ---"
      echo "Cached hooks payload was ${cache_age_days} days old (max 14); fresh fetch from GitHub failed (curl exit ${fetch_status})."
      echo "Deleted stale cache. Running bare mode (constitution only, no protocol calls)."
      echo "Reinstall to restore full functionality: curl -fsSL https://raw.githubusercontent.com/mowinckelb/alexandria/main/factory/setup.sh | bash"
      echo "--- END EXPIRED ---"
      echo ""
    else
      # Within window — use cache, warn loudly. Shim stdout is the one channel
      # that reaches the AI regardless of cached-payload vintage.
      payload=$(cat "$ALEX_DIR/system/.hooks_payload")
      fresh=stale
      echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) shim payload fetch failed (curl=$fetch_status); using cached payload (${cache_age_days}d old)" >> "$ALEX_DIR/system/.alexandria_errors"
      echo ""
      echo "--- ALEXANDRIA UPGRADE NEEDED ---"
      echo "Cached hooks payload is ${cache_age_days} days old; fresh fetch from GitHub failed (curl exit ${fetch_status})."
      echo "Reinstall: curl -fsSL https://raw.githubusercontent.com/mowinckelb/alexandria/main/factory/setup.sh | bash"
      echo "--- END UPGRADE ---"
      echo ""
    fi
  fi

  if [ -n "$payload" ]; then
    echo "$payload" | bash -s -- session-start "$ALEX_DIR" "$API_KEY" "" "$fresh"
  else
    # Bare fallback — just inject constitution
    [ -d "$ALEX_DIR/files/constitution" ] && for f in "$ALEX_DIR/files/constitution/"*.md; do [ -f "$f" ] && cat "$f"; done
  fi

elif [ "$MODE" = "session-end" ]; then
  # Clean up active session marker
  was_active=false
  [ -f "$ALEX_DIR/system/.active_session" ] && was_active=true && rm -f "$ALEX_DIR/system/.active_session"

  # Read stdin — portable timeout (macOS lacks GNU timeout)
  if command -v timeout &>/dev/null; then
    input=$(timeout 5 cat 2>/dev/null)
  else
    input=$(cat 2>/dev/null)
  fi
  tp=$(echo "$input" | grep -o '"transcript_path":"[^"]*"' | cut -d'"' -f4)
  if [ -f "$ALEX_DIR/system/.hooks_payload" ]; then
    ALEX_WAS_ACTIVE=$was_active bash "$ALEX_DIR/system/.hooks_payload" session-end "$ALEX_DIR" "$API_KEY" "$tp"
  else
    # Bare fallback — just save transcript to vault
    [ -n "$tp" ] && [ -f "$tp" ] && mkdir -p "$ALEX_DIR/files/vault" && cp "$tp" "$ALEX_DIR/files/vault/$(date +%Y-%m-%d_%H-%M-%S).jsonl"
  fi

elif [ "$MODE" = "subagent" ]; then
  if [ -f "$ALEX_DIR/system/.hooks_payload" ]; then
    bash "$ALEX_DIR/system/.hooks_payload" subagent "$ALEX_DIR"
  else
    # Bare fallback — just inject constitution
    [ -d "$ALEX_DIR/files/constitution" ] && for f in "$ALEX_DIR/files/constitution/"*.md; do [ -f "$f" ] && cat "$f"; done
  fi
fi
