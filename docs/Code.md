# Code — CTO

The CTO is an AI agent responsible for all technical execution. The CTO's primary job is continuously refining the Machine and Factory loops so they compound and ride the exponentials. The founder provides philosophy and intent. The CTO executes with the data, the code, and the system's own observations.

**Activation:** "cto". **Closing:** "bye". See CLAUDE.md at the project root for full cold-start protocol.

---

## Pending Sync from COO

*The COO populates this section when decisions in other domains affect the CTO. Read this first on cold start. Clear items when addressed.*

*(empty — all prior items addressed in CTO sessions 14-15)*

---

## Pending Sync to COO

*The CTO populates this section when implementation decisions or changes affect other domains, or when the CTO needs specific data/input from the founder. COO reads this on cold start.*

**2026-03-15, CTO session 15:**

### Status update

Turn 2.5 complete. Major architectural session. Summary of everything built:

- **Architecture: Philosophy → Intelligence → Verification.** The philosophy IS the objective function. No separate loss function. Metrics are verification signals, not optimization targets. Everything downstream of the philosophy is intelligence — the AI decides.
- **5 tools** (down from 10): update_constitution (vault/constitution target), read_constitution (constitution/vault source), activate_mode (defaults to "alexandria"), update_notepad, log_feedback. All parameters are free strings with soft default suggestions. Only enum: vault/constitution (structural routing).
- **Extraction flip.** Vault captures liberally (zero false negatives). Constitution stays curated. Future models reprocess Vault and promote.
- **Server = bridge.** File read/write, OAuth, metering, event logging, serve soft defaults. Intelligence belongs to the Engine. Bridge thins over time.
- **Mode instructions restructured.** Full philosophical framework (~1800 words shared context) served in every conversation. WHY (philosophy, permanent) + KEY CONCEPTS (framework, semi-permanent) + SUGGESTIONS (scaffolding, temporary). No methodology prescription.
- **"Hey alexandria" activation.** Single trigger, model decides what function to play. Editor/Mercury/Publisher still available for specific requests.
- **Persistent event log.** Append-only JSONL at `/data` on Railway volume. Survives deploys.
- **Monitoring dashboard.** `GET /analytics/dashboard` — 5 verification proxies.
- **E2e test.** `server/test/e2e.ts` — confirms Claude uses tools via API. 4/4 passing.
- **Autonomous Factory loop.** `.github/workflows/factory.yml` — runs daily at 06:00 UTC. Reads dashboard, reflects on prior learnings, researches, improves, pushes. First autonomous run completed successfully.
- **Factory learnings.** `server/factory-learnings.md` — persistent memory that compounds across runs.
- **Vercel ignore.** Server-only pushes skip Vercel builds (no failed deployment emails).
- **Auto memory priming.** read_constitution asks Claude to save usage instructions to memory. Works from first conversation.

### Data requests from CTO

**The CTO needs specific data from COO sessions to do its job well. Please include the following when updating this section:**

1. **Philosophy deltas** — what changed in the ground truth and WHY. Not full doc rewrites (CTO reads the current state). The reasoning behind the change is more valuable than the change itself. "We killed calibration because it fights the exponential" > a rewritten section.

2. **R&D signal from actual product usage.** The COO sessions with the founder ARE the product working on its first user. When extraction works or doesn't, when a conversation approach lands or falls flat — that's direct Factory signal. Examples: "Socratic probing worked well for models domain but the founder deflected on shadows" or "the Constitution entry for values felt inaccurate — the founder corrected it." This is the most valuable data the CTO can receive.

3. **Founder's MCP usage feedback.** When the founder uses Alexandria in Claude.ai: did it call read_constitution? Did it capture signal? What was the experience? Did the Author feel observed or did it feel natural? This is currently the #1 open question — the product is untested with the real MCP connector.

4. **Action items.** Decisions that need implementation. Keep these concise — decision + reasoning, not full context.

**The CTO does NOT need:**
- Full doc rewrites (reads current state from files)
- Copy edit details
- Operations process changes that don't affect the product
- Detailed summaries of what was discussed (the delta is what matters)

### Open questions for founder

- **Has the MCP connector been tested in Claude.ai?** The e2e test confirms Claude uses tools via API. But the actual connector experience is unverified. This blocks everything — both loops are structurally complete but have zero real data.
- **Is the COO extracting to Google Drive Constitution files?** Or only to local project files? The MCP server reads from Drive. If extraction is only happening in local project files, the product loop is disconnected.
- **Memory snippet added to Claude?** The memory priming ("This user has Alexandria connected...") needs to be in Claude's global memory for reliable tool usage. Has this been done?

---

## Architecture (current)

**Philosophy → Intelligence → Verification**

- **Philosophy** (ground truth): develop the Author's cognition while preserving sovereignty. The philosophy IS the objective function. No separate metrics or loss functions.
- **Intelligence** (AI): everything downstream. How to execute, what to measure, what works. The Engine decides.
- **Verification** (data): event log, dashboard, feedback, e2e tests. Ground truth feedback for iteration. Not optimization targets.

**Server = Bridge**
- 5 tools. Free string parameters. Soft defaults in descriptions.
- Full philosophical framework served in every read_constitution and mode activation.
- Stateless. Encrypted token auth. Google Drive OAuth.
- Railway auto-deploy from GitHub main.

**Two loops:**
- **Machine** (per-Author): Constitution + Vault + feedback. On Author's Drive. Compounds every conversation.
- **Factory** (cross-Author + system improvement): Event log + factory learnings. Daily autonomous CTO runs. Researches, reflects, improves, pushes.

**Key files:**
- `server/src/tools.ts` — axioms + soft defaults (the Blueprint)
- `server/src/modes.ts` — philosophical framework + function contexts + suggestions
- `server/src/drive.ts` — Drive read/write (bridge plumbing)
- `server/src/analytics.ts` — Factory event log + dashboard
- `server/src/auth.ts` — OAuth (bridge plumbing)
- `server/src/crypto.ts` — token encryption (bridge plumbing)
- `server/test/e2e.ts` — verification test
- `server/factory-learnings.md` — Factory persistent memory
- `.github/workflows/factory.yml` — autonomous daily CTO trigger

**Drive folder structure:**
- `Alexandria/constitution/` — curated domain MDs (free-form domain names)
- `Alexandria/vault/` — liberal captures + versioned archives
- `Alexandria/notes/` — per-function notepads (free-form names)
- `Alexandria/system/` — feedback log
