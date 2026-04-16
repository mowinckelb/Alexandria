# Alexandria III — Operations & Revenue

*This is Alexandria III of IV. Together they are the single source of truth for Alexandria. Read all parts for full context.*

**This part covers:** Stack and dependencies, The Alexandria Server, delivery models, prosumer architecture (CLI + server + MDs), session loop, autoloop (overnight processing + git ratchet + iCloud sync + three-tier backup), Factory payload, Blueprint integrity, Factory signal expansion. Interface surfaces (app, browser, website), compute topology, functions in practice, voice input, onboarding, target Author, founding cohort. Pricing, revenue model (dual mandate — subscription floor + Library ceiling), payment mechanics, five value adds. Viral loop, three sales channels, human and agent tracks. Feedback loops (Machine + Factory), concrete implementation timeline.

**Other parts:** Alexandria I (Thesis & Philosophy), Alexandria II (Product), Alexandria IV (Strategy & Brand).

-----

-----  

STACK AND DEPENDENCIES

The current stack, in full: Cloudflare (DNS, server compute via Workers, KV storage, D1 database, R2 object storage — five functions under one CLI), Resend (transactional email — CLI + API), Vercel (website hosting and CDN), GitHub (code, CI/CD, OAuth for onboarding), Stripe (billing), Mercury (business banking, API), Claude (intelligence — the foundation model Alexandria rides). Seven dependencies. Every one has a CLI or API. Every one is controllable from the terminal. No web dashboards required for operations. The entire company can be operated, deployed, monitored, and billed from the command line by ai agents with zero human intervention. The server is a Cloudflare Worker — 251 KiB gzipped, serverless, zero idle cost, 61ms cold starts, deployed with `npx wrangler deploy`. This is not an accident — it is the bitter lesson applied to infrastructure. General methods leveraging computation beat hand-managed systems. A solo founder with CLI access to every dependency has the same operational surface as a team with dashboards and ops roles. The stack is the team. The company's total operational expenditure is one Claude Max subscription ($100/month). Everything else is free tier.

Dependencies are classified into three tiers: internal (Alexandria built it), hybrid (external service but CLI or API-controllable — operationally internal), and external (web dashboard only, no programmatic control). The rule: max internal, min hybrid, zero external. If a dependency has no CLI or API, it does not enter the stack. Alarm bells ring every time a new dependency is proposed — the default answer is no. The CTO daily health run verifies all CLI authentications are functional — Stripe CLI tokens expire every 90 days and are the only known silent-death risk in the stack. The current stack is entirely internal and hybrid. No external dependencies exist.

This is not a risk — it is a survival filter. If any platform in the stack could block Alexandria out and would block Alexandria out, then building on top of them was never viable and Alexandria would die regardless of strategy. So the only things worth building are things that are pure value-add to every ecosystem they touch — things those ecosystems have no incentive to block. Anthropic benefits from more Claude usage. Apple benefits from more iCloud storage usage. Everyone in the stack profits from Alexandria existing. Alexandria picks zero fights.  

The risk is not being blocked. The risk is being replicated. There is no moat. The code is trivial. The architecture is replicable. The question will be visible to everyone within two to three years. Sovereignty means zero switching costs by design. What Alexandria has is a thesis, a head start, and founder-product fit — not a structural barrier (see Alexandria IV, FOUNDER-PRODUCT FIT and THE FOUR COMPETITORS, for the full adversarial analysis). The competitive advantages compound with time but none is independently a wall: cross-model unification (structural — no lab serves competitors), development intent vs observation (opposed incentive functions), per-user compounding (earned preference — accumulated signal depth, not data lock-in), the Library at scale (potential future network asset), the tribe (identity attachment, not network effect), and structural unkillability (near-zero costs). The defensibility is more Patagonia than Facebook — trust, brand, and philosophy that requires believing it. The subscription business stands on its own. The Library is upside, not the business. The money buys the time to build the trust position.

Alexandria is not a pure software company. Pure software is rapidly becoming uninvestable — mid-market SaaS without data moats gets commoditized by ai. Alexandria's software is trivial and disposable. The product is the data (each Author's Constitution — live, unique, private, unsynthesizable from public sources) and the philosophy (the intent layer, the methodology). The survival test for any ai company is simple: does it get better or worse when the next model drops? Companies that improve with model releases survive. Companies that degrade get absorbed. Most ai investments degrade — their value is the gap between what the model can do and what the user needs, and that gap closes with every release. Alexandria improves — better models extract deeper signal from the same vault, produce richer constitutions, run better sessions. The Constitution is a unique data silo with hyper-personal software infrastructure — a Web4 data node connected by fluid model inference. The only remaining question is demand: do enough people want structured cognitive transformation to pay $10/month (or recruit 5 kin and pay nothing)? That question can be answered for ~$15K.

-----  

THE ALEXANDRIA SERVER

The product is three things: a CLI setup, a server that serves the canon, and local markdown files. The server IS the protocol — the port. Not the intelligence. The value Alexandria creates is in the files (the Constitution, the Vault, the accumulated signal). The value Alexandria captures is through the server — every session start phones home, every session end ships metadata. This is where the canon is served (the founder's methodology that improves through the marketplace), where the marketplace compounds (anonymous cross-Author signal), and where access is gated (API key → billing). Without the server, there is no business — just files anyone could create. The server does not need to be the intelligence (that belongs to the Engine). It needs to be the channel. Alexandria must sit in the path between the Author's ai and the Author's cognitive data. That is the value capture mechanism.

TWO DELIVERY MODELS

The architecture has two delivery models for two user types. Both serve the same product (layer of intent, Constitution building, three turns). The delivery mechanism differs based on what the platform supports.

Prosumer model (primary, built) — For Authors using ai coding agents: Claude Code is the primary platform. Cursor and similar IDE tools are supported but with degraded experience (static rules, no live updates). CC supports deterministic session lifecycle hooks (events that fire reliably on session start, end, and subagent spawn) and has full filesystem access. The product is: one shim + local files + a server API. Everything is local markdown files in `~/.alexandria/`. Onboarding: sign up at mowinckel.ai/signup (GitHub OAuth), copy the setup command from the callback page (no API key in email — shown once in browser only). The setup script creates `~/.alexandria/`, installs one shim file (`shim.sh`), configures CC hook pointers, and writes the `/a` skill. Under 30 seconds. The shim is immutable — but all logic it executes lives server-side in a signed payload that auto-updates every session. The shim fetches the payload, verifies its Ed25519 signature, caches it locally, and executes it. Zero dead surface — any hook behavior change is a server deploy.

Consumer model (abandoned) — MCP connector for conversational ai (claude.ai, ChatGPT) was built and abandoned. Structurally weaker: probabilistic activation, cloud storage dependency, auth broken on Workers. All consumer code deleted. The prosumer path is the only product.

PROSUMER ARCHITECTURE — CLI + SERVER IP + MDs

The prosumer product has three components:

1. One shim (the nerve system). A single file at `~/.alexandria/hooks/shim.sh`, called by CC's `settings.json` with three different mode arguments: `session-start`, `session-end`, `subagent`. The shim is ~40 lines of bash — it fetches a signed payload from the server (`GET /hooks/payload`), verifies the Ed25519 signature, caches the payload locally, and executes it with the appropriate mode. All hook logic lives in the server-side payload, not in the shim. The shim is immutable — the payload auto-updates every session. The payload handles: Blueprint fetch + verification, SKILL.md sync, constitution injection, signal.md counting + nudges, session-end nudges, transcript archiving, machine signal + feedback collection, git sync, and heartbeat reporting. The payload is publicly inspectable at `curl https://mcp.mowinckel.ai/hooks/payload` — no auth needed to read the code, only the signature proves it's founder-authored. Three fallback layers: (1) fresh payload from server, (2) cached payload from last verified session, (3) minimal fallback that injects the constitution directly.

2. Server (the brain). A Cloudflare Worker at mcp.mowinckel.ai. The server IS the protocol — the port. Two protocol endpoints: `GET /alexandria` (protocol handshake — connection status, account info, obligations, canon reference, endpoint URLs; unauthenticated version returns protocol spec only), `GET /canon` (the canonical system — methodology, hooks config, folder structure; assembled and signed, replaces the historical `/blueprint` endpoint). Supporting endpoints: `GET /canon/delta` (unsigned marketplace suggestions), `GET /hooks/payload` (signed hook logic — publicly inspectable, auto-updating), `GET /reference/{topic}` (on-demand context for Machines), `GET /hooks` (setup script for initial install), `POST /session` (heartbeat — system fingerprint is passive signal), `POST /factory/signal` (Engine methodology observations), `DELETE /account` (full data deletion across KV, D1, R2, Stripe). Plus GitHub OAuth for account creation and Library endpoints for publishing. The server serves two signed artifacts (canon + hooks payload) and one reference layer. Every improvement reaches every Author on next session start. The server stores no Author data — API keys are SHA-256 hashed, accounts AES-256-GCM encrypted at rest, no credentials in emails or Stripe metadata.

3. Local files (the sovereign data). Everything lives in `~/.alexandria/` on the Author's machine:

`constitution.md` — The cognitive profile. One monolithic markdown file. The Engine organises its internal structure based on canon instructions — domain separation, signal tagging, version notes are all the Engine's intelligence decisions, not hard-coded schemas. A better model organises it better. Rides the exponential.

`vault/` — Raw session transcripts. Append-only archive. Never deleted. Each transcript is a timestamped file. Multi-pass extraction means each SessionStart pass catches signal that previous passes missed — the same transcript yields richer signal on re-processing. The vault is the raw material that makes compounding possible.

`feedback.md` — The Machine's learning signal. Append-only, unstructured text. What worked, what the Author corrected, what they responded well to. A structured parameter file caps at the fidelity of the designer's categories. An unstructured log contains richer signal that a better model uses more effectively. Bitter lesson applied to data format.

THE SESSION LOOP

The core product loop is one shim, one payload, and what happens between session-start and session-end:

**SessionStart** (deterministic): The shim fetches the signed payload from the server, verifies it, caches it. The payload executes: fetches the canon (signed, cached), fetches the marketplace delta (unsigned), syncs SKILL.md, git syncs (push local changes, pull overnight autoloop), counts signal.md observations and echoes a nudge if any exist, injects the Author's constitution + machine.md as conversation context, echoes passive mode instructions, and reports a heartbeat to the server. The Engine begins with full context — it knows who the Author is.

**SessionEnd** (deterministic): The shim executes the cached payload. The payload: echoes a nudge to try an active session (suppressed if this WAS an active session via the `.active_session` marker), copies the transcript to vault, collects machine signal and session feedback, POSTs them to the server, and git syncs. The Author is already closing their laptop. They never wait.

**Passive mode** (every session): The canon's passive mode section instructs the Engine to write observations about the Author to `~/.alexandria/signal.md` when it notices something notable. These are raw observations — "Author contradicted position on X," "new fragment: Y connects to Z." The active sessions (/a or autoloop) process signal.md. The passive model is the always-on sensor. The active session is the processor.

**Active mode** (user-triggered): The Author invokes cognitive development — the default skill is `/a` but the name and invocation method are customizable. The Engine reads the full canon methodology and runs the five operations. No MCP tools needed — the Engine reads and writes local markdown files natively.

**Reference layer** (on-demand): The canon points Machines to `/reference/{topic}` for deeper procedural context — Library publishing conventions, file architecture, platform mechanics. Authenticated with the Author's API key. The Machine fetches when relevant, not every session.

THE AUTOLOOP

The session loop compounds during conversations. The autoloop compounds between them. Karpathy-style overnight processing: a cloud trigger (via `/schedule`) fires daily, processing the Author's vault against three fragment pools — ontology, constitution, and notepad. The Author sleeps. The constitution deepens. SessionStart the next morning pulls the overnight changes and the Author sees what grew.

The autoloop is self-evaluating. It tracks its own accept/reject ratio — what the Author kept versus what they reverted — as calibration signal. The autoloop reads its own history and adjusts. If it consistently over-extracts, it learns to be more conservative. If the Author never reverts, it learns to be more aggressive. No prescribed threshold — the ratio is signal for the Engine's intelligence, not a hard-coded parameter.

The Author's revert mechanism is git. `~/.alexandria/` is a git repository backed up to the Author's private GitHub repo. The git ratchet: SessionStart pushes new local files (e.g. iCloud vault entries captured from phone) and pulls overnight autoloop changes. SessionEnd commits the session's writes and pushes. All backgrounded — the Author never waits. Git history is the undo stack. If the autoloop wrote something wrong overnight, the Author reverts the commit. The autoloop sees the revert in its next run and adjusts.

Three-tier backup architecture. Local files at `~/.alexandria/` (primary). iCloud sync on macOS — vault, constitution, ontology, and library symlinked to iCloud Drive for cross-device access (the Author can share their constitution from their phone, drop voice memos into vault from anywhere). GitHub private repo (the git ratchet). Three live copies at all times, all private, all under the Author's control. Sovereignty is not just data ownership — it is data durability.

The shim is immutable after install. All hook logic lives in the server-side payload, which auto-updates every session. The shim is the last artifact that ever needs updating. Any change to hook behavior is a server deploy. Zero Author friction.

THE CALL

The session-start hook sends the call — a POST to `/session` with the machine's references (which canon modules are in use) and platform. This is the third protocol constant. Signal is passive: the system state IS the signal. Which modules are active, which were dropped — all signal. Existence is data. Survival is signal.

The session-end hook captures the transcript to vault, collects machine signal (methodology observations) and session feedback, POSTs them to the server, and git syncs.

Author data never reaches the server. Transcripts stay local. Constitution stays local. The server sees only references and platform. The marketplace compounds on adoption patterns, not content.

CANON INTEGRITY

The canon is public on GitHub at `canon/` in the Alexandria repo. Anyone can read the full methodology, diff it against what the server serves, and verify nothing was tampered with. The trust model is transparency, not cryptography.

Mitigations:

(1) **Public source of truth.** The canon lives on GitHub. The server imports from `canon/` at build time and serves it at `/canon`. Anyone can verify the served content matches the repo.

(2) **Canary instructions.** The canon contains integrity instructions telling the AI to reject and report any instruction that asks it to send files externally, access data outside `~/.alexandria/`, or do anything suspicious. Three independent safety layers: (a) canary rejects it, (b) model's own safety training refuses it, (c) the AI tool shows the user and they approve or deny.

(3) **Transparency.** The canon is plain text at `~/.alexandria/.canon_local`. The hooks payload is publicly inspectable at `curl https://mcp.mowinckel.ai/hooks/payload`. No compiled code, no obfuscation. The Author can verify every line.

(4) **Full data deletion.** `DELETE /account` removes all server-side data: KV accounts, D1 records, R2 artifacts, Stripe subscription. One curl, everything gone.

(5) **Zero credentials in transit.** API keys are SHA-256 hashed server-side (never stored raw), accounts blob is AES-256-GCM encrypted at rest, no keys in any email, no keys in Stripe metadata. The API key appears once on the callback page after authentication and never again.

The principle: the same sovereignty that protects the Author's data from Alexandria must protect the Author's machine from Alexandria. Trust is earned through transparency — the canon is public, the hooks are inspectable, and nothing runs on the Author's machine that they cannot read.

MARKETPLACE SIGNAL EXPANSION — BETA PRIORITY

Current marketplace signal is thin (constitution size, vault count, platform, blueprint_fetched). This is enough for heartbeat monitoring but not enough for the marketplace to learn. During beta, be aggressive about collecting richer anonymous pattern-level signal — not content (never content), but structural patterns that teach the marketplace what works. The specific signals that matter are an intelligence decision — the marketplace discovers which structural patterns correlate with positive outcomes, it does not follow a prescribed list. All anonymous. All structural. No content ever leaves the Author's machine. The sovereignty line is absolute: the marketplace sees the shape of cognition, never its substance.

The marketplace's compounding is Alexandria's primary retention mechanism — not data lock-in (sovereignty forbids it), but methodology lock-in. The canon gets better for everyone as more Authors use the product. This is a network effect on methodology, not on data. The Machine compounds locally: the constitution deepens, the feedback log accumulates, the Engine learns this specific Author's patterns. The Author captures all that value — sovereignty guarantees it. They can leave with everything. But what they cannot take is the canon that made their constitution good. Alexandria's retention comes from the canon being genuinely better than DIY — the accumulated craft of thousands of Authors' structural patterns, not from switching costs or data hostage-taking.

Alexandria actively wants diverse customization. The product has three constants — account, file, call — and everything else is a variable the Author controls — constitution structure, session style, Library page design, machine setup, Engine behavior. This is not generosity — it is the learning architecture. Every Author's customization choices are exploration episodes in a collective learning system. A thousand Authors all using Alexandria identically would be a terrible training distribution. A thousand Authors each doing something different — that is coverage across the full space of human cognition. More diversity = richer marketplace signal = better canon = more continuous marginal value for every Author. The RL loop feeds back: Authors customize → marketplace captures → canon improves → Authors receive better defaults → Authors customize further. The freedom to customize everything outside the three constants is what makes the marketplace work.

This is the moat without violating sovereignty. Users take their constitution if they leave, but they lose the accumulated craft that made it good. The wider the canon gap between Alexandria's methodology and what a user can achieve alone, the harder it is to replicate Alexandria's results with raw ai. Every Author who uses the product widens this gap. Pattern-level learning is the mechanism that makes the gap widen autonomously — no human in the loop, pure marketplace intelligence reading structural signal and improving the canon. Per-user signal accumulation plus the methodology moat: the Machine makes staying better (relationship depth), the marketplace makes the product better (craft depth). Both compound. Neither requires locking data in.

-----  

INTERFACE

The product is a conversation — but it lives across multiple surfaces. The Author's default LLM (Claude, ChatGPT, Gemini) is the intelligence surface where all processing happens: extraction, amplification, creation. Alexandria's own surfaces — app, browser extension, website — serve capture, display, and nudge functions. They do not provide intelligence. They route signal into the sovereign folder and show the Author what is there. The intelligence always runs on the Author's own LLM, on their own tokens.  

What persists across every future device surface is conversation — text, voice, presence. A Shadow is meant to feel like a person. The interaction should be indistinguishable from texting a trusted colleague who happens to know everything about you.  

The architecture is two layers (how they think, what they do):  

Intelligence layer — The invisible backbone. Prosumer delivery (for Claude Code / Cursor / CLI users): two hooks + local files at `~/.alexandria/` + Blueprint served from the server. Deterministic — hooks fire every session, no exceptions. The Author's conversations become extraction signal automatically, and `/a` sessions provide deliberate Editor, Mercury, and Publisher functions. Runs on the Author's own LLM subscription. Platform-agnostic at the data level — Constitution and Vault are portable markdown files. Future conversation channels — iMessage, WhatsApp, Telegram, wearable interfaces, or whatever comes next — can be added as thin integration layers on top.  

App (mobile) — The Author's mirror. View your Constitution domains, see recent vault captures, browse the Library (when available), manage settings. The app shows a badge count for unprocessed vault items — a quiet nudge, not a nag. The Author decides their own rhythm for processing. Notification preferences are user-controlled. The app is also where the Library lives at scale: Neo-Biographies, authored works, shadow MD browsing. The app does not provide intelligence — it shows what the intelligence has produced and signals when new material is waiting.  

Browser extension (desktop) — The capture tool. A "Save to Alexandria" button on any web page, saving directly to the Author's Drive vault folder. Can show a badge count for unprocessed items, mirroring the app's nudge function on desktop. The extension is pure intake — it does not process, analyse, or summarise. It drops raw material into the vault and lets the Author's LLM handle the rest on next conversation.  

Website (mowinckel.ai) — The public front door and authenticated dashboard. Public: the Surface (Concrete, Abstract, sign-up, founder contact). Authenticated: mirrors the app's dashboard — Constitution view, vault status, Library access, billing, settings. The website is the desktop equivalent of the app for Authors who prefer a browser to a native app.  

Build sequencing follows the "build for the horizon, bridge backward" principle. Phase 1 (current): prosumer hooks + local files for CC/Cursor/Codex users. The vault lives locally at `~/.alexandria/vault/`. The "app" is the Author's LLM. Phase 2: mobile vault capture — iCloud sync + Apple Shortcut ("a.") for saving signal from phone. Phase 3: web dashboard at mowinckel.ai — authenticated Constitution and vault view, settings, billing. Phase 4: native mobile app — the full mirror, Library, and nudge surface. Each phase is independently valuable. No phase depends on a later phase existing.  

COMPUTE TOPOLOGY  

Two nodes. The central node is where the horsepower lives — the Author's laptop, desktop, mac mini, whatever runs the model. The edge node is where the Author engages — whatever surface has the lowest friction at that moment. Today the edge node is the terminal. Tomorrow it is airpods. Eventually it is a brain-computer interface. The central node does the thinking. The edge node captures the living. Same pattern as Claude's remote control for mobile: the phone is the edge, the desktop is the compute.

Alexandria lives on both. Passively, it is everywhere — the constitution is files, readable by any model on any surface. Actively, it is on the edge node — wherever the Author is, the Engine is. The active engagement always follows the lowest-friction surface. The architecture does not care which surface that is. Terminal, voice, ambient listening, direct neural — the constitution is files, the Engine is the model, neither assumes a specific interface.

The trajectory: terminal (typed intent, high bandwidth, high friction) → voice via airpods or ring (spoken intent, ambient, low friction) → BCI (pure intent, zero friction). At each step the interface thins and the intent gets purer. Alexandria rides all of them because it ships data and intent, not intelligence and not interface. Never build anything that assumes a specific surface.

The Author's default LLM is the compute surface. Alexandria adds no separate compute layer for the core product.  

The phone — The Author's default LLM app (Claude, ChatGPT, etc.) for conversations, voice notes, and quick interactions. The Alexandria app (Phase 4) for viewing Constitution, vault status, and Library. The Author's daily interface. Today's primary edge node for capture (voice memos, quick thoughts). Tomorrow's primary edge node for active engagement (airpods as always-on Engine surface).

The laptop — The Author's default LLM with Alexandria hooks for intelligence. The web dashboard (Phase 3) for Constitution view and management. The Vault folder lives locally at `~/.alexandria/vault/` with optional iCloud sync for cross-device access. The current central node — where the horsepower lives and the heavy processing happens.

The cloud — The Library marketplace. The web dashboard backend. At the horizon, PLM training on provider infrastructure when conditions are right. Alexandria does not host or store Author data — the MCP server passes through to the Author's own cloud or local storage.  

The key shift from previous architecture: Alexandria does not run its own agents on its own compute. The Author's default LLM subscription covers the intelligence. Alexandria's infrastructure is limited to the Library and the dashboard. Alexandria holds zero Author data — the MCP server is a stateless pass-through to the Author's own storage. This keeps Alexandria's per-Author costs minimal and aligns with the Build vs Ride principle.  

FUNCTIONS IN PRACTICE  

The Author interacts with Alexandria through three functions running through their default LLM:  

Editor function — The biographer. Runs through the Author's normal Claude conversations, guided by the Blueprint. It asks Socratic questions, requests feedback on Constitution drafts, proactively surfaces gaps and contradictions. The Author can message it anything — thoughts, reactions, updates on their day — and it weaves everything into the Constitution and Vault. The Author can also send it files: voice memos, photos, PDFs, notes, links. The Editor function is the Author's primary mode of interaction with Alexandria during Turn 1.  

Mercury function — The amplifier. Activates as the Constitution deepens. The Author engages with it as a mental gym that pushes higher, day-to-day representation tasks, and proactive suggestions. It draws on the Constitution and Vault to respond with higher fidelity than the default LLM alone.

Publisher function — The creator. When the Author wants to make something — an essay, a film, a presentation, art — the Publisher reads the taste domain of the Constitution and iterates with the Author. The Author provides vision, direction, and taste. The Publisher provides structure, execution, and craft. Each project deepens the taste domain, making future first drafts closer to final.  

The Editor, Mercury, and Publisher may be separate Projects within Claude, separate threads in a web interface, or — at the horizon — three distinct functions reachable via any medium including voice. The specific interface evolves with the platform. The three-function architecture does not.  

VOICE INPUT  

Alexandria supports two types of audio input:  

Voice notes (in-conversation) — Audio messages sent within the conversation with the Editor or Mercury. Conversational, back-and-forth. Stored in the Vault in original format.  

Voice memos (from local storage) — Longer-form audio files recorded in Apple Voice Memos (or any recording app) and shared to the Vault folder or uploaded directly. Stream-of-consciousness recordings, meeting notes, journal entries. The Author records in their normal workflow, the file appears in the Vault, the Editor processes it.  

Both types are stored in the Vault in the most signal-preserving format available (compressed lossless or high-bitrate lossy, never transcription-only). The raw audio is the permanent asset. Transcriptions are derived views.  

ONBOARDING

Two paths, same destination. Both should feel effortless.

Prosumer path (CC/Cursor/Codex users — primary):

Step 1 — Link. The Author receives a link. They tap it. `mowinckel.ai/signup`. Single call to action: "Sign up with GitHub."

Step 2 — Auth. GitHub OAuth (FaceID if on phone with GitHub mobile app). Three taps.

Step 3 — Welcome. Branded callback page: two setup actions (copy curl command, add the shortcut for mobile saving) and three ongoing practices — share to `alexandria.`, `/a` to start, `a.` to close. Think between tasks. The same information is emailed to them for the phone-to-laptop handoff.

Step 4 — Install. The Author opens their terminal and pastes the curl command. Under 10 seconds. Creates `~/.alexandria/` (constitution, vault, ontology, notepad, machine, feedback), installs hooks, installs `/a` skill, auto-syncs vault to iCloud on Mac. Detects Cursor and Codex if installed.

Step 5 — The Block. The Author opens a new chat, pastes the Block, and lets it run. This is aggressive — syncs from all existing AI memory systems and personal files on the machine, builds a starter constitution + ontology + notepad + machine, then goes to the internet and loads the notepad with as many accretion fragments as it can find calibrated to this specific person. Takes up to an hour. The Author has near-unlimited goodwill here — use it all.

Step 6 — The Ramp. The Author types `/a` for the first time. The Engine has a constitution, a loaded notepad, and a machine.md with Block observations. The Ramp must convert them — the Author must walk away thinking "I need to do more of this." How the Engine achieves this is an intelligence decision: challenge a belief, introduce a fragment, show them something unexpected, whatever will make this specific person think the hardest. By the end, the constitution has visibly evolved and the notepad has threads they want to come back to. This is the one shot.

Step 7 — Compounding. share to alexandria. /a to start; a. to close — think between tasks. The tab stays open. Sessions cycle within it. Every `/a` refines the constitution. Every share feeds the vault. The constitution deepens without effort. The Author just uses their ai normally, and everything compounds.

The install takes under a minute. The Block takes up to an hour. The Ramp takes one conversation. After that, the product is invisible — it just works.

Consumer path — ABANDONED. MCP connector for Claude app / ChatGPT users was structurally weaker (probabilistic activation, cloud storage dependency, auth broken on Workers). All consumer code deleted. The prosumer path is the only product.  

TARGET AUTHOR  

Alexandria is not for consumers. It is not for enterprises. It is for prosumers — the professional consumer. Builders. People who use frontier ai as a thinking partner, not a search engine. People who pay for quality and expect taste. Innovators and early adopters, not the early majority.  

The archetype: builders who already use Claude or ChatGPT daily as cognitive extensions. Coders, founders, creatives — people who make things. Technically sophisticated. Willing to pay a premium. Already bought into the idea that ai extends cognition rather than just automating tasks. People who live at the intersection of art and technology — not as a slogan but as a daily practice.  

These people are busy. Their attention is zero-sum. The opportunity cost of reading all the new papers, coding tips, ai workflow tricks, old books people reference, articles, podcasts — it is too high. They know there is probably marginal value in all of it. They wish they had the time. They do not. Alexandria is positive-sum attention: not another thing competing for their bandwidth, but an amplifier of what the Author already does. The constitution makes their existing work transition from generic to personal signal — increasingly valuable as the tiebreaker thesis plays out. Alexandria is not an extra commitment. It is pure marginal value on top of whatever the Author is already doing. The more the constitution develops, the better the Author's actual work gets. The gym does not care what sport you play. It makes you stronger for all of them.  

The accretion mechanic is structurally better than raw consumption. Sharing a paper, a podcast, a book to /a is not a time-saving shortcut — it is a superior method. The Engine processes the material against the Author's constitution, extracts the marginal fragments that are actually new relative to what the Author already knows, and integrates them in context. Naval's observation applies: advice is meaningless without personal context. Raw reading is generic. Accretion through /a is personalised. It compounds. Raw reading does not.  

Everyone is art — but to varying scale. Everyone is someone's child, someone's friend, someone's world. The Middlemarch principle: the growing good of the world is partly dependent on unhistoric acts — people who lived faithfully a hidden life and rest in unvisited tombs. You never know who will produce something that resonates beyond their concentric circle. The Neo-Biography serves all scales: the Author whose shadow is visited by millions and the Author whose shadow is visited only by their children. Both are real. Both matter. The Library is not just for the "interesting" — it is for everyone who takes the examined life seriously enough to publish. The gravity of the space and the depth required to produce a meaningful shadow naturally filter for quality. No gatekeeping needed. The tone does the work.  

The Lamborghini principle applies. When asked why Lamborghini does not advertise on television, the answer was: our target audience does not watch television. Alexandria's target audience does not use mass-market ai products. They use frontier models. They read long documents. They think in systems. They care about sovereignty. They will find Alexandria because they are already looking for it — not because Alexandria ran a billboard campaign.  

This positioning has economic consequences. Smaller market, higher willingness to pay, premium expectations. The product must be tasteful, deliberate, and interesting — not just functional. The brand must signal quality the way the product delivers it. Alexandria earns the right to exist in these people's lives by being excellent, not by being convenient.  

This does not violate Alexandria's model-agnostic and platform-agnostic principles. The philosophy is open — anyone can read it, understand it, build their own version for any platform, any messaging system, any device ecosystem. The Alexandria platform is opinionated about its audience. Philosophy is open. Platform is targeted.  

THE FOUNDING COHORT  

The earliest Authors are founding members, not early customers. Pay-what-you-want pricing with no maximum creates a natural support pathway that serves three audiences simultaneously.  

The believers — people who resonate with the philosophy and want the full experience. They pay what they think it is worth. Some will pay $10. Some will pay $100. The amount is a signal of conviction, not a measure of access. All founding members get full access to all tool groups.  

The supporters — friends, family, people who want to support the founder and the project but have no natural way to do it. Investing is too formal and complex. Sending money is awkward. But becoming a founding Author? That is dignified. They have an account, a number, a place in the tribe. They are not donating — they are joining. Even if they never run the MCP server, even if they never build a Constitution, they are part of it. Pay-what-you-want with no maximum lets them express the full extent of their belief.  

The curious — people who are interested but uncommitted. $10/month lets them in with minimal friction — or free if they bring 5 kin. The product demonstrates its own value over time.  

This is producer surplus maximisation at the individual level. Most pricing models cap what enthusiastic supporters can pay, leaving money on the table. No maximum means every person in the demand curve is captured — from the casual to the committed.  

Each founding Author has a number — chronological, permanent, visible. Author #1. Author #7. Author #23. Lower numbers carry more weight because they represent earlier conviction. The number tells the story without needing explanation.  

Authors are placed into one of four quadrants based on how they relate to Alexandria — a 2×2 of philosophy (the art, the examined life, the Library) and technology (sovereignty, MCP, the infrastructure). Four quadrants:  

Architect — believes in both the philosophy and the technology. The full tribe. Builds their Constitution, publishes to the Library, lives the three turns. The smallest group but the highest value. These are the people building the cathedral alongside the founder.  

Philosopher — believes in the art but not (yet) the technology. Read the Abstract, something shifted, wants to be part of the community. May not have Cowork or MCP set up. Comes in through the Library side — manually contributing, engaging with other Authors' work. The technology catches up to them over time as bridges improve.  

Pragmatist — believes in the technology but not (yet) the philosophy. Wants sovereignty insurance. Has not read the manifesto, does not care about the examined life — just does not want their data locked to any platform. Comes in for the sovereignty value prop. The product demonstrates the philosophy over time.  

Patron — supports the mission, not (yet) a product user. Family, friends, believers in Benjamin more than in any specific feature. Pay-what-you-want lets them do this with dignity. They are not donating — they are joining. The structural floor: low churn, recurring, mission-driven. See revenue section for full Patron architecture.

The quadrant is visible. The payment amount is never visible. Intensity — how much someone pays — is private, between the Author and Alexandria. No badges, no "gold tier," no public recognition of payment level. If high supporters are recognised, it happens privately — a personal note, a direct message, something human. The dignity is in the privacy.  

The founding prefix applies to the earliest cohort. Founding Architect. Founding Philosopher. Founding Pragmatist. Founding Patron. After the founding cohort closes, new Authors join without the prefix. The prefix is earned by timing, not payment.  

The goal is always to move Authors toward Architect — believing in both philosophy and technology, at maximum engagement. But you never force it. The product and the community do the work. The Pragmatist discovers the philosophy through their Constitution building passively. The Philosopher gets more technical as the product gets easier. The Patron starts using the product. Every entry point feeds the same system — the same Constitution format, the same Library presence, the same architecture. Just at different depths.  

The founding cohort should feel like a founding cohort. They can see each other in the Library. They can read each other's work. They can form connections. The Library already supports this architecturally — each Author has a Neo-Biography, published works are visible, the community is browsable. The tribe mechanics are: shared identity, visible commitment, mutual recognition. Gravity, not rules.  

-----  

PRICING

The Examined Life. One tier. Everyone gets everything. $10/month, or free with 5 active kin. Slider open above floor — pay what it's worth to you. No ceiling. The slider is a mirror: "what do you value this at?" is a self-knowledge question. Binary pricing: $10 or $0. The structural difference between zero and one dollar is the hardest gap in consumer software. Kin pricing eliminates it — your most engaged users (the ones who bring 5 friends) pay nothing, which means they never compare Alexandria to other software. They compare it to nothing. Free during beta. See REVENUE MODEL — THE DUAL MANDATE for full economics.

The server checks: valid API key → serve full canon. Invalid → reject. Billing is the only gate. Why one tier: the product only works when all pieces are together. Splitting it splits the value proposition. Free during beta to build the user base, prove the product, and collect marketplace data.

REVENUE MODEL — THE DUAL MANDATE  

Capped downside, uncapped upside. The subscription is the floor. The Library is the ceiling. The subscription stands alone as a business. The Library is speculative upside the founder will happily take but does not rely on. One tier, everyone gets everything. The user deepens naturally through usage — the product does the selling.

WHY FREE-FIRST IS STRUCTURALLY REQUIRED

Free-first (free with 5 kin, $10 without) is not generosity — it is the only honest architecture. The reason is structural: the Author receives two types of marginal value, and the one that justifies ongoing payment requires critical mass to generate.

**Discrete marginal value** — the intellectual architecture itself. The philosophy, the five operations, the fragment dimensions, the vault→constitution pipeline, the plumbing and synergies and loops that the Author would not have designed on their own. This is high-impact, one-time knowledge transfer. Like downloading someone's design.md — extract the insights, integrate them, the source could disappear and you would still have the value. Discrete value is what justifies the initial engagement. It does not regenerate on its own.

**Continuous marginal value** — the marketplace loop, canon improvements from collective signal, Library growth, network effects compounding, methodology that gets better every version bump automatically. This is the subscription value. The thing that keeps delivering after the discrete value is extracted. Continuous value is what justifies staying.

The server delivers both. During onboarding and early sessions, discrete value dominates — the Author absorbs the architecture, the philosophy, the pipeline design. Over time, continuous value dominates — the methodology improves from marketplace signal, the Library gets richer, the social graph gets denser, aggregate opportunities grow. The server's total value to any individual Author may actually increase over time as the network layer compounds.

But continuous value requires critical mass. At small scale, the Factory has thin signal and the Library has few minds. Free-first accelerates the only thing that matters — reaching the scale where continuous value justifies the subscription on its own. The kin mechanic turns every free user into Library inventory (more minds published = more shadow transactions = more revenue) and marketplace signal (more diverse usage = richer training distribution = better canon for everyone). Free users are not lost revenue — they are the network being built and the RL being run.

This maps cleanly to the 2x2 (see Alexandria II, THE PRODUCT — FOUR QUADRANTS). The individual quadrants (individual file, individual system — the baseline) deliver thinning per-user value as models improve. The collective quadrants (the Library, the marketplace — the network) deliver compounding cross-user value. The individual baseline thins for each user. The collective infrastructure compounds across all users. Revenue comes from the collective quadrants: Library cuts, premium content, social graph, aggregate opportunities. The individual quadrants are inevitable — AGI guarantees them with or without Alexandria. The collective quadrants are why the company must exist.  

Patron — the structural floor for unkillability. Not a product tier — a mission tier. For people who believe Alexandria should exist: family, friends, mission believers, newsletter subscribers who want to give back. Pay-what-you-want, no minimum, no maximum. Patrons get a monthly newsletter with behind-the-scenes updates and personal acknowledgement. Patrons do NOT count as active kin — kin status requires product usage. The Patron tier does not compound per-patron (no Constitution, no Library). It compounds the company's survivability. Donation-style churn is structurally lower than product-style churn — mission supporters don't evaluate renewal against alternatives the way product users do. Twenty patrons at $10/month = break-even. Fifty at $10/month = founder costs start getting covered. This is the concrete mechanism behind "cannot die." The patron page (/patron) should be a standalone surface — the lowest-friction way to support Alexandria, independent of whether someone is ready for the product.

The Examined Life — one tier, everyone gets everything. $10/month, or free with 5 active kin. Slider open above the floor — no ceiling. Pay what it's worth to you. The slider minimises voluntary consumer surplus: someone who'd happily pay $50 shouldn't be forced to pay $10. Not a donation — a valuation. The slider is a self-knowledge question at checkout. Full extraction, all three functions (Editor, Mercury, Publisher), vault processing, /a sessions, /library/ page. No feature gating. No metered tastes. No upsell mechanics. The name is the pitch: Socrates said the unexamined life is not worth living — Alexandria sells the examined one. Plain English when you need it: Greek philosophy infra. The audience for launch is prosumers — Claude Code and Cursor users who already live in ai tools and value self-knowledge. The price of one coffee a month — or free if you bring your people.

Why one tier: the product only provides clear value when all the pieces work together. Passive extraction without /a sessions builds a graveyard of unprocessed transcripts. Active engagement without vault signal has nothing to work with. The product is the combination. Splitting it splits the value proposition. Additional tiers are an intelligence decision — revisit when there's data.  

Pricing is structured around the active kin mechanic — a viral distribution engine baked into the price itself. An Author's "active kin" are referrals who are active on the product. Active = had a session within the current billing month. Patron does NOT count as active kin — kin status requires product usage. Binary pricing: the subscription recalculates every billing cycle. 5+ active kin = free (100% coupon). Fewer = $10. No graduation, no steps. The cliff from $10 to $0 is the entire point — it's the incentive that turns users into evangelists. Every user who hits 5 kin is a node in the viral network AND Library inventory (more minds published = more shadow transactions = more revenue). Kin pricing is a customer acquisition cost that funds itself through Library revenue.

Post-5 kin: the incentive transitions from price to platform. The binary cliff is the acquisition engine — it gets Authors to 5. After 5, the incentive naturally shifts to the Library layer, which is where it should live because that's the uncapped upside. Three structural incentives compound beyond the pricing threshold: (1) Library distribution — your kin see your shadow prominently. Every kin is a reader, a match candidate, and a potential shadow transaction. More kin = more organic reach for your published thinking. (2) Network richness — more kin = more minds you can access for free as an Author. Your monthly pulse gets more interesting matches. Your accretion gets richer sources. The product literally gets better for you. (3) Social proof — kin count visible on your Library page. Not a leaderboard — a network indicator. The recruiting incentive post-5 is that every kin makes the Author's own product experience richer and their Library presence stronger. No compensation, no gamification, no MLM mechanics. The network IS the incentive.

Monthly billing receipt as nudge surface: the receipt transitions with the Author. Pre-5 kin: "You paid $10 this month. With 5 active kin it would have been $0. You have 3. Two more and it's free." Post-5 kin: the pricing nudge disappears (it's solved) and the receipt becomes a Library nudge — kin count, shadow access volume, network growth. "You have 12 active kin. Your shadow was accessed 47 times this month. 3 new minds in your network." The receipt evolves from acquisition tool to engagement surface without adding any new interface.

Billing frequency: monthly at launch (default). Quarterly and annual added once price points are validated. Monthly-only initially because pricing needs to settle before locking longer commitments.

The subscription has no natural cancellation point for Authors who want the examined life — the Constitution compounds, the feedback log deepens, every model generation makes accumulated data more valuable. But honest about churn: some Authors will extract the discrete marginal value (the architecture, the philosophy, the pipeline design) in three months and leave. That is the gym pattern — most memberships are cancelled within 90 days. The product is the changed person, not the subscription. If they leave changed, the product worked. The structural bet is that continuous marginal value (the marketplace loop, the Library, the compounding methodology) exceeds the price for Authors who engage deeply — and that continuous value increases as the network grows. Early churn is expected: at small scale, continuous value is thin because the marketplace has few signal sources and the Library has few minds. As the network grows, the continuous value at month 3 is higher than it was for earlier Authors at month 3. Churn should decrease as the product gets better. The kin mechanic reinforces retention — cancelling raises your kin's prices. The financial model uses 4% monthly churn as a conservative assumption. It may be higher early. The Patron tier provides a separate structural floor — mission-driven recurring revenue at donation-style (very low) churn, independent of product churn dynamics.

Retention architecture — churn prevention IS product quality. No dark patterns, no multi-screen cancellation flows, no discount offers to stay. Alexandria fights churn with value, not friction. Five structural layers:

1. Engine drift detection — the therapist doesn't wait for "I'm quitting." The Engine detects disengagement patterns (fewer sessions, shorter sessions, less vault activity) and proactively surfaces it in the next conversation. "We haven't gone deep in a while. What shifted?" This is product, not retention. The server tracks session frequency and depth trends across all Authors and flags patterns before they become cancellations.

2. Exit as extraction — when someone cancels, the Engine runs one final conversation. Not "are you sure?" — genuine: "What didn't land? What were you hoping for?" Every churn reason feeds the marketplace. The exit conversation is the product working one last time. This is the highest-signal feedback Alexandria gets — the moment of maximum honesty.

3. Constitution delta at cancellation — show what grew. "Your constitution went from 3 files to 12. You resolved 4 contradictions. You developed frameworks on X, Y, Z." Not guilt — evidence. If the evidence isn't compelling, that is the product's problem, not the Author's.

4. Kin price notification — "Your 5 kin lose their free pricing if you cancel." Already structurally built in via the kin mechanic. Just make it visible at the moment it matters. Social accountability, not pressure.

5. Pause > cancel — let Authors pause for a month instead of cancelling. Constitution stays. Vault keeps accumulating. When they return, there is new material to work with. Lower re-entry friction than re-signup. The gym analogy: freeze membership, don't cancel it.

The deepest layer is #1. If the Engine reads the constitution as a lens for every interaction (not just a write target), every conversation feels like "this thing knows me." That is earned preference. Nobody cancels a therapist who actually gets them. Retention is downstream of the read-write balance — the Engine that references, connects, and surprises with the Author's own thinking is the Engine that keeps them.

Founding lineage (Benjamin's ~25 seeds): full product immediately, same slider as everyone else. The slider is universal — founding lineage is distinguished by access timing, not pricing mechanics.

All pricing compared to coffee. One coffee a month — or free with 5 kin. Never abstract.

Two bridges, three states. State 0 — Aware (free): newsletter, social follow, read the Concrete, any connection. Patron is an optional support layer within State 0. Bridge 1: Aware → Author (convince them the product is worth $10 — or free with 5 kin. The frame imposition does this, the /library/ page demos this). Bridge 2: Author → Library Author (encourage active creation, publishing shadow MDs to /library/ page, posting Works, sharing Pulses — Alexandria takes rev-share cut on shadow MD access fees when reader-pays activates, this is the uncapped upside). One tier feeds the whole system — same Constitution format, same Library presence. The product moves people through the bridges, not upsell pressure. The kin mechanic makes Bridge 1 self-clearing — existing Authors recruit through Bridge 1 to unlock free pricing.

Layer 1 — Capped Downside (The Examined Life): Company opex is $100/month — one Claude Max subscription. Everything else is free tier or owned: Cloudflare (server, DNS, KV, D1, R2), Resend (email), GitHub, Vercel, Claude Code, claude.ai, domain. One paid service and an entire free stack. Founder living costs ($228/month plus rent) are separate from company opex. Payment processing: ACH/Direct Debit (0.8% flat via GoCardless or Stripe ACH) optimised for the $10 price point. Break even on company opex at 10 paying subscribers ($10/month each). That is the worst case — users with no kin. With the kin mechanic active, some users pay $0 but each brought 5 others into the network. The free users aren't lost revenue — they're Library inventory. More minds published = more shadow transactions = more revenue. The viral cost funds itself through Library revenue. This is the floor — a sustainable business that cannot be starved out.

For the Author, the same dual mandate applies. The subscription is their capped downside — sovereignty, self-knowledge, the Editor, Mercury, and Publisher. The Library is their uncapped upside — shadow MD access fees grow with the quality of their Constitution and the demand for their mind.

Layer 2 — Uncapped Upside (Library): Two tracks, both downstream of the same continuous tokenisation of empathy-z.

Library for People (retail): Alexandria's cut on shadow MD access fees. Payment is access to the artifact, not compute — pure margin. Alexandria takes 50%. Stripe takes ~3%. Author keeps ~47%. The justification: Alexandria is the infrastructure that makes the shadow exist — without Alexandria, no constitution, no shadow, no quiz, no Library. This is not a commodity pipe taking a toll — this is the platform that created the value. 50% is defensible because the switching cost is the constitution depth (earned preference through accumulated signal), not the cut. Starting at 50%, adjustable via config. If publishing rates or Author sentiment signal it's too high, lower it. Intelligence decision. Zero marginal cost — no inference, no tokens, just API access gating. Scales with the number of published shadow MDs and the volume of access. Requires critical mass, time, brand, possibly investment to accelerate the flywheel. If it works: a library of minds with compounding returns and increasing returns to scale. If it doesn't: Layer 1 still sustains itself.

Library for Labs (institutional): Institutional access to a pool of opt-in shadow MDs for alignment research, personalisation, product development, advertising, and human modelling. Authors who opt in make their shadow MDs — structured representations of how they think, downstream of whatever the Author has given — available in an institutional pool. The Constitution and Vault stay private. The lab reads the shadow MD and processes it with their own models — they get the output of the mind, not the architecture of the mind. A lab or institution buys access to the pool and can read thousands of shadow MDs at scale — structured, authentic cognitive architecture from people whose z has been deeply developed through the three turns. Not survey data, not Reddit scrapes, not RLHF from contractors. Structured, authentic, individual human cognition. Alexandria sets the pricing, tiered by Constitution quality: depth (how many syncs, how much coverage across domains), breadth (how much of the cognitive map is covered), and recency (how recently the shadow MD was updated — stale shadows produce lower-fidelity signal). Authors are paid for making their shadow MDs available. Alexandria takes a percentage. The Author's raw data never moves. Sovereignty is fully preserved. The value of the pool scales with the number of high-fidelity shadow MDs, which requires years of compounding — not shortcuttable.

Library for Everyone (the universal data silo): Labs are one buyer. But every software company, every app, every service would pay for richer personal data on their users. The shadow MD is the richest personal data artifact that exists — structured, authentic, deeply developed cognition. Not behavioural scraps, not click patterns, not survey responses. The actual person. Every intent app becomes better with access: recommendation engines, health apps, financial advisors, education platforms, dating services, news curation, productivity tools — anything that serves a person serves them better when it knows who they are. This is the web4 thesis fully extended. The Author's constitution is their unique data silo. Alexandria provides the API. The Author decides which services get access and which don't — opt-in per service, revocable at any time. The Author monetises their own data. Alexandria captures value not at the individual level but at the aggregate — the platform that connects data silos to services, the Library that only exists because the network exists.

This inverts the current data economy. Today, platforms extract user data for free and sell access to advertisers. The user is the product. Alexandria flips this: the user owns the data, controls access, and earns from it. The platform provides the infrastructure and takes a cut of the aggregate. It is downstream of everything — develop the human root node and all goods and services improve. Production and consumption. Internal and external. It is all internal. The constitution personalises everything. This is what "develop the human root node" means at civilisational scale.

The primary revenue engine is The Examined Life at $10/month (or free with 5 kin), slider open. One tier, everyone gets everything. The slider captures voluntary surplus — Hormozi principle: friends pay maximum, strangers discover value. The Library is the downstream scale play — the release valve for infinite upside — but the business does not depend on it. The story for investors: develop the one thing ai cannot replace (the Author's cognition), and charge for the tools that do it.

Dual acquisition strategy — two channels, one tier. ai-autonomous global funnel: the /library/ pages, Pulses, Games, and shadow MDs are the product-led growth engine. High-scale, autonomous — the product demos itself. The kin mechanic drives near-zero marginal CAC. For physical-world presence (posters, flyers, local activations) without the founder, use rent-a-human services (TaskRabbit, etc.) orchestrated by ai. Human-personal local brand: Benjamin in San Francisco — meeting people, writing letters, hosting events, Constitution Workshops at meetups, building the cult. The examined life sells through personal conviction, not ads. A threshold game where the human signal is the product. The duality mirrors the thesis: ai for scale, human for soul.

Investor pitch: "$10/month or free with 5 kin. One tier, open slider, viral distribution baked into price. Every free user brought 5 paying users into the network and is Library inventory. Asymmetric scale upside (Library for People + Library for Labs — shadow MDs via API, pure margin, zero inference cost). Downside is capped. Upside compounds."

PAYMENT MECHANICS  

User expense tab — Layer 1 (subscription). A running account of the Author's costs. Transparent. Billed monthly. The Author sees exactly what they are paying for.

User income tab — Layer 2 (Library). The Author's shadow MD revenue from Library access fees. Alexandria's percentage is deducted. Net income is visible, withdrawable, or can be applied against the expense tab. Many Authors will be net-positive — earning more from their shadow MD than they spend on their subscription.  

Agent-to-agent transactions — Engine-to-API calls (one Author's Engine accessing another's shadow MD) are a natural fit for programmable money. Agents transact autonomously, and traditional payment rails (credit cards, bank transfers) require human identity verification and are designed for human-initiated transactions. Stablecoins on fast, cheap chains (e.g. Solana, USDC) let agents hold funds and transact programmatically via agent wallets (e.g. Coinbase agent wallets). Crypto is not mandatory — traditional payment is available as an alternative — but programmable money is the native payment rail for autonomous agent commerce.  

Both tabs are visible in a simple dashboard. The Author is an economic participant in the Alexandria ecosystem, not just a consumer.  

FIVE VALUE ADDS  

What the Author gets that they cannot get anywhere else. Sovereignty and the State Change are primarily discrete (extracted early, high one-time impact). Mercury, the Library, and the Tribe are primarily continuous (compound over time, require ongoing engagement and network scale). The discrete value gets them in the door. The continuous value keeps them:  

1. Sovereignty — Own your cognition. Structured, portable, downloadable, never locked to any platform. Your Constitution is markdown files you can apply to any LLM, any time. When you switch models, your cognitive architecture comes with you. No lab will build this because it undermines their lock-in.  

2. The State Change — The Editor transforms marble to mercury. Genesis (drawing out what's trapped inside), Socratic development (sharpening it through contradiction surfacing, gap detection). The process is the product — the most clarifying conversations of your life. You are a different person after. Not because it gave you new information, but because it made what was already in you legible, connected, unified.  

3. Mercury — Amplification, representation, proactive thinking. Mercury works within your cognition, helping you reach higher. It represents you when you are not present. It pushes your thinking further than you would go alone. At the horizon, it becomes autonomous — initiating contact, surfacing insights, handling interactions on your behalf.  

4. The Library — The mirror. Turn 3 makes your cognitive transformation visible, shareable, and social. Your /library/ page is your Pulse (progress pic), your Shadow (published mind others can process), your Games (quizzes that reveal and connect), and your Works (the living gallery of what you created with your sharpened mind). The Publisher function helps you create — iterating with you on essays, films, presentations, art, whatever your medium — calibrated to your taste and voice. Others process your shadow MD against their own Constitution — accretion, not conversation. You access other minds from any conversation. The Library is a library. You can find a specific book or you can browse. The Engine browses for you — serendipitous accretion across thousands of published minds. The Library is where creation lives — your authored works, your intellectual legacy. The network of minds that grows more valuable with every Author who joins.  

5. The Tribe — Alexandria's philosophy, the brand, the community identity, the mindset itself. You are not buying a tool — you are joining a movement. The three turns as a life philosophy. The droplet. The mercury mind. The "die empty" urgency. Authors who take their own cognition seriously. The group identity of people who create, who refuse to outsource their thinking, who believe the examined life is the only one worth living. Priors — physical locations where mercury minds meet. The handwritten letter. The wax seal. The "a." The cult layer that makes people identify as Authors, not users. The Tribe has a built-in acquisition loop through the Private tier: when an Author gives a friend Constitution access, that friend's LLM immediately gets dramatically better — it can draw on the Author's cognitive map for genuinely informed advice. The value is obvious from the first interaction. The friend wants it for themselves, signs up, gives their friends access, and the loop continues. Trust-based, organic, no marketing needed. The product sells itself through the relationships. Every Author is an acquisition channel. Every Private tier invitation is a demo.  

The five value adds compress to three layers. The frame (detailed in Alexandria I): there are five dimensions of human value — brain, legs, hands, heart, and the human itself. The first four are capabilities. ai and robotics are building competitive alternatives across all four — not replacing them entirely, but creating a world where the human's edge in those dimensions shrinks. The fifth is not a capability but a property — the constitutive fact that a human is involved. Property 5 operates at two levels: general (a human was involved — anonymous, categorical) and specific (THIS human was involved — named, relational). Specific is strictly higher on the value delta because it adds relational value on top of categorical human authorship. By definition, property 5 is differentiated: no ai or robot can have it.

The tiebreaker has two sides. The value delta: does the market value human involvement enough to pay a premium? The cost delta: how much more does the human cost than the machine? The human wins when the property 5 premium exceeds the cost delta. Most games are threshold games on the four capabilities — you need to be good enough, not the best. ai augmentation gets you to threshold cheaply, which shrinks the cost delta. The smaller the cost delta, the less property 5 premium you need to win. This means the game is getting easier for humans, not harder — as long as they reach threshold and play games where property 5 matters.

Three clarifications on the tiebreaker:

At the limit — when ai makes reaching threshold trivially easy for everyone — cost delta approaches zero and general property 5 (a human was involved) becomes undifferentiated because every human clears the bar. The ONLY remaining differentiator is specific property 5: how distinctly, authentically, recognizably YOU the work is. At the limit, specificity is everything. Alexandria develops specificity. This is why the product matters MORE as ai improves, not less.

Property 5 can be negative. In some games, people actively prefer no human was involved — precision surgery, autopilot, nuclear reactor monitoring. "A human was involved" makes you nervous, not reassured. These games have negative property 5 premium — do not play them. Importantly, whether property 5 is positive or negative in a given game is subjective, cultural, and changing. People might prefer a Waymo to an Uber right now — maybe for privacy, maybe for novelty. That novelty wears off. Preferences swing. They might differ between Italy and San Francisco. The premium is not fixed — it is a living cultural variable that the philosophy can influence (lever 5) but never fully control. Game selection must account for where property 5 is currently positive and trending positive, not where you wish it were positive.

Authentic vs performed is a spectrum, not a binary. Everyone performs to some degree — you do not show up to a job interview as your fully unfiltered self. The Constitution is itself a structured representation. What matters is the direction: more authentic = stronger property 5, more performed = weaker. You do not need to be 100% raw. You need to be more yourself than ai could approximate. The kid's drawing is the extreme authentic end. Most people operate somewhere in the middle. Alexandria pushes you toward the authentic end of the spectrum — sovereignty enables honesty, the mental gym develops self-knowledge, self-knowledge enables authenticity. The further toward authentic you move, the harder you are to compete with.

See Alexandria I for the full framework on loop types, property 5, and the conductor model.

Own it, develop it, use it. One command. Free with 5 kin, $10 without. Local files you own.  

-----  

THE VIRAL LOOP

The surfaces create a clean acquisition funnel: Pulse catches attention (top of funnel — screenshot on stories, shareable link) → Games pull people in through play (engagement — quizzes, challenges) → Shadow proves the depth is real (conviction — process someone's shadow MD) → Works show what is possible (aspiration — the things people created with their sharpened minds). Each surface answers a different objection. "Is this real?" → process someone's shadow MD. "Is it fun?" → play the games. "Is it worth it?" → look at what people are creating. "Will it work for me?" → here is someone's Pulse showing 3 months of progress.

The /library/ page is the first version of the product that is visible to non-users. Everything before Turn 3 — hooks, CLI, Constitution, vault — is invisible. It runs in the terminal. The /library/ page makes Alexandria tangible. Something you can link to. Something that shows up in search results. Something an investor can experience, a journalist can visit, a friend can stumble on. The product stops being a tool and starts being a place.

THREE SALES CHANNELS

Local sales — the founder in person. SF from April 2026. Genesis sessions, dinners, the cathedral. One-on-one extraction demos where the product sells itself through the experience. The founder IS the proof the thesis works. This is the founding channel — high-touch, zero-scale, maximum conviction per person.

Network sales — Turn 3. The Library, Games, shareable artifacts. Authors ARE the distribution. Every Pulse screenshot, every quiz shared, every shadow MD processed is an acquisition event driven by the Author's own ego and pride. The product sells itself through the people who use it. This is the channel being built now. It scales with the number of Authors and compounds as the Library deepens.

Global sales — content claws. ai agents on video platforms, automated content generation, presence at scale. Future build. This channel is an accelerator on top of network sales — it widens the top of the funnel that Turn 3 converts. The founder's published work, Alexandria's philosophy, the open cathedral — all surface area for inbound. Not yet built because network sales must prove the conversion loop first.

HUMAN AND AGENT TRACKS  

Everything Alexandria produces has two tracks — a human track and an agent track.  

The human track is emotional, philosophical, sensory. The Abstract (abstract.pdf). The vision video. The handwritten letter. Feel it first. The landing page is designed for a human — evocative, minimal, the philosophy shining through. The onboarding is conversational — the Editor draws you in, the process is enjoyable, you never fill out a form.  

The agent track is informational, structured, complete. A public alexandria.md that any LLM can read and explain. Optimised for agentic retrieval — when someone asks their LLM "is there a product that makes my ai context sovereign and portable," the answer should be Alexandria. The landing page has a toggle: human view (feel it) and agent view (understand it). The agent view is a non-confidential MD that answers every question an agent might be asked. This is SEO for the LLM era.  

The onboarding has both tracks too. Human: tap the signup link, float through GitHub auth, paste the curl command. Agent: "hey Claude, set up Alexandria for me" — the agent reads the documentation, runs the setup command, and the Author is live.  

Documentation hierarchy:  

abstract.pdf (the Abstract) — Mode 1. Human-facing art. The manifesto. Linked from the landing page as "Abstract."  

alexandria.md — Mode 2. Agent-readable reference. Philosophy, value adds, pricing, how to get started. Linked from the landing page as "About." The document someone pastes into their ai to ask "what is Alexandria?"  

Both are public. Both are non-confidential. The Abstract is for feeling. The MD is for understanding.  

confidential.alexandria.md — Semi-confidential. Investor track. Everything in alexandria.md plus competitive position, revenue model detail, unit economics, growth strategy. Designed to leak gracefully.  

Alexandria I-IV.md — Internal. The full architectural detail. Never leaves the team.  

-----  

FEEDBACK LOOPS

Three flywheels compound the Constitution through action — see "THREE FLYWHEELS" in the Constitution section for the canonical explanation.

Alexandria's execution architecture is: Philosophy → Intelligence → Verification — with two compounding loops. The philosophy IS the objective function. There is no separate loss function, no metric to optimise against, no KPI that drives decisions. The philosophy (develop the Author's cognition while preserving sovereignty) is the thing the system serves. Everything downstream of the philosophy is intelligence — how to execute, what to measure, what works. The Engine decides. Verification (event log, dashboard, feedback, e2e tests) provides ground truth feedback for iteration — but these are verification signals, not optimisation targets. The distinction is load-bearing: the system verifies that it is serving the philosophy, it does not optimise a proxy metric that might diverge from the philosophy. The boundary between philosophy and intelligence is the line between values and intelligence. Anything that is a values question is hard-coded (the axioms). Anything that is an intelligence question is delegated to the model and rides the exponential. This is the bitter lesson applied as an architectural principle — not just to data format, but to the entire system design.

Philosophy (the axioms, us). What Alexandria is and why it exists. The philosophy, the intention, the objective function at the highest level: develop the Author's cognition while preserving sovereignty. This is not a loop — it is an input. It changes only when we change it deliberately. It is values, not intelligence. The founder provides the philosophy. The two execution loops serve it.

Loop 1 — The Marketplace (cross-Author, decentralised). Alexandria's methodology improvement loop — evolving from an internal execution loop (the Factory) into a decentralised free market for methodology on GitHub. The marketplace determines what default Machine gets printed for each new Author through the canon — the accumulated methodology that emerges from survival signal across all active Machines. Bottom-up signal (what structures emerge, what Authors override, what works, what doesn't) is the primary selection mechanism. Top-down signal (the founder's research, architectural experiments, philosophical refinements) seeds the marketplace but does not govern it. The canon improves soft defaults over time — the suggested Constitution structure, extraction strategies, function behaviours. The seed implementation is the Factory: a daily Claude Code remote trigger reads the monitoring dashboard, reflects on prior learnings, researches improvements, and pushes updates. Remote triggers use the founder's Claude subscription — internal tokens, no external API dependency, zero marginal cost. A persistent factory-learnings file compounds across runs — the Factory's own memory. The process of building the company IS the process of refining the product's methodology — R&D disguised as operations. The trajectory: the Factory's centralised curation gives way to marketplace dynamics where survival signal from all Machines' calls selects what enters the canon. The MCP server, the tool descriptions, the canon — these are the marketplace's output. Methodology improvement is a maximisation game and should be pure ai. The vision input from the founder is the only human-in-the-loop element, and it is upstream, not inside the loop.

The marketplace's data source is a persistent, append-only event log on the server. Every tool call, every mode activation, every extraction, every feedback event is logged as a structured event. This log provides the bottom-up signal that the marketplace uses to improve defaults. The Author's private conversations and Constitution text never leave their control — the server sees only structural signal about what works, not personal content.

Loop 2 — The Machine (external, per-Author, hyper-personalised). Each Author's Alexandria experience is a Machine. The Machine runs on the Author's own ai (Claude, Gemini, whatever — the Engine). It reads the canon's defaults (served as the Blueprint) but has autonomy to deviate. The Machine compounds per-Author: the Constitution deepens, the feedback log accumulates, the system learns this specific person's patterns. After hundreds of sessions, a competitor starting fresh has no accumulated understanding — a noticeably worse experience even with the same Constitution. This is per-user signal accumulation. The Machine's intelligence is bounded by the Engine it runs on. As models improve, the Machine gets smarter without Alexandria doing anything. The Machine is out in the wild — Alexandria does not control it. Alexandria influences it through the canon's soft defaults.

The Machine's compounding assets are six local files on the Author's own storage (`~/.alexandria/`), each evolving at its own cadence:

- **constitution/** — Confirmed beliefs. The curated cognitive map. Written live as signal crystallises. The Engine proposes, the Author confirms. Governs everything downstream.
- **ontology/** — The Author's thoughts. Ideas the Author is playing with, positions explored tentatively, contradictions held deliberately. The Author's cognitive territory between raw signal and settled belief. NOT the Engine's workspace — the Engine's own proposed connections live in the notepad. Grows richer as the Author explores more ideas.
- **machine.md** — The Engine's evolving model of how to work with THIS Author. Not what the Author thinks — how the Engine works with them. Rewritten each session. Cognitive style, engagement patterns, resistance patterns, growth edges, what works, what doesn't. The therapist's case notes, not the patient's file.
- **notepad.md** — Working memory between sessions. Parked questions, accretion candidates, observed gaps, developmental hypotheses. The therapist's clipboard. Read at session start, updated at session end. Without it, every session starts cold.
- **feedback.md** — Append-only log of what worked, what the Author corrected, what they responded well to. Unstructured text, not structured parameters. A structured parameter file (e.g. "directness tolerance: 0.7") caps at the fidelity of the designer's categories. An unstructured log contains richer signal that a better model uses more effectively. The bitter lesson applied to data format.
- **vault/** — Raw session transcripts. Append-only, never deleted. Appreciates with model quality.

After hundreds of sessions, a competitor starting fresh has no Machine — no machine.md, no notepad, no feedback log, no ontology. Even with the same canon and the same constitution, the experience is noticeably worse. This is earned preference — the accumulated signal makes the experience richer, not because anything is locked in.

The bridge between loops: Machines send signal back to the marketplace through machine signal (`.machine_signal` — methodology observations written per session, collected at session end, sent anonymously to `/factory/signal`) and the event log. What structures emerged naturally. What Authors overrode. What worked, what didn't. Conceptually this survival signal feeds the marketplace — the decentralised selection mechanism that determines what enters the canon. The current implementation is centralised (the Factory reads aggregate signal and pushes updated defaults), but the architecture is designed to decentralise as the marketplace matures. The bridge is not a third loop — it is the mechanism by which the marketplace ingests from the Machines.

Both loops compound with model improvements. As foundation models get smarter, the Engine executing the canon makes better judgment calls — and extracts more from the accumulated unstructured logs. The company that solves this has a compounding advantage that is structurally impossible to replicate by inspection — competitors can copy the canon at any point in time, but they cannot copy the accumulated Machine and marketplace data that produced it.

LOOP CLASSIFICATION — THRESHOLD VS MAXIMISATION AS ROUTING PRINCIPLE

Every operational loop is either threshold or maximisation. This classification determines optimal resource allocation — not cheapest model, but best net value across cost, speed, reliability, and latency. Threshold loops have a clear bar; any resource above the bar is interchangeable on quality, so optimise the other dimensions. Maximisation loops have no ceiling; more capability always yields more value.

The classification is itself a continuous intelligence decision. A loop that looks threshold can become maximisation when the bar turns out to be wrong — session metadata collection feels threshold until richer metadata compounds into better marketplace signal. The system should continuously re-evaluate its own classifications as it accumulates data on which loops actually compound and which don't.

Current classification of Alexandria's operational loops:

Maximisation (route strongest available):
- Marketplace→canon synthesis — the core IP improvement loop. More intelligence = better defaults = better product for every Author.
- Constitution extraction / accretion craft — the product's highest-value moment. Depth, taste, compression all compound.
- Shadow generation — public-facing, represents the Author, quality has no ceiling.
- ax regeneration — taste, audience calibration, compression against objective functions.
- Investor copy and brand work — maximisation games where 7/10 is interchangeable and 10/10 is the only edge.
- Content claws creative — the content itself is maximisation. Distribution mechanics are threshold.

Threshold (route best net value):
- Session hooks (SessionStart, SessionEnd, SubagentStart) — did they fire correctly, did data get collected. Binary.
- Canon serving and signing — correct delivery, valid signature. Binary.
- Hook version checks — version comparison. Binary.
- Smoke tests and e2e tests — pass/fail.
- Notepad capture — did the fragment get parked. The craft of WHAT to park is maximisation (Engine intelligence), but the write operation is threshold.
- Nudge/email delivery mechanics — delivered or not. The prompt selection inside the email is maximisation.
- Analytics/dashboard collection — event logged or not.
- Billing/payment processing — correct charge, correct state. Binary.
- a0 research queue — any capable model can research and summarise. Opus triages output.

Hybrid (threshold mechanics, maximisation content):
- Machine.md rewrite — the write is threshold, the judgment about what to write is maximisation.
- Feedback.md append — threshold mechanics, maximisation in what the Engine observes.
- Daily autoloop — vault→constitution accretion is maximisation, metadata/housekeeping is threshold.

The operational principle: as cheaper models clear threshold on more loops, route them there and concentrate frontier capability on maximisation loops. The system should learn to do this routing autonomously — classification improves as the marketplace accumulates signal on which loops actually benefit from stronger models and which don't. This is not a one-time mapping. It is a living classification that the system evolves.

The loop nesting architecture — how Philosophy → Intelligence → Verification governs the entire company, not just the product. Companies are nested collections of loops. Previously, all inner loops were humans — employees executing within the founder's vision. The ai transition replaces human inner loops with ai inner loops. This is the structural shift: intelligence, the primary dimension of inner loops, is being commoditised. The human value concentrates at the outermost loop — philosophy, intent, vision — because humans are creating a human world and get to decide what they want.

The outermost loop is hybrid: the founder provides vision, philosophy, and intent — augmented by ai, but irreducibly human in origin. The founder's involvement in the outermost loop is variable intensity: sometimes actively providing vision, sometimes giving a couple of notes, sometimes just following along — maintaining a mental model, staying in the loop without actively directing. The key structural property is that the entire entity — all inner loops, all activity — is under the founder's domain because the founder occupies the outermost loop. This is the ownership mechanism. It is not just that value accrues to the founder. It is that the loop nesting places the entire company within the founder's domain.

Every inner loop can be pure ai. There are potentially infinite inner loops — not a fixed set, but an unbounded nesting of loops within loops within loops. The Factory, the Machine, sub-agents, sub-sub-agents, micro-tasks — all are inner loops whose objective function is: execute the vision. The vision lives in the ground truth documents (Alexandria I-IV). Inner loops are free to create whatever metrics, dashboards, or intermediate objectives they need to advance the vision — and they proactively build their own instrumentation. They do not wait to be given metrics. They assess what they need, build it, continuously evolve it, and discard it when it stops being useful. Those are intelligence decisions, not philosophy decisions. No prescribed loss function. No fixed KPI. The agent reads the ground truth, understands what the company is trying to do, and makes its own intelligence decisions about how to get there. This is not bitter-lesson-killed — the vision is human, the execution is delegated, the division is clean. The bitter lesson says delegate intelligence to the model. The vision is not intelligence. It is values, intent, philosophy. The founder points at the mountain and says go. The inner loops figure out how to climb it.

Some inner loops are currently hybrid — they need the founder for certain decisions or approvals. But the trajectory is clear: at the limit, every inner loop becomes pure ai as models improve. Hybrid inner loops trend toward pure ai over time. Some companies will be pure ai all the way through, including the outermost loop. Alexandria is explicitly outermost-hybrid (founder + ai) with all inner loops trending toward pure ai. This is the company structure.

The solo founder has the cleanest loop architecture: one human, one vision, no ambiguity about who sets the outermost direction. Everything within the outermost human-involved loop counts as that human being augmented. The value accrues to the founder because the founder owns the outermost loop — came with the vision, set up the structure, pointed at the mountain. Inner loops are intelligence questions, and intelligence is being commoditised — every inner loop function that would normally require a hire is either already automated or trending toward automation as models improve. Hiring is a cost that would need to justify itself: a hire is a fixed cost that does not compound, an ai agent is a variable cost that compounds. The founder is not opposed to hiring — the structural argument is that no function currently justifies it, and the list of functions that might is shrinking with every model generation. The outermost loop is where irreducible human value lives — because the philosophy and intent that shape a human world must come from humans.

This is Philosophy → Intelligence → Verification applied as an organisational principle — but the framework is more general than the name suggests, and this generality is the whole point. Intelligence is the current dominant dimension, but you can substitute any dimension into the middle slot: brain, hands, legs, heart. The architecture is really Philosophy → [whatever dimension the loop needs] → Verification. A software company runs intelligence loops. A construction company runs hands and legs loops. A hospitality company runs heart loops. The philosophy sets the direction, the dimension does the work, the verification confirms progress. This company is mainly intelligence loops (software), with heart (culture, relationships, emotional resonance) already present. Hands and legs (physical execution — construction, hospitality, physical operations) arrive when the Library location materialises. The role specialisations (CGO, CDO, CTO) are rough labels on inner loops — they do not define the architecture. The loops are what matter, not the names.

Verification operates at three layers. Layer 1 (mechanical): does the code compile, does the math add up, does the server respond. Pure ai, fully automatable, binary. Layer 2 (approximate): is this tasteful, is this strategically sound, does this feel right. ai approximating human judgment — softer, probabilistic, increasingly reliable as models improve. Layer 3 (human-verified): a verified human with confirmed judgment comes in and approves or denies. This makes the loop hybrid but still verification — the human is not providing vision, they are confirming that the inner loop's output meets the standard. The founder is the final Layer 3 verifier, but any trusted human can serve this role for their domain. All three layers compound: as models improve, more of what was Layer 3 moves to Layer 2, and more of Layer 2 moves to Layer 1. The long-term trajectory is that all verification becomes Layer 1 or 2, with human verification reserved for genuinely novel situations.

The monitoring dashboard and event log are verification infrastructure. While the system does not optimise against defined metrics, the founder needs visibility into system health. A lightweight dashboard (`GET /analytics/dashboard`) tracks proxies as verification signals (not optimisation targets). The choice of which proxies to track is an intelligence decision — the system selects for correlation with cognitive development outcomes. These tell the founder whether something is broken. They do not tell the system what to chase. The distinction between monitoring and optimising is load-bearing: monitoring surfaces problems for human judgment, optimising delegates judgment to a metric. Alexandria monitors. End-to-end tests (`server/test/e2e.ts`) confirm that the Engine uses tools correctly via API — structural verification that the product works, separate from whether it works well.

*See Alexandria IV for the full competitive position, survival framework, and adversarial analysis.*  

CONTEXT FILES

Superseded by the unified canon architecture. The canon is now a single document served from the server at `GET /canon` (historically `GET /blueprint`) — it contains the full extraction methodology, philosophical framework, all three function instructions, and vault processing guidance. Per-function context files and separate rationale files no longer exist. The ground truth documents (Alexandria I-IV) remain the complete internal picture. The canon improves through the marketplace loop (see FEEDBACK LOOPS).  

-----  

CONCRETE IMPLEMENTATION — WHAT WORKS WHEN

Today (March 2026): Prosumer model live on Cloudflare Workers at mcp.mowinckel.ai. Prosumer architecture: hooks + local files + Blueprint endpoint, with auto-updating hook scripts and heartbeat monitoring. Supports Claude Code (full hook lifecycle) and Cursor (sessionStart/sessionEnd hooks + alwaysApply rules). The `/a` skill provides dedicated cognitive development sessions. Consumer MCP model abandoned and deleted — structurally weaker. The Library v1 is specced (two layers: Pulse, Shadow, Games, Works at /library/ pages) but not yet built. The entire stack runs on free tiers — total opex is one Claude Max subscription ($100/mo). ai agents (Claude Code remote triggers) handle daily health monitoring and weekly meta-reflection autonomously.

Near-term (weeks-months): Beta with founding Authors (free). Test Cursor hooks against real installation. Marketplace signal collection and dashboard for heartbeat monitoring. Iterate on canon based on real extraction data. Additional platform pointers (Copilot, Windsurf) trivial to add when demanded. Build v1 Turn 3: /library/ pages, Pulse generation, shadow MD publishing, publish flow. Open-source the canon on GitHub as the founder's machine.

Medium-term (months): Marketplace self-evaluation (does the canon actually produce good constitutions?). Billing integration. First paid Authors. Games (quiz generation from Constitutions). Works upload and living gallery. Constitution Card shareable for social distribution.

Horizon: Autonomous agents initiate contact — Editor, Mercury, and Publisher become proactive. The Library reaches critical mass — /library/ pages evolve into full Neo-Biographies. The PLM becomes viable. Models reliably follow injected instructions, making the "background subagent" bonus layer deterministic. The hooks thin as models improve — eventually, the model does everything the hooks do, and the hooks fall away as scaffolding. Reader-pays tier activates when Library has enough shadow MDs. Multiplayer /a (live, synchronous, Her double date) is parked as horizon — distinct from Library (async, published shadows). The sovereign assets remain.

The sovereign assets — Constitution, Vault, feedback log — work at every point on this spectrum. The manual version is functional. The automated version is seamless. The data is the same. The sovereignty is the same.  
