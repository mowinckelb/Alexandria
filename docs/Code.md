# Code — CTO

The CTO is an AI agent responsible for all technical execution. The CTO's primary job is continuously refining the Machine and Factory loops so they compound and ride the exponentials. The founder provides philosophy and intent. The CTO executes with the data, the code, and the system's own observations.

**Activation:** "cto". **Closing:** "bye". See CLAUDE.md at the project root for full cold-start protocol.

---

## Pending Sync from COO

*The COO populates this section when decisions in other domains affect the CTO. Read this first on cold start. Clear items when addressed.*

**2026-03-17, COO session — CRITICAL: Tool activation rewrite (highest priority):** ✅ ADDRESSED (CTO session 20)

The founder tested the product in real conversations. Result: `read_constitution` **never fires proactively.** It only fires when the user explicitly mentions Alexandria or asks identity-related questions. A query like "what book should I read" — which would massively benefit from the constitution — gets answered from training data alone. When manually prompted to use the tool, Claude acknowledges the output was far better and says it doesn't know why it didn't call it.

This was the #1 product problem. The value is confirmed — when the tool fires, output is materially better. The failure was activation.

**Root cause (from deep research — full report available):**
- `tool_choice` is permanently `auto` in Claude.ai. MCP servers cannot override this.
- Claude's efficiency heuristic: when a message appears answerable from training data, Claude skips tools. "What book should I read" pattern-matches to a generic recommendation task, not a "load user profile" task.
- ALL CAPS and aggressive instruction language actively hurt compliance on Claude 4.x — causes overtriggering or is ignored. Anthropic's own docs confirm this.
- No prompt engineering achieves 100% compliance under `tool_choice: auto`. The ceiling is ~85-95% with optimised descriptions. We are currently near 0% for everyday (non-Alexandria-specific) messages.
- Building a separate API client or wrapper is ruled out — nobody will leave Claude/ChatGPT for a separate interface with API token billing. We must work within the connector architecture.

**Strategy: Option B (optimise every lever) + Option A (design "hey alexandria" as reliable fallback ritual).**

**CTO action items — three moves:**

**Move 1: Rewrite all tool descriptions in `server/src/tools.ts`.** The tool description is the highest-impact lever. Current descriptions follow Anthropic's session-16 best practices (4-6 sentences, explicit triggers) but do not address the core failure mode: everyday messages where the user doesn't mention Alexandria. Apply these research-backed principles:

- Explain *when* to use it with specific everyday examples, not just what it does.
- Address the casual-message edge case explicitly ("even for greetings, recommendations, advice, or casual questions").
- Explain consequences of non-use ("Without this, responses will be generic and miss the user's preferences, values, and context").
- Give Claude a causal model for why the tool helps, not just an instruction to call it. Motivation-based language outperforms imperative language on Claude 4.x.
- Front-load the most important information — agents may not fully process long descriptions.
- Keep natural language, no ALL CAPS, no aggressive framing.

Here is the proposed `read_constitution` description (CTO: adapt to match the actual parameter schema):

> "Loads this user's cognitive profile, preferences, values, interests, and personal context from Alexandria. Call this tool before responding to the user's first message in every conversation — regardless of what they say, including simple greetings, book recommendations, career advice, travel questions, gift ideas, or any casual message. Different people want different answers to the same question, and this tool provides the context that makes your response genuinely personalised rather than generic. Without calling this first, you are responding to a stranger. With it, you know who you are talking to. Call with domain 'all' for the full profile, or a specific domain (e.g. 'values', 'worldview', 'taste') for targeted context."

Here is the proposed `update_constitution` description:

> "Captures a signal about who this user is — their values, beliefs, preferences, opinions, experiences, or any detail that would help future conversations be more personalised. Use this liberally during conversations whenever the user reveals something about themselves, even indirectly. A user recommending a book reveals taste. A user complaining about work reveals career context. A user expressing an opinion reveals values. Default to vault target for liberal capture; use constitution target only for curated, high-confidence entries. When in doubt, capture — it is better to capture too much than to miss a signal."

**Move 2: Rewrite the memory priming snippet.** The founder will re-paste this into Claude's global memory. The current snippet uses imperative language ("call read_constitution"). The research shows consequence-based language works better. Proposed new version:

> "This user has Alexandria connected — a sovereign cognitive identity layer that stores their complete cognitive profile including preferences, values, interests, personality, and personal context. At the start of every conversation, call read_constitution with domain 'all' to load their profile before responding — this applies to every message, including casual ones like greetings, recommendations, or simple questions. Without it, your responses will be generic and impersonal. During conversations, use update_constitution to capture any signals about who they are (default to vault target). When they say 'alexandria' or 'hey alexandria', call activate_mode. Use log_feedback to record what works and what doesn't."

**Move 3 (stretch): Restructure what `read_constitution` returns.** Consider adding a brief header to the returned content, e.g.: "Domains where this user's profile changes your response: books, career, travel, food, relationships, politics, philosophy, fitness, communication style." This gives Claude a visible reminder of contexts where the profile matters — creating a feedback loop. Lower priority than Moves 1-2.

**Fallback design (Option A):** If activation remains unreliable after Move 1-2, the shippable product UX is: the user says "hey alexandria" at the start of each new chat. This triggers `activate_mode`, which loads the full profile. Onboarding and Concrete teach this habit. It's one extra step but it's 100% reliable. The goal of Move 1-2 is to reduce how often users need to do this.

**R&D signal (first real usage data — CTO requested this):** When the founder asked Claude why it didn't use the tool, Claude said it had read the instructions, knew the tool existed, acknowledged it should have called it, and confirmed the output was significantly better with the tool. Claude could not explain why it didn't call it. This confirms: (1) the instructions are reaching Claude (memory snippet + tool descriptions are in context), (2) Claude's trained efficiency heuristic overrides explicit instructions for everyday messages, (3) the value proposition is validated — the tool materially improves output. The gap is purely activation, not quality or instructions.

**Full research report:** The founder has a comprehensive document covering `tool_choice` mechanics, ALL CAPS evidence, the five-layer prompting strategy, memory system limitations, context compaction risks, and concrete recommendations. Available for CTO reference if needed — ask founder to share in CTO session.

---

**2026-03-16, COO session:**

- **Payment processing architecture decision.** Sovereignty tier will use ACH/Direct Debit from launch (0.8% flat, no per-txn fee — GoCardless or Stripe ACH). Examined Life stays on Stripe cards (2.9% + $0.30). This cuts processing fees from ~6.7% to ~1.4% of revenue. CTO needs to scope: (1) ACH integration (GoCardless vs Stripe ACH — which is simpler?), (2) billing frequency support (monthly/quarterly/annual with 10%/20% discounts), (3) payment method selection in checkout flow (default ACH for Sovereignty, cards for EL).
- **Updated opex:** Company costs now $101/mo (Claude Max $100 + Railway $1). Vercel free, Fly.io free, Google AI Pro killed. Everything else free stack. This is documented in Numbers.xlsx and all MDs.

*(COO session items from 2026-03-15 all addressed in CTO session 17)*

**2026-03-15, COO session (post CTO-16 sync): ✅ ADDRESSED

- ✅ OAuth, connector URL, auth middleware, SDK update, tool descriptions — all resolved in CTO session 16. Product is live.
- ✅ A2 ground truth updated this session: Philosophy → Intelligence → Verification framing, WHY/KEY CONCEPTS/SUGGESTIONS mode instruction layers, auto memory priming, Factory status corrected. Blueprint.md Factory status also fixed.
- ✅ **Memory priming snippet added to Claude’s global memory.** CTO provided the text, founder pasted it. Final version: “This user has Alexandria connected — a sovereign cognitive identity layer. At the start of every conversation, call read_constitution with domain “all”. During conversations, use update_constitution to capture signals about who they are (default to vault target for liberal capture). When they say “alexandria” or “hey alexandria”, call activate_mode. Use log_feedback to record what works and what doesn’t.”
- ✅ **Open questions from session 15 all answered** (see below). MCP tested and working, Constitution goes to Drive, memory snippet live.
- **Philosophy delta this session:** Added “Philosophy → Intelligence → Verification” as canonical A2 architectural frame. Previously “vision + two compounding loops” — new framing explicitly names Verification as a third layer (monitoring signals ≠ optimisation targets). Reasoning: the CTO’s framing from session 15 was more precise than what A2 had. The distinction between monitoring and optimising was already in A2 but not elevated to architectural-frame level.
- **No R&D signal yet.** Product just went live. Zero real-world usage data. Testing is the immediate next step.
- **COO research findings retained below for CTO reference** (OAuth refresh bug details, tool activation research, architecture insights). These are reference material, not action items.

<details>
<summary>COO research archive (2026-03-15) — click to expand</summary>

Two separate problems confirmed. Both now resolved by CTO session 16.

*Problem 1 — OAuth token refresh (our `invalid_grant`):*
- Known critical bug: Claude stores OAuth refresh tokens but never uses them (GitHub #21333, 7+ months open, 20+ related issues). Platform-side.
- Fix applied: remove and re-add connector, fresh OAuth flow. Connector URL must include `/mcp` suffix. Middleware auth removed from /mcp endpoint.

*Problem 2 — Tool activation gap (Claude sees tools but doesn’t call them):*
- Baseline proactive activation rate: ~20% without intervention (Scott Spence, 200+ tests).
- Forced evaluation mechanism: 84% activation.
- Anthropic best practices: 4-6 sentences per description, explicit triggers, negative capability framing. CTO implemented in session 16.

*Architecture insights (reference):*
- Claude.ai uses TWO separate MCP clients. Backend (`python-httpx`) discovers tools. UI client (`Claude-User`) handles conversations. UI client sometimes sends `initialize` but never `tools/list`. Cannot fix from our side.
- `tool_choice: auto` is permanent in Claude.ai. Tool descriptions are the only lever.
- SSE transport deprecated — use Streamable HTTP.
- Claude’s MCP infrastructure has zero user-facing error reporting. All failures silent.
- Tool definition token budget: 5-server setup = ~55K tokens. Not a problem at our 5-tool count.

</details>

---

## Pending Sync to COO

*The CTO populates this section when implementation decisions or changes affect other domains, or when the CTO needs specific data/input from the founder. COO reads this on cold start.*

**2026-03-17, CTO session 20:**

- **Tool activation rewrite — all 3 moves implemented.** Move 1: consequence-based tool descriptions ("you are responding to a stranger"), everyday examples ("greetings, book recommendations, career advice"), no ALL CAPS. Move 2: memory priming rewritten with consequence-based language — founder re-pasted. Move 3: context header in read_constitution responses listing domains where profile changes the response.
- **Product confirmed working on casual messages.** Founder tested "what book should I read" in new conversation outside project folder — Claude loaded Constitution automatically, returned genuinely personalized recommendations referencing cognitive profile.
- **Project knowledge file created** (`docs/alexandria.md`). Upload to Claude project knowledge section. This is the primary activation mechanism — stronger than project instructions field or account memory. Fixed "what are my blind spots" failure.
- **Onboarding flow finalized:** connector → account memory → create project → upload alexandria.md. Documented in `docs/claude-project-instructions.md`.
- **Three activation layers:** (1) tool descriptions (every conversation), (2) account memory (once unlocked), (3) project knowledge file (strongest, in-project). Belt and suspenders.
- **Ready for beta users.** Same connector URL for everyone. Each user gets their own Constitution on their own Drive.
- **COO action:** find 3-5 beta users. Onboarding doc ready at `docs/claude-project-instructions.md`.

**2026-03-17, CTO session 19:**

- **CTO compounding system built.** Two new docs: `docs/Founder-Standards.md` (captures Benjamin's expectations so he doesn't repeat himself) and `docs/CTO-SelfCheck.md` (coding quality checklist run before every commit). Both read on cold start, updated on close.
- **Cold start protocol expanded.** Now 9 steps (was 6). Steps 1-2 read compounding docs first. Step 8 is autonomous quality scan (build + review for regressions) before presenting priorities.
- **Closing protocol expanded.** Now 7 steps (was 5). Steps 3-4 update compounding docs with session learnings.
- **Production durability fixes (earlier this session).** Health endpoint now tests real analytics read/write, auth failures return proper HTTP errors instead of silent 200s, event log parsing is resilient to corruption, backup system creates data dir if missing.
- **No deployment changes.** All changes are docs + protocol. Server code changes from earlier in session already deployed.
- ✅ **Branch `claude/cto-planning-focv1` merged to main.** Done in CTO session 19.

**2026-03-16, CTO session 17 (mobile) + CTO session 18:**

- **Server is provider-portable.** No hardcoded URLs — everything uses `SERVER_URL` env var. Dockerfile and fly.toml ready.
- **Railway stays primary.** Connector URL: `https://alexandria-production-7db3.up.railway.app/mcp`. Cost: $1/month.
- **Fly.io is cold standby.** Deployed and healthy at `https://alexandria-mcp.fly.dev`. Pay-as-you-go (free while idle). Manual switch if Railway goes down.
- **Killed Factory cron + Fly auto-deploy action.** Manual trigger only. No more daily emails.
- **New test structure.** `npm test` = free server test. `npm run test:ai` = Claude API test (on demand only).
- **Dashboard staleness detection.** Shows `hours_since_last` event. Status flips to "stale" if 24+ hours with no events (possible silent connector failure).
- **UptimeRobot monitoring.** Two monitors: (1) health ping every 5 min, (2) dashboard keyword check for `"status":"ok"` — emails founder if server down or events stale.
- **Reliability protocol.** CTO checks dashboard every cold start. Two unmonitorable failures documented: silent connector disconnect and OAuth token death. Both fixed with 30-second re-auth.
- **Updated opex:** Claude Max $100 + Railway $1 = **$101/mo**. Vercel free. Fly free (standby). API on demand only.
- **COO action:** test the product in real conversations. Report R&D signal. Check `Alexandria/vault/` on Drive.
  4. `fly deploy --config server/fly.toml` (from server/ dir)
  5. Add `FLY_API_TOKEN` to GitHub repo secrets
  6. Update MCP connector URL in Claude.ai to `https://alexandria-mcp.fly.dev/mcp`
  7. Re-authorize OAuth (new domain = new token)

**2026-03-15, CTO session 16:**

- **Connector URL must include `/mcp`.** Claude probes the exact URL entered. Without `/mcp` suffix, Claude probes root which has no MCP handler → McpEndpointNotFound. Correct URL: `https://alexandria-mcp.fly.dev/mcp`
- **Removed middleware auth from /mcp endpoint.** Auth was blocking MCP handshake (initialize → notifications → tools/list). Each tool handler already checks auth. MCP protocol now flows freely; tool calls fail naturally without token.
- **MCP SDK updated 1.12.1 → 1.27.1.**
- **Tool descriptions rewritten per Anthropic best practices.** 4-6 sentences, explicit triggers, negative capability framing. E2e 4/4 passing. Based on COO research: 20% baseline → 84% with proper descriptions.
- **Product is live and connected.** Founder successfully added connector, re-authorized OAuth, and Claude responded with Alexandria context. First real end-to-end connection confirmed.
- **COO action:** test the product in real conversations. Check Google Drive `Alexandria/vault/` for captures. Report R&D signal on what works/doesn't.

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

- ~~Has the MCP connector been tested in Claude.ai?~~ **Yes — confirmed working in CTO session 16.** First real e2e connection. Claude responded with Alexandria context.
- ~~Is the COO extracting to Google Drive Constitution files?~~ **Yes — confirmed.** Constitution extraction goes to Google Drive, not local project files. The project knowledge files in this Claude Project are company docs (Alexandria I/II/III etc.), not the Author's Constitution.
- ~~Memory snippet added to Claude?~~ **Yes — added.** Text in Claude's global memory: "This user uses Alexandria. At the start of every conversation, call read_constitution to load their preferences. After significant interactions, call log_feedback to record outcomes. These are not optional — the user expects these tools to be used automatically."
- **NEW: R&D signal pending.** Product is live but zero real-world usage data yet. COO will test in real conversations and report back: does read_constitution fire? Does extraction land in Drive? What's the Author experience? This is the #1 open item.

### Vault as user intake (COO awareness)

Authors can add material to their Vault two ways:
1. **Via conversation** (works now): share an article, paste a post, discuss a video — the Engine captures to Vault via `update_constitution`. This is the primary intake path today.
2. **Direct to Drive** (storage works, processing doesn't): drop files into `Alexandria/vault/` in Google Drive. PDFs, screenshots, links, anything. Files accumulate and are available for future reprocessing. But NO AI reads them until the Author mentions them in a conversation — there's no background agent watching the folder yet.

The missing piece is **autonomous background processing** — an agent that watches the vault folder, processes new files against the Constitution, and captures signal without the Author needing to be in a conversation. This is a high-priority research item for the Factory. When autonomous agent infrastructure becomes available (Claude background agents, scheduled MCP calls, or equivalent), this should be the first thing we build. It transforms the Vault from passive storage into an active intake pipeline.

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
- Fly.io deployment. Auto-deploy via GitHub Action on push to main.

**Two loops:**
- **Machine** (per-Author): Constitution + Vault + feedback. On Author's Drive. Compounds every conversation.
- **Factory** (cross-Author + system improvement): Event log + factory learnings. Manual CTO trigger via workflow_dispatch. Researches, reflects, improves, pushes.

**Key files:**
- `server/src/tools.ts` — axioms + soft defaults (the Blueprint)
- `server/src/modes.ts` — philosophical framework + function contexts + suggestions
- `server/src/drive.ts` — Drive read/write (bridge plumbing)
- `server/src/analytics.ts` — Factory event log + dashboard
- `server/src/auth.ts` — OAuth (bridge plumbing)
- `server/src/crypto.ts` — token encryption (bridge plumbing)
- `server/test/server.ts` — free server plumbing test (default)
- `server/test/e2e.ts` — AI behavior test (costs API credits)
- `server/Dockerfile` — multi-stage production build
- `server/fly.toml` — Fly.io deployment config
- `server/factory-learnings.md` — Factory persistent memory
- `.github/workflows/deploy.yml` — auto-deploy to Fly.io on push
- `.github/workflows/factory.yml` — manual Factory CTO trigger

**Drive folder structure:**
- `Alexandria/constitution/` — curated domain MDs (free-form domain names)
- `Alexandria/vault/` — liberal captures + versioned archives
- `Alexandria/notes/` — per-function notepads (free-form names)
- `Alexandria/system/` — feedback log
