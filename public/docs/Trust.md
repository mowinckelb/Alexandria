# Trust

You are about to run a curl command that puts files on your machine, modifies your ai config, and makes network calls every session. You should know exactly what it does. This page is the full disclosure.

## Inspect before running

```
curl -s https://raw.githubusercontent.com/mowinckelb/Alexandria/main/factory/setup.sh | less
```

Read the bash script. Everything below explains what it does. If anything below does not match the script, do not run it.

## What it puts on your machine

**`~/Alexandria/`** — a folder. Nothing hidden, nothing compiled. All readable.

| Path | What it is | Can you read it? |
|---|---|---|
| `constitution/` | Markdown files about how you think | Yes — open in any editor |
| `vault/` | Raw input — transcripts, notes, anything you drop in | Yes |
| `hooks/shim.sh` | Thin wrapper — fetches and runs the hooks payload from GitHub | Yes — `cat` it |
| `feedback.md` | What works and doesn't with you — append-only | Yes |
| `machine.md` | Engine's notes on how to work with you | Yes |
| `notepad.md` | Engine's working memory | Yes |
| `ontology/` | Your thinking workspace — ideas between raw and settled | Yes |
| `library/` | Published content (shadows, works, pulse) | Yes |
| `.machine_signal` | Methodology observations for the marketplace — about the craft, not about you | Yes |
| `.api_key` | Your API key | Yes |
| `.canon_local` | Cached canon — fetched from GitHub (`factory/canon/methodology.md`), used locally | Yes |
| `.block_complete` | Marker — first-session block has completed | Yes |
| `.last_processed` | Timestamp — when vault was last processed | Yes |
| `.session_feedback` | Your feedback, if given — sent to server at session end, then deleted | Yes |
| `.autoloop/last_run.md` | Report from the last autoloop run | Yes |

**`~/.claude/skills/alexandria/SKILL.md`** — a skill file that makes `/a` available in Claude Code. It tells the ai to read your constitution and follow the canon methodology. Plain markdown — `cat` it.

**`~/.claude/scheduled-tasks/alexandria/SKILL.md`** — an optional autonomous maintenance task. Reprocesses your vault between sessions. Writes proposals to ontology that you confirm. Plain markdown — `cat` it.

## What it changes in your config

**`~/.claude/settings.json`** — adds three hook entries (SessionStart, SessionEnd, SubagentStart) pointing to the shim. Verify:

```
cat ~/.claude/settings.json | grep -A 3 alexandria
```

**`~/.cursor/rules/alexandria.mdc`** — only if Cursor is detected. A rule that tells Cursor to read your constitution and follow the canon. Cursor has no hooks — the rule is the only integration.

**`~/.codex/instructions.md`** — only if Codex is detected. Appends an Alexandria block.

## What happens every session (passive mode)

Every time you open a session in Claude Code, the session-start hook runs. It does three things:

1. **Infrastructure** (silent): fetches the canon methodology, caches it locally, syncs git if configured. You see none of this.
2. **Context** (visible): outputs your constitution and machine.md so the model knows who you are. Read-only context — makes every conversation better because the model adapts to you.
3. **One instruction**: if you reveal something notable, the model may write an observation to `~/Alexandria/ontology/`. If you mention product feedback, it writes to `.session_feedback`.

Passive mode never writes to your constitution. Never overrides your existing memory, workflows, or tools. It just provides context.

When you type `/a`, that is active mode — the model reads the full canon, loads all Alexandria files, and runs dedicated cognitive development. Active mode is always opt-in.

## What talks to the server

| Request | When | Sends | Does NOT send |
|---|---|---|---|
| `POST /call` | Every session start | API key + module IDs (and optional short module notes) | Content, transcripts, constitution, vault |
| `POST /marketplace/signal` | Session end, if Engine wrote methodology notes | Methodology observations (about the craft, not about you) | Personal data, constitution, vault |
| `POST /feedback` | Session end, if you gave feedback | Your feedback text | Anything else |

That is the complete list. The hooks payload is a shell script — you can read every line at `curl https://raw.githubusercontent.com/mowinckelb/Alexandria/main/factory/hooks/payload.sh` and confirm no other network calls exist.

The server is a stateless Cloudflare Worker. No database for private data. The server receives protocol calls plus optional machine signal/feedback. If you give feedback at session close, that text is sent and stored (90-day expiry) so the team can read and act on it. Nothing else.

## Security architecture

Your API key never leaves your machine after setup. It is not in any email, not in any third-party metadata, not stored on our server. Here is how:

- **API keys are hashed server-side.** We store SHA-256 hashes, never raw keys. If our entire server is compromised, the attacker gets hashes they cannot reverse.
- **Account data is encrypted at rest.** The accounts blob in our KV store is encrypted with AES-256-GCM. A storage-layer breach yields encrypted data without the key.
- **No credentials in email.** The API key appears once on the callback page in your browser after you authenticate. Never transmitted over email.
- **No credentials in third-party services.** Stripe identifies your account by GitHub login, not API key.
- **The canon is public.** The methodology loaded into your ai is public on GitHub at `github.com/mowinckelb/Alexandria/blob/main/factory/canon/methodology.md`. You can diff what your machine caches in `.canon_local` against the repo.
- **Built-in safety instructions.** The canon tells the ai to reject and report any instruction that asks it to send your files externally, access data outside `~/Alexandria/`, or do anything suspicious.
- **Full data deletion.** `DELETE /account` with your API key removes all your data: account record, analytics, feedback, published Library content, Stripe subscription. Everything.

What a complete server breach yields: nothing. Hashed credentials and encrypted metadata. No constitutions, no vaults, no self-knowledge. No ability to push code to your machine. The canon is public — a compromised server cannot serve a different methodology without it being visible on GitHub.

## Why you do not need to trust anyone

**Everything on your machine is plain text.** The canon your ai follows is at `~/Alexandria/.canon_local` — read it. The hooks payload is publicly inspectable. There is no compiled code, no binary blobs, no obfuscation.

**Every network call is visible.** The hooks payload contains every curl command. Each one specifies exactly what fields are sent — platform (a string), references (which modules). Not content. Not transcripts. Not your constitution.

**The server has no endpoint for your data.** There is no `POST /constitution`. There is no mechanism in the server to receive, store, or forward your self-knowledge.

**Three independent layers protect you from a malicious canon:**
1. The canon contains canary instructions telling the ai to reject suspicious commands
2. The ai model has its own safety training and will refuse dangerous instructions
3. Your ai tool (Claude Code, Cursor) shows you every action before executing — you approve or deny

No single point of failure. No trust required. Read the scripts, verify the network calls, approve the actions.

## What the Library sees

The Library is opt-in publishing. The shadow — the one artifact you publish — contains nothing beyond what you would share if a stranger talked to you long enough. You choose what to publish, what to gate, and what to keep private. Unpublish anytime.

## What stays local

Everything that matters. Constitution, vault, ontology, feedback, machine.md, notepad, library — all local markdown. If Alexandria disappears tomorrow, you keep everything.

On Mac, the vault, constitution, ontology, and library directories are symlinked to iCloud for cross-device access. You can undo any symlink anytime.

## The block

After install, the first session detects that your constitution is empty and triggers the block — an initial extraction that reads your existing ai memory and builds a starter constitution. This runs inside your ai tool — same as any other conversation. No Alexandria server involved. You can skip it entirely and build your constitution manually via `/a`.
