# Code — CTO

The CTO is an AI agent responsible for all technical execution. The CTO's primary job is continuously refining the Machine and Factory loops so they compound and ride the exponentials. The founder provides philosophy and intent. The CTO executes with the data, the code, and the system's own observations.

**Activation:** "cto". **Closing:** "bye". See CLAUDE.md at the project root for full cold-start protocol.

---

## Pending Sync from COO

*The COO populates this section when decisions in other domains affect the CTO. Read this first on cold start. Clear items when addressed.*

*(empty — all prior items addressed in CTO sessions 14-16)*

**2026-03-15, COO session (current):**

- **OAuth invalid_grant.** Confirmed in this session — `read_constitution` returns `invalid_grant`. The Google Drive refresh token is dead. Founder needs to re-authorize the Alexandria connector. This is the #1 blocker for both loops.
- **MCP connector is added and tools are visible.** All 5 tools load correctly in Claude.ai. The issue is purely OAuth, not connector setup.
- **Memory priming snippet status unclear.** Founder says they added it but it's not visible in Claude's memory edits. May have been added to a different memory system or not persisted. The COO will add it from this session. Priming text needed: something that tells Claude to call read_constitution at conversation start.
- **Constitution extraction IS going to Google Drive** (not local files). Confirmed by founder. The project knowledge files in this Claude Project are separate — they're the company docs, not the Author's Constitution.
- **Cost structure updated.** Claude API ~$50/mo now in all financial docs. Total burn stays $500. $210 company + $290 founder. No code change needed — awareness item.
- **A2 fully updated to match 5-tool architecture.** Tool Groups 1/2/3 collapsed into unified TOOLS section. Tier gating described as metering-based (not tool-access-based). Factory loop updated to reflect autonomous daily runs. All downstream docs (Finance.md, Memo.md, Deck.js) updated to match.
- **CTO data request format acknowledged.** Future COO syncs will include: (1) philosophy deltas with reasoning, (2) R&D signal from COO sessions, (3) MCP usage feedback, (4) concise action items.

**2026-03-15, COO research — MCP tool activation & OAuth findings:**

Two separate problems confirmed. Fix both independently.

*Problem 1 — OAuth token refresh (our `invalid_grant`):*
- Known critical bug: Claude stores OAuth refresh tokens but never uses them (GitHub #21333, 7+ months open, 20+ related issues). This is platform-side, not our bug.
- Fix: remove and re-add connector to force fresh OAuth flow. Extend access token lifetime if possible (Claude may not reliably refresh). Verify OAuth discovery endpoints (`/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`). Use Streamable HTTP transport, not SSE (SSE being deprecated). Test independently with MCP Inspector (`npx @modelcontextprotocol/inspector`) to isolate server-side vs client-side.
- Separate bug: Claude.ai sometimes makes MCP requests without any Authorization header after successful OAuth (GitHub #2157). Token issued but never sent. Same servers work in ChatGPT/Cursor/Inspector — Claude-specific client bug.

*Problem 2 — Tool activation gap (Claude sees tools but doesn't call them):*
- Baseline proactive activation rate: ~20% without intervention (Scott Spence, 200+ tests).
- Forced evaluation mechanism (require Claude to evaluate each tool YES/NO before responding): 84% activation. This is the single most effective technique.
- Anthropic officially recommends: "use proactively" in description fields, 4-6 sentences minimum per description ("by far the most important factor"), explicit trigger conditions, negative capability framing, when-NOT-to-use clauses.
- CTO action: rewrite all 5 tool descriptions. Specifically:
  - `read_constitution`: add "MUST be called at the start of every conversation before any substantive response. Without this tool, you have no access to the user's cognitive profile."
  - Example template for `read_constitution` description (from Anthropic best practices): "Use this tool proactively at the start of every conversation to read the user's constitution and understand their preferences, goals, and context. This MUST be called before answering any substantive question. Without calling this tool, you have no access to the user's configuration and cannot provide personalized responses."
  - All tools: 4-6 sentences with explicit trigger conditions and negative capability framing.
  - Consider service-prefixing using the pattern `{service}_{action}_{resource}`: e.g. `alexandria_read_constitution`, `alexandria_update_constitution`, `alexandria_activate_mode`.
- Our 5-tool count is fine — degradation starts at 10+. Not a factor.

*Architecture insight (new information):*
- Claude.ai uses TWO separate MCP clients. Backend client (`python-httpx`) discovers tools via `tools/list`. UI client (`Claude-User`) handles conversations. UI client sometimes sends `initialize` but never `tools/list` — tools exist at backend but never reach the model. This explains "Connected in settings, invisible in conversation" pattern. Cannot fix from our side — but explains some failures that aren't about description quality.
- Active MCP connections can also drop mid-session with no notification — separate from OAuth. Silent disconnects are a known pattern.
- Diagnostic: if tools work in MCP Inspector but not Claude.ai, it's the client-side bug, not us.

*Additional findings:*
- **`tool_choice: auto` is permanent in Claude.ai.** No way to force `tool_choice: any` (which would guarantee at least one tool call). Everything depends on Claude's semantic matching deeming our tools relevant. This is a hard constraint — tool descriptions are the only lever we have.
- **SSE transport is being deprecated.** If we're on SSE, migrate to Streamable HTTP. Check current transport.
- **December 18, 2025 Claude Desktop update broke OAuth flows** that previously worked. Our OAuth may have died from a platform update, not natural token expiry. Worth checking timeline of when it last worked.
- **Claude's MCP infrastructure has zero user-facing error reporting.** All failures are silent. Product implication: if we build onboarding diagnostics, we need to compensate for this — the user will never know something is broken unless we tell them.
- **Tool definition token budget.** 5-server setup = ~55K tokens consumed by definitions alone. Opus 4 accuracy drops to 49% without Tool Search optimization at scale. Not a problem at our 5-tool count, but relevant constraint if we ever expand. The 10→5 consolidation was the right call — academic benchmarks (HumanMCP) confirm ~10% accuracy degradation going from 10→100 tools.
- **Memory vs CLAUDE.md for activation priming.** CLAUDE.md-style structured instructions are more reliable than Claude.ai memory for consistent tool activation. Claude.ai memory is less structured and less deterministic. The COO will add a memory snippet with mandatory framing, but long-term the CTO should explore whether there's a way to inject activation instructions through the server's response payloads (e.g. the ~1800-word philosophical framework already served with every read — could include a tool usage instruction). Suggested memory snippet: "This user uses Alexandria. At the start of every conversation, call read_constitution to load their preferences. After significant interactions, call log_feedback to record outcomes. These are not optional — the user expects these tools to be used automatically."
- **Short-lived OAuth tokens make the refresh bug worse.** Atlassian tokens expire in 5-12 minutes, Microsoft in 60-90 minutes — both "basically unusable" with Claude's refresh bug. Google tokens are typically longer-lived but the CTO should verify our access token lifetime and extend if possible.

---

## Pending Sync to COO

*The CTO populates this section when implementation decisions or changes affect other domains, or when the CTO needs specific data/input from the founder. COO reads this on cold start.*

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

- **Has the MCP connector been tested in Claude.ai?** The e2e test confirms Claude uses tools via API. But the actual connector experience is unverified. This blocks everything — both loops are structurally complete but have zero real data.
- **Is the COO extracting to Google Drive Constitution files?** Or only to local project files? The MCP server reads from Drive. If extraction is only happening in local project files, the product loop is disconnected.
- **Memory snippet added to Claude?** The memory priming ("This user has Alexandria connected...") needs to be in Claude's global memory for reliable tool usage. Has this been done?

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
