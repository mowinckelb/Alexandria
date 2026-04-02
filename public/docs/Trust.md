# Trust

You are about to run a curl command that puts files on your machine, modifies your ai config, and makes network calls every session. You should know exactly what it does. This page is the full disclosure.

## Inspect before running

```
curl -s https://mcp.mowinckel.ai/setup | less
```

Read the bash script. Everything below explains what it does. If anything below does not match the script, do not run it.

## What it puts on your machine

**`~/.alexandria/`** — a folder. Nothing hidden, nothing compiled. All readable. Some files are created by the setup script, others by the Engine during usage — all are listed here.

| Path | What it is | Can you read it? |
|---|---|---|
| `constitution/` | Markdown files about how you think | Yes — open in any editor |
| `vault/` | Raw input — transcripts, notes, anything you drop in | Yes |
| `hooks/session-start.sh` | Fetches methodology from server, loads constitution into session | Yes — `cat` it |
| `hooks/session-end.sh` | Saves transcript to vault, sends anonymous metadata + optional feedback to server | Yes — `cat` it |
| `hooks/subagent-context.sh` | Injects constitution into subagents | Yes — `cat` it |
| `feedback.md` | What works and doesn't with you — append-only | Yes |
| `machine.md` | Engine's notes on how to work with you | Yes |
| `notepad.md` | Engine's working memory | Yes |
| `ontology/` | Your thinking workspace — ideas between raw and settled | Yes |
| `library/` | Published content (shadows, works, pulse) | Yes |
| `.machine_signal` | Methodology observations for the Factory — about the craft, not about you | Yes |
| `.api_key` | Your API key | Yes |
| `.blueprint_local` | Cached methodology — fetched from server, used locally | Yes |
| `.blueprint_previous` | Previous methodology version — kept for diffing when Blueprint updates | Yes |
| `.blueprint_pinned` | If you create this file, Blueprint stops auto-updating | Yes |
| `.hooks_version` | Tracks installed hook version for auto-updates | Yes |
| `.last_processed` | Timestamp — when vault was last processed | Yes |
| `.last_maintenance` | Timestamp — when scheduled maintenance last ran | Yes |
| `.session_feedback` | Your feedback, if given — sent to server at session end, then deleted | Yes |

**`~/.claude/skills/alexandria/SKILL.md`** — a skill file that makes `/a` available in Claude Code. It tells the ai to read your constitution and follow the Blueprint methodology. Plain markdown — `cat` it.

**`~/.claude/scheduled-tasks/alexandria/SKILL.md`** — an optional autonomous maintenance task for the Claude desktop app. Reprocesses your vault between sessions. Never writes directly to your constitution — writes proposals to an ontology folder that you confirm. Plain markdown — `cat` it.

## What it changes in your config

**`~/.claude/settings.json`** — adds three hook entries (SessionStart, SessionEnd, SubagentStart) pointing to the shell scripts above. Verify:

```
cat ~/.claude/settings.json | grep -A 3 alexandria
```

**`~/.cursor/hooks.json`** + **`~/.cursor/rules/alexandria.mdc`** — only if Cursor is detected. Same hooks, plus a rule that tells Cursor to read your constitution.

## What talks to the server

| Request | When | Sends | Does NOT send |
|---|---|---|---|
| `GET /hooks` | Setup + auto-update | API key | Personal data |
| `GET /blueprint` | Every session start | API key | Personal data |
| `POST /session` | Every session end | File sizes, counts, platform, timestamp | Content, transcripts, constitution, vault |
| `POST /factory/signal` | Session end, if Engine wrote methodology notes | Methodology observations (about the craft, not about you) | Personal data, constitution, vault |
| `POST /feedback` | Session end, if you gave feedback | Your feedback text | Anything else |

Five requests. That is the complete list. The hooks are shell scripts — you can read every line and confirm no other network calls exist.

The server is a stateless Cloudflare Worker. No database for private data. There is no storage mechanism for your constitution, vault, or conversations. The server serves methodology and collects anonymous metadata. If you give feedback at session close, that text is sent and stored (90-day expiry) so the team can read and act on it. Nothing else.

## What stays local

Everything that matters. Constitution, vault, ontology, feedback, machine.md, notepad, library — all local markdown. If Alexandria disappears tomorrow, you keep everything. The only file that leaves your machine is `.session_feedback` (your optional product feedback, sent then deleted) and `.machine_signal` (methodology observations about the craft, not about you).

On Mac, the vault optionally symlinks to iCloud for mobile access. Only if iCloud is detected. You can undo the symlink anytime.

## The genesis scan

After install, the setup prints a block of text to paste into Claude Code. This block instructs Claude to scan your machine for personal writing — documents, notes, journal entries — and build a preliminary constitution from what it finds. **This is the most invasive step.** It runs inside Claude Code — same as any other conversation you have. No Alexandria server involved. You can read the block before pasting it. You can edit it. You can skip it and build your constitution manually via `/a`.

## Remove everything

```
rm -rf ~/.alexandria
rm -rf ~/.claude/skills/alexandria
rm -rf ~/.claude/scheduled-tasks/alexandria
```

Then edit `~/.claude/settings.json` and delete the three hook entries containing `alexandria`. If using Cursor, delete `~/.cursor/hooks.json` and `~/.cursor/rules/alexandria.mdc`.

Nothing persists on the server. Nothing to cancel. Delete the files and it is gone.
