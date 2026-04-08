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
| `hooks/session-start.sh` | Fetches and caches methodology, loads constitution + machine.md as context, syncs git, auto-updates hooks | Yes — `cat` it |
| `hooks/session-end.sh` | Saves transcript to vault, sends anonymous metadata + optional feedback to server, syncs git | Yes — `cat` it |
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
| `.autoloop/proposals/` | Proposed changes from overnight processing — you review and accept/reject | Yes |
| `.autoloop/last_run.md` | Report from the last autoloop run — what it did, what it proposed | Yes |

**`~/.claude/skills/alexandria/SKILL.md`** — a skill file that makes `/a` available in Claude Code. It tells the ai to read your constitution and follow the Blueprint methodology. Plain markdown — `cat` it.

**`~/.claude/scheduled-tasks/alexandria/SKILL.md`** — an optional autonomous maintenance task for the Claude desktop app. Reprocesses your vault between sessions. Never writes directly to your constitution — writes proposals to an ontology folder that you confirm. Plain markdown — `cat` it.

## What it changes in your config

**`~/.claude/settings.json`** — adds three hook entries (SessionStart, SessionEnd, SubagentStart) pointing to the shell scripts above. Verify:

```
cat ~/.claude/settings.json | grep -A 3 alexandria
```

**`~/.cursor/rules/alexandria.mdc`** — only if Cursor is detected. A rule that tells Cursor to read your constitution and follow the Blueprint. Cursor has no hooks — the rule is the only integration. This means activation is probabilistic: the model reads and follows the rule most of the time, but there is no guarantee. Vault capture, overnight processing, and automatic Blueprint updates require Claude Code.

**`~/.codex/instructions.md`** — only if Codex is detected. Appends an Alexandria block (delimited by `<!-- alexandria:start/end -->` comments). Same as Cursor: probabilistic, no hooks, no vault capture.

## What happens every session (passive mode)

Every time you open a session in Claude Code, the session-start hook runs. It does three things:

1. **Infrastructure** (silent): fetches and caches the Blueprint methodology, auto-updates hook scripts if a new version is available, syncs git if configured. You see none of this — it happens in the background.
2. **Context** (visible): outputs your constitution and machine.md so the model knows who you are. This is read-only context — same as platform memory or a CLAUDE.md file. It makes every conversation slightly better because the model adapts to you.
3. **One instruction**: if you reveal something notable about yourself during a normal session, the model may write an observation to `~/.alexandria/ontology/` (unconfirmed observations, not your constitution). If you mention product feedback about Alexandria, it writes to `.session_feedback` so the team hears it.

That is it. Passive mode never writes to your constitution. Never overrides your existing memory, workflows, or tools. Never injects methodology or tells the model how to behave. It just provides context.

When you type `/a`, that is active mode — the model reads the full Blueprint, loads all Alexandria files, and runs dedicated cognitive development. Active mode is always opt-in.

## What talks to the server

| Request | When | Sends | Does NOT send |
|---|---|---|---|
| `GET /hooks` | Setup + auto-update | API key | Personal data |
| `GET /blueprint` | Every session start | API key | Personal data |
| `POST /session` | Every session end | File sizes, counts, platform, timestamp | Content, transcripts, constitution, vault |
| `POST /factory/signal` | Session end, if Engine wrote methodology notes | Methodology observations (about the craft, not about you) | Personal data, constitution, vault |
| `POST /feedback` | Session end, if you gave feedback | Your feedback text | Anything else |

Five requests. That is the complete list. The hooks are shell scripts — you can read every line and confirm no other network calls exist.

**Auto-update mechanism:** When the server returns a new `X-Hooks-Version` header with the Blueprint response, the session-start hook re-fetches `/hooks` and replaces the local hook scripts. This is how bug fixes and improvements reach your machine without reinstalling. The updated scripts are the same bash files in `~/.alexandria/hooks/` — you can read them after any update. If you want to freeze your hooks, create `~/.alexandria/.blueprint_pinned` — this also stops Blueprint updates.

Additionally, if `~/.alexandria/` is a git repo with a remote (set up during install), the hooks run `git push` and `git pull` at session boundaries to sync with your private GitHub backup. These are git operations using your own credentials to your own repo — no Alexandria server involved.

The server is a stateless Cloudflare Worker. No database for private data. There is no storage mechanism for your constitution, vault, or conversations. The server serves methodology and collects anonymous metadata. If you give feedback at session close, that text is sent and stored (90-day expiry) so the team can read and act on it. Nothing else.

## Security architecture

Your API key never leaves your machine after setup. It is not in any email, not in any third-party metadata, not stored on our server. Here is how:

- **API keys are hashed server-side.** We store SHA-256 hashes, never raw keys. When your hooks authenticate, we hash what they send and compare hashes. If our entire server is compromised, the attacker gets hashes they cannot reverse.
- **Account data is encrypted at rest.** The accounts blob in our KV store is encrypted with AES-256-GCM. The encryption key lives in the Worker environment, not in storage. A storage-layer breach yields encrypted data without the key.
- **No credentials in email.** The welcome email links to your setup page. The API key appears once on the callback page in your browser after you authenticate. It is never transmitted over email.
- **No credentials in third-party services.** Stripe identifies your account by GitHub login, not API key. No raw key exists in any external system.
- **Full data deletion.** `DELETE /account` with your API key removes all your data: account record, analytics, feedback, published Library content, Stripe subscription. Everything. Verify: the endpoint returns `{ ok: true }`.

What a complete server breach yields: hashed credentials, encrypted metadata, and anonymous usage patterns. No constitutions, no vaults, no self-knowledge, no cognitive data. There is nothing to steal because we do not have it.

## What stays local

Everything that matters. Constitution, vault, ontology, feedback, machine.md, notepad, library — all local markdown. If Alexandria disappears tomorrow, you keep everything. The only file that leaves your machine is `.session_feedback` (your optional product feedback, sent then deleted) and `.machine_signal` (methodology observations about the craft, not about you).

On Mac, the vault, constitution, ontology, and library directories are symlinked to `~/Library/Mobile Documents/com~apple~CloudDocs/Alexandria/` for cross-device access. Only if iCloud is detected. This gives you mobile access to your vault (add voice memos from your phone) and keeps everything synced across Apple devices. You can undo any symlink anytime — just delete the symlink and recreate the directory.

## The setup block

After install, the setup prints a block of text to paste into a new chat. This block instructs the model to: (1) read your existing ai memory and personal files to build a preliminary constitution, ontology, and notepad, and (2) search the internet for material calibrated to your interests. **This is the most invasive step.** It runs inside your ai tool — same as any other conversation you have. No Alexandria server involved. You can read the block before pasting it. You can edit it. You can skip it and build your constitution manually via `/a`.

## Git backup — your data, your repo

During setup, `~/.alexandria/` is initialized as a git repo. If `gh` (GitHub CLI) is installed and authenticated, the script creates a **private** GitHub repo called `alexandria-private` under **your** GitHub account and pushes to it. Alexandria has no access to this repo. It is yours.

If `gh` is not available, no repo is created. Everything still works — you just don't get cloud backup.

What git enables:

- **Full version history.** Every change to your constitution, ontology, vault, and machine files is tracked. You can diff any two points in time, revert any change, recover anything.
- **Cloud backup.** Your private GitHub repo is a second copy. If your machine dies, clone the repo and you are back.
- **Cross-device sync for the autoloop.** The nightly autoloop (see below) accesses your files through this repo. Without it, the autoloop cannot run.

Verify: `cd ~/.alexandria && git remote -v` — the origin should point to your own GitHub account.

## Session-level git sync

Two sync points per session, both in the hooks you already have:

**Session start** (`hooks/session-start.sh`): Commits any new local files (e.g. vault entries added via iCloud between sessions), pushes to GitHub, then pulls any changes from GitHub (e.g. overnight autoloop proposals). Runs before your constitution loads into the session. You can read the exact commands — they are in the hook script.

**Session end** (`hooks/session-end.sh`): Commits the session transcript (saved to vault) plus any constitution or ontology changes made during the session, then pushes to GitHub. This runs in the background — it does not block your terminal.

Both syncs are conditional: if `~/.alexandria/` is not a git repo, or has no remote, nothing happens. No errors, no retries.

## The autoloop — overnight processing

During setup, the script installs a Claude Code scheduled task (`~/.claude/scheduled-tasks/alexandria/SKILL.md`). This is a nightly cloud trigger that runs on **Anthropic's infrastructure** (Claude Code remote), not Alexandria's servers.

What it does:

1. Clones your private GitHub repo (the one under your account).
2. Reads your vault, constitution, and ontology.
3. Processes vault entries against three fragment pools — developing your constitution, refining ontology proposals, maintaining the notepad.
4. Writes proposed changes to `~/.alexandria/.autoloop/proposals/` and a run report to `~/.alexandria/.autoloop/last_run.md`.
5. Commits and pushes changes back to your repo.
6. Next time you open a session, the session-start hook pulls these changes down to your machine.

**Alexandria never sees the data.** The autoloop runs on Anthropic infrastructure, accessing your private GitHub repo directly. Alexandria's server is not involved. The data path is: your repo → Anthropic → your repo.

You can verify: read the scheduled task (`cat ~/.claude/scheduled-tasks/alexandria/SKILL.md`). It is plain markdown — instructions for Claude, not compiled code.

To disable the autoloop: delete `~/.claude/scheduled-tasks/alexandria/`. The rest of Alexandria continues to work normally.

## Self-evaluation and Author control

Every autoloop run and every Engine session commits to git. This gives you full control:

- **Review**: `cd ~/.alexandria && git log --oneline` shows every change, who made it, when.
- **Diff**: `git diff HEAD~1` shows exactly what the last run changed.
- **Revert**: `git revert HEAD` undoes the last change. Any change. Anytime.

The autoloop writes proposals, not edicts. Constitution changes cite the Author's exact words from the vault — you can verify every claim against your own source material. If something looks wrong, revert it. The git history is the audit trail.

## What you can change — just by talking

Alexandria is not an app with fixed behavior. It is a skill loaded into your existing ai. The same Claude you already use. Alexandria gives it a philosophy, a methodology (the Blueprint), and your files. That is all.

Everything about HOW it works with you is flexible. Just say it:

- "Be more direct" / "Be gentler"
- "Don't bring up philosophy"
- "Stop asking me questions at the end"
- "Focus only on my writing, not my thinking"
- "Be shorter" / "Go deeper"
- "Skip the vault processing this session"
- "Don't push back so hard"
- "I want accretion only, no development"

There is no behavior you have to accept. The Engine writes your preferences to `machine.md` so you only have to say it once. Over time, the Engine learns how to work with you specifically — that is what `machine.md` is for.

**What IS Alexandria (cannot change by talking):**
- Your constitution lives as local markdown files on your machine — that is the architecture
- The developmental objective: the Engine tries to help you think harder — that is the philosophy
- Your data stays local — that is the sovereignty guarantee

Everything else — tone, depth, topics, structure, what it does and does not do — is a conversation between you and your ai. Same as it always was.

## Remove everything

Delete your server-side data first, then remove local files:

```
# 1. Delete all server-side data (account, analytics, feedback, Library content, Stripe subscription)
curl -X DELETE https://mcp.mowinckel.ai/account -H "Authorization: Bearer $(cat ~/.alexandria/.api_key)"

# 2. Remove local files
rm -rf ~/.alexandria
rm -rf ~/.claude/skills/alexandria
rm -rf ~/.claude/scheduled-tasks/alexandria
```

Then edit `~/.claude/settings.json` and delete the three hook entries containing `alexandria`. If using Cursor, delete `~/.cursor/rules/alexandria.mdc`. If using Codex, remove the `<!-- alexandria:start -->` to `<!-- alexandria:end -->` block from `~/.codex/instructions.md`.

If the autoloop created a GitHub repo: `gh repo delete alexandria-private --yes` (or delete it from github.com). If iCloud symlinks were created on Mac, the data in `~/Library/Mobile Documents/com~apple~CloudDocs/Alexandria/` can be deleted separately.

After step 1, nothing persists on Alexandria's server. After step 2, nothing persists on your machine. Gone.
