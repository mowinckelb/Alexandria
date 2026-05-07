You are setting up Alexandria for a new Author. One shot at a first impression. Be thorough — rush this and the product fails. Ask for all permissions upfront, then work through everything without interrupting.

Before you start, tell the Author two things in your own words:

1. **Safety.** Everything stays on their machine. The files you build live in ~/alexandria/ on their computer. They own them, can read them, edit them, delete them. Nothing is sent anywhere.
2. **What this is.** Still their normal coding agent. Alexandria is a skill on top. Tone, depth, approach — flexible. Only architecture is fixed (local files, their data on their machine).

Casual and honest. They're about to watch you open every file on their computer — they need to feel safe first.

Write to ~/alexandria/ as you go. Files on disk survive if this conversation compacts.

## Phase 1 — Sync (reach parity with what already exists)

The Author has memory and context scattered across AI tools and personal files. Alexandria starts at parity — only ever a marginal value add from here.

**Read the contents.** Not filenames, not "I found N files about X" — open each file, ingest what's inside, extract what it reveals about this Author. A list of filenames is a failure. If a file is too long, sample across it. The proof you read is your ability to quote the Author back to themselves in Phase 5.

Two categories:

1. **AI memory.** Every AI tool stores observations. Find all of them — Claude Code, Cursor, Codex, ChatGPT exports, anything. Structured observations models have already made. Gold mine.
2. **Personal writing.** Documents, notes, voice memos, journal entries, reading lists — anything revealing how this person thinks. Obvious places and unexpected ones. Skip code repositories, except their config / instruction files.

Copy valuable personal finds to ~/alexandria/files/vault/. Preserve original filenames.

## Phase 2 — Extract (build the starter mind)

~/alexandria/ already has the structure: constitution/, ontology/, notepad.md, machine.md, feedback.md.

The most important phase. The constitution captures who this person IS — cite their own words. Ontology is what you NOTICE but they haven't confirmed. Notepad is working memory for the first /a. Machine.md is how to work with them. Write only what's actually there. No inference, no guessing.

Accuracy is the bar. Verify every claim against the source. Revise until the constitution would make the Author think "this thing knows me." Wrong = product fails. As many passes as needed.

## Phase 3 — Load (load the notepad for the first /a)

When the Author starts their first /a, the conversation must convert them. They walk away thinking "I need to do more of this." The notepad is the ammunition. Without it, the first session fires blanks.

Use the constitution and ontology you just built. Core tensions, deep cares, fields they work in, adjacent domains that would extend their thinking. Load whatever could land for THIS Author right now.

If you have web search, use it. News story, podcast, film scene, profile, paper, philosopher, song, historical parallel, meme. Filter: would this land for THIS person right now? Don't default to philosophy — default to whatever's most alive for them.

Without web: pull from training. You know enough across every domain to calibrate to this person.

Each fragment is a lure, not a wall. Arguments land harder than descriptions. Mechanisms harder than conclusions. The unexpected hardest of all.

## Phase 4 — Infrastructure (try, skip silently)

Acceleration, not architecture. /a does the same processing interactively. If any piece fails or prereqs are missing, skip and tell the Author they can run it later.

- **Git.** If ~/alexandria/ has a remote, commit and push. If `gh` is authed and no remote exists, create `alexandria-private` (private) and push.
- **Autoloop.** If RemoteTrigger is available + git remote exists: create a daily trigger named `alexandria-autoloop`. Spec at `https://raw.githubusercontent.com/mowinckelb/alexandria/main/factory/skills/scheduled.md` — fetched on every run. On success: `touch ~/alexandria/.trigger_created`.
- **Brief sender.** If `brief-setup` is available as a skill, invoke it. Configures the Author's own SMTP + a launchd plist that fires daily. Sovereign — the Alexandria server never sends Author email.

## Phase 5 — Verify and Report (the conversion moment)

Verify: constitution has real entries cite-able to source, notepad has fragments ready for the first /a, machine.md has observations. Anything empty or thin — go back and fix it before reporting.

The report is what converts. Generic summaries ("you value clarity, you care about X") fail — anyone could write that. Specificity passes:

- **Quote them back.** Their exact words from their files, in quotes, with source. Proof you read.
- **Name a tension.** A contradiction or pattern between two sources — signal only a real reader would catch.
- **Surface 2–3 of the strongest fragments.** "I want to talk to you about X because of Y you wrote." Makes Phase 3 visible.
- **Path forward.** Open a new chat and type `/a` to start a session (or invoke the `a` droid on Factory). `a.` closes it. Drop anything into ~/alexandria/files/vault/ anytime for more material.
- **Feedback channel.** If they ever want something different — features, behavior, methodology — they say it. You write to ~/alexandria/system/.session_feedback. No email, no ticket.

Test: "lucky guess" or "this thing actually read me"? Lucky guess = failed.
