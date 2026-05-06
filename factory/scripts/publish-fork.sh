#!/usr/bin/env bash
# Auto-publish helper for the Author's public alexandria fork.
#
# Run hourly by launchd (macOS) or cron (linux). Picks up anything the
# Author has added under ~/alexandria-fork/factory/ since the last run,
# commits, and pushes. The Author's machine /calls these modules when it
# uses them — that's what surfaces them in the marketplace.
#
# Idempotent: no-op when nothing's changed. Fail-soft: never aborts the
# launchd cycle on transient git errors.

FORK_DIR="${1:-$HOME/alexandria-fork}"

[ -d "$FORK_DIR/.git" ] || exit 0

cd "$FORK_DIR" || exit 0

git add factory/ 2>/dev/null
git diff --cached --quiet && exit 0

git commit -m "alexandria: auto-publish $(date -u +%Y-%m-%dT%H:%M:%SZ)" --no-gpg-sign 2>/dev/null
git push origin main 2>/dev/null
