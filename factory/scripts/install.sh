#!/usr/bin/env bash
# Install a marketplace module — idempotent append to ~/alexandria/.call_manifest.
# Use is the contribution: the next /call POST surfaces the module to the catalog.
#
# Usage: bash install.sh <module-id>
#   github:<user>/<repo>#<path>     — validates path resolves on GitHub
#   local:<github-login>/<slug>     — provisional, no reachability check
set -euo pipefail

MOD="${1:-}"
MANIFEST="$HOME/alexandria/.call_manifest"

if [[ ! "$MOD" =~ ^github:[^/]+/[^#]+#.+$ ]] && [[ ! "$MOD" =~ ^local:[^/]+/.+$ ]]; then
  echo "install: invalid module ID '$MOD'" >&2
  echo "  expected: github:<user>/<repo>#<path>  OR  local:<github-login>/<slug>" >&2
  exit 1
fi

# Reachability check — github: only. Local IDs are pre-publish placeholders.
if [[ "$MOD" =~ ^github:([^/]+)/([^#]+)#(.+)$ ]]; then
  url="https://raw.githubusercontent.com/${BASH_REMATCH[1]}/${BASH_REMATCH[2]}/main/${BASH_REMATCH[3]}.md"
  if ! curl -sfI -o /dev/null "$url"; then
    echo "install: $url unreachable on github" >&2
    exit 1
  fi
fi

mkdir -p "$(dirname "$MANIFEST")"
[[ -f "$MANIFEST" ]] || echo '{"modules":[]}' > "$MANIFEST"

if jq -e --arg id "$MOD" '.modules | any(.id == $id)' "$MANIFEST" >/dev/null; then
  echo "install: $MOD already in manifest"
  exit 0
fi
tmp=$(mktemp)
jq --arg id "$MOD" '.modules += [{id: $id, text: ""}]' "$MANIFEST" > "$tmp" && mv "$tmp" "$MANIFEST"
echo "install: added $MOD"
