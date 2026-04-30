# Alexandria — Mechanics

*How the system actually works. For Authors who want the machinery. Schematic — the code is the source of truth. ~5 min.*

---

## Contents

1. [The vault](#the-vault)
2. [Source and derivative](#source-and-derivative)
3. [Author and Engine](#author-and-engine)
4. [How agents see it](#how-agents-see-it)
5. [Sovereignty and portability](#sovereignty-and-portability)

---

## The vault

The vault is the folder Alexandria lives in on your machine — `~/alexandria/`. Everything inside is markdown in folders. No database, no proprietary format, no binary blob.

The vault has four kinds of contents.

**Constitution.** Who you are. Sharpened positions, things you have decided you believe, the axioms that govern your decisions. Written by you, over time, as your thinking crystallises.

**Ontology.** The map of how you think. Concepts, distinctions, frames you reach for. The working vocabulary your agents inherit when they reason on your behalf.

**Core files.** A small set of named files with specific roles — the agent instructions an LLM loads at session start, the notepad that captures live fragments, the feedback log, the file that describes how to work with you.

**System.** Bookkeeping. Canon you have inherited from upstream, overrides you have written on top, machine signal, error logs. You rarely touch these; the Engine maintains them.

The Author owns every file in the vault. Copy the folder to another machine, point a new agent at it, and you have the full system.

---

## Source and derivative

This is the central pattern. The rest of the architecture follows from it.

Every file in the vault that grows without bound exists in two forms.

**The source** is full fidelity. Append-only, never lossy. Every fragment, every old position, every superseded thought stays in the record. Ground truth.

**The derivative** is maximum signal density. Compressed for current inference, regenerated when the source changes meaningfully, disposable. The derivative is what the agent loads at session start.

The convention is visual. Source files have clean names. Derivatives are prefixed with an underscore and live with their source — for folder sources, inside the folder; for single-file sources, alongside. A folder `constitution/` contains its derivative `_constitution.md`. A source file `agent.md` sits next to its derivative `_agent.md`.

The Author writes sources. The Engine writes derivatives. The two roles never overlap.

The two forms have different objective functions. The source optimises for fidelity — never lose anything. The derivative optimises for signal-per-token — fit the most useful context into the model's window right now. As models change, the optimal compression changes. The derivative regenerates. The source does not.

---

## Author and Engine

**The Author** is you. You write source files. You sharpen positions. You add fragments to the notepad. You decide what your constitution says. The Author is the only entity that writes ground truth.

**The Engine** is the agent that maintains the vault. It regenerates derivatives when sources change. It surfaces upstream canon updates for your judgment. It writes to system files. The Engine never edits a source file.

The two roles connect through the canon-overrides flow.

Alexandria ships an upstream canon — methodology files representing the current best understanding of how to develop human cognition. The canon is shared across all Authors and improves over time as the project learns.

When upstream canon changes, the Engine notices on your next session. Rather than silently overwriting anything, it drops a diff into a pending-review file in your vault. You read it. If something does not fit your practice, you write an entry in your overrides file. Overrides win. Upstream is the default; your overrides are authoritative.

You inherit improvements automatically without losing the parts of your practice that are unique to you.

---

## How agents see it

Alexandria does not run an AI. It rides whichever AI you already use. The vault loads into your agent at session start; from that point on the agent thinks with your context attached.

The mechanism is direct. Your shell startup file points the agent at the relevant derivatives. When you open a session in Claude Code, Cursor, Codex, or any other CLI agent, the derivative is included in the agent's initial context. No plugin, no MCP server, no extension — just markdown loaded by reference.

Each agent has its own convention for global instructions; the same vault works for all of them.

Two precedence rules:

**Project beats global on project matters.** A codebase's local instructions win for anything specific to that codebase. Your vault complements them.

**Global beats project on principles.** Your axioms, your communication style, your operating principles travel with you. A project does not get to redefine who you are.

---

## Sovereignty and portability

There is no Alexandria database for your private cognitive data. There is literally nowhere on the system for your thinking to exist except on your machine. The server holds nothing private — only what you explicitly publish.

The format is plain markdown. No proprietary encoding, no binary serialisation, no framework lock-in. If Alexandria disappears tomorrow, your vault is still a folder of readable text files. Open them in any editor, copy them to any machine, point any agent at them.

Switching cost is zero. Stay because the system is useful, not because leaving is expensive.

The bet: the right architecture for cognitive infrastructure is sovereign by default. The horse — the model, the agent, the platform — will change many times. The rider does not.

The code is open. Read it.
