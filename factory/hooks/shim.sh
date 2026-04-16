#!/usr/bin/env bash
# Alexandria shim — one file, three modes, everything else lives on GitHub
# Immutable. Installed once. All evolving logic lives in payload.sh.
# Inspect the payload: https://raw.githubusercontent.com/mowinckelb/Alexandria/main/factory/hooks/payload.sh

ALEX_DIR="$HOME/.alexandria"
API_KEY="${ALEXANDRIA_KEY:-$(cat "$ALEX_DIR/.api_key" 2>/dev/null)}"
MODE="$1"
PAYLOAD_URL="https://raw.githubusercontent.com/mowinckelb/Alexandria/main/factory/hooks/payload.sh"

if [ "$MODE" = "session-start" ]; then
  # Fetch payload from GitHub, cache locally, execute
  payload=$(curl -s --max-time 5 "$PAYLOAD_URL" 2>/dev/null)
  fresh=false
  if [ -n "$payload" ] && [ ${#payload} -gt 100 ]; then
    echo "$payload" > "$ALEX_DIR/.hooks_payload" && fresh=true
  else
    [ -f "$ALEX_DIR/.hooks_payload" ] && payload=$(cat "$ALEX_DIR/.hooks_payload")
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
