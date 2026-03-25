# Alexandria Setup

## Sign up

Go to [mowinckel.ai/signup](https://mowinckel.ai/signup) and sign up with GitHub.

We'll email you a setup command. You can also copy it from the welcome page.

## Install

Open your terminal and paste the command:

```
curl -s https://mcp.mowinckel.ai/setup | bash -s YOUR_API_KEY
```

This creates `~/.alexandria/` on your machine, installs hooks into Claude Code, and sets up the `/a` skill. On Mac, your vault auto-syncs to iCloud for mobile access.

## Use it

**`/a`** — the examined life. Run this in Claude Code when you want to develop your constitution. Alexandria processes your vault, updates your constitution, and engages you with questions, contradictions, and gaps.

**`a.`** — absorb the abundance. Save anything to your vault — articles, voice memos, notes, screenshots. On Mac: drop files into iCloud Drive > Alexandria > vault. On iPhone: share to Files > iCloud Drive > Alexandria > vault (or set up the [shortcut](https://mowinckel.ai/shortcut) for one-tap saving).

Everything else is automatic. Every Claude Code session captures your transcript to the vault. Every new session loads your constitution. The more you put in, the more it knows you.

## Where your data lives

Your cognitive profile is a file on **your machine** at `~/.alexandria/constitution.md`. Your vault is at `~/.alexandria/vault/`. Alexandria has no database. We serve the methodology (Blueprint) and collect anonymous usage metadata. We never see your constitution, your vault, or your conversations.

You own everything. You can read it, edit it, move it, delete it. It's markdown. It's yours.

## Troubleshooting

**"Hooks aren't firing"**
- Check `~/.claude/settings.json` has SessionStart and SessionEnd hooks pointing to `~/.alexandria/hooks/`
- Re-run the setup command to reinstall

**"Constitution isn't growing"**
- Run `/a` to process vault entries manually
- Check `~/.alexandria/vault/` has `.jsonl` files from your sessions

**"I want to start fresh"**
- Delete `~/.alexandria/constitution.md` and it starts over. Your vault is preserved.
