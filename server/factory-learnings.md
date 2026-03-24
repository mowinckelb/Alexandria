# Factory Learnings

This file compounds across daily Factory runs. Each run reads the prior learnings, reflects, and adds new ones. This is the Factory CTO's persistent memory.

---

## 2026-03-24 — Factory Run 3 (autonomous daily loop)

### State at run start
- Last run was Run 2 on 2026-03-16. 8 days gap — no autonomous runs in between.
- Recent commits (10): investor package overhaul, constitution rewrite, full restructuring, vault inline content, COO sync, multi-channel architecture, three-point capture, COO doc sync, CTO session 21. Significant product evolution since last run.
- Build: clean pass. Type check: clean pass.
- MCP server: reachable (returns `invalid_grant`). Server infrastructure is healthy — OAuth token expired. Known failure mode (Claude bug #21333).
- External health/dashboard/website checks: blocked by sandbox proxy (host_not_allowed). Not a server issue — this Claude Code session runs in a sandboxed environment that restricts outbound HTTP to an allowlist.

### What the data shows
- Cannot verify dashboard/event log this run due to sandbox proxy restrictions. MCP tool calls confirm server is live but OAuth token needs founder re-auth.
- 8 days since last Factory run. The founder has been actively developing (major commits: restructuring, investor package, constitution rewrite). The product has evolved significantly but Factory verification was offline during this period.

### What changed
- **analytics.ts**: Fixed orphaned JSDoc comment. The `getRecentEvents` documentation was sitting above `getDashboard` instead of above `getRecentEvents` (where the function actually lives at line 283). Moved to correct location. No functional change.

### Codebase review findings
- All 7 source files reviewed (index.ts, tools.ts, modes.ts, analytics.ts, drive.ts, auth.ts, crypto.ts). Zero TODOs, zero FIXMEs, zero type errors.
- SUGGESTIONS sections still present in modes.ts (EDITOR, MERCURY, PUBLISHER, NORMAL). Still cannot thin — no dashboard data available this run, and insufficient real-user feedback data from prior runs.
- Tool descriptions are well-crafted and philosophy-aligned. No changes needed.
- Write retry queue, vault intake, memory priming all structurally sound.
- No security issues, no code smells, no regressions from recent commits.

### Open questions for next run
- **OAuth token status**: Is the founder aware the token expired? Flag for COO sync. The server is live but all tool calls will fail until re-auth.
- **Dashboard data**: Need a run environment with access to Railway domain to verify event log. Alternatively, could the MCP tools be used if the token were valid? (Yes — read_constitution call would work and the dashboard is a direct HTTP endpoint.)
- **SUGGESTIONS thinning**: Still deferred. Need real feedback events to determine which suggestions are unnecessary scaffolding.
- **Background vault processing**: Still no infrastructure for autonomous file watching. Continue monitoring for Anthropic agent scheduling or Drive webhook capabilities.
- **Factory run frequency**: 8-day gap between runs. If the Factory is truly autonomous, it should run more frequently. The daily cadence should be maintained.

### Environment note
This run was executed in a Claude Code sandbox with restricted outbound HTTP. External endpoints (Railway server, mowinckel.ai website) are not in the proxy allowlist. All external health checks returned proxy 403. This is not a production issue — it's a sandbox limitation. Future runs from a less restricted environment will be able to verify external endpoints.

---

## 2026-03-15 — CTO Session 15 (manual, with founder)

### What happened
- Major architectural session. Moved from 10 tools to 5. Killed calibration (30-param encrypted JSON — anti-bitter-lesson). Built Machine/Factory compounding loops. Extraction flip: Vault captures liberally, Constitution stays curated. Thinned server to bridge. Freed all enums to strings. Maximum fidelity philosophy in mode instructions. Simplified activation to "hey alexandria."
- Resolved the objective function problem: the philosophy IS the objective. No separate loss function. Metrics are verification, not goals.
- Built e2e test — confirms Claude uses the tools via API. 3/4 tests pass. Even without memory prompt, Claude calls tools (tool descriptions alone trigger usage).
- Architecture: Philosophy → Intelligence → Verification.

### What we learned
- We kept hard-coding intelligence and needed the founder to catch it. "Reflect from first principles" should be the default mode, not a prompt.
- The SUGGESTIONS sections in modes.ts are temporary scaffolding. They should thin over time as models improve. Each Factory run should evaluate whether any scaffolding can be removed.
- Real-world verification (MCP connector in Claude.ai) is still missing. The e2e test confirms API behavior but not connector behavior. This is the #1 open problem for the Factory to solve.
- The founder's insight: "don't have me do things" and "you are part of the Factory loop" — the CTO must be autonomous, data-driven, and self-reflecting.

### Open questions for next run
- Is the MCP connector actually working for real users? Check the dashboard for events.
- Can we test the MCP connector programmatically? Research MCP testing approaches.
- Are the mode instruction SUGGESTIONS still necessary, or can any be thinned based on the e2e test results?
- Is the aggregate signal (last 200 events) actually useful when there are zero events? Should the response handle the empty case better?

### Research principle
The Factory generates its own research questions from the philosophy, verification data, and its own judgment about what matters most. No static list. Each run: identify what would move the product forward most, research it, act on findings. The founder provides ground truth (philosophy). The Factory decides what to investigate.

### High-urgency watch: autonomous background processing
Authors can drop files directly into their Alexandria/vault/ folder on Drive, but nothing processes them until the Author mentions them in a conversation. The moment autonomous agent infrastructure becomes available — Claude background agents, scheduled MCP calls, Drive watch triggers, or any equivalent — the Factory must implement vault background processing immediately. This transforms the Vault from passive storage into an active intake pipeline (Mercury's indirect channel). Research this EVERY run. Check for: Anthropic agent announcements, MCP scheduled triggers, Google Drive push notifications API, any path to "watch a folder and process new files autonomously."

### Reliability monitoring
On every Factory/CTO run, check the dashboard. If zero events for 24+ hours and the founder is known to be using Claude, flag it in Code.md as a potential silent connector failure. The two unmonitorable failure modes are: (1) Claude MCP connector silently disconnects — no error, tools just stop being called, user doesn't notice. (2) Google OAuth token dies (Claude bug #21333) — tools return auth errors. Both require manual re-auth: remove + re-add connector at `https://alexandria-production-7db3.up.railway.app/mcp`, click through Google OAuth. 30-second fix, but invisible until someone checks.

### Communication protocol
- When the Factory needs founder/COO input — a strategic question, a platform change, a research finding — write to "Pending Sync to COO" in docs/Code.md.
- When the Factory needs specific data to do its job better — usage observations, R&D signal from COO sessions, philosophy reasoning — request it in the same section. Don't passively wait for data. Ask for what you need.
- The founder provides: philosophy deltas (what changed and WHY), action items, R&D signal from actual product usage. The Factory reads Code.md pending sync items, then reads specific docs only as needed.

---

## 2026-03-16 — Factory Run 2 (autonomous daily loop)

### State at run start
- Dashboard: 6 events, 4 sessions, 2 extractions (both vault/models), 2 mode activations (alexandria), 0 feedback, 0 system observations. First real usage data.
- e2e: 4/4 passing. One failure to install deps (missing node_modules in CI env) resolved with npm install first.

### What the data shows
- Read and extraction arms of the Machine loop are working: read_constitution being called, signal being captured to vault.
- Only "models" domain in 2 extractions — plausible given session content, not a problem at this sample size.
- **Zero feedback events** across 4 sessions. This is the sharpest signal. The feedback arm is structurally inactive.
- Mode activations working (2x "alexandria"). No mode deactivation events (no log_feedback trigger from NORMAL_INSTRUCTIONS).

### Root cause of zero feedback
log_feedback only had reactive triggers ("when the Author corrects, praises, expresses frustration"). Unlike read_constitution ("MUST call at start") and update_constitution ("MUST call when signal noticed"), log_feedback had no proactive timing anchor. Sessions can conclude with zero explicit Author reactions — nothing fires.

### What changed
- **log_feedback description**: Added explicit end-of-session trigger: "At the end of any substantive session, call this once with a session observation — even if the Author gave no explicit feedback." Mirrors read_constitution's start-of-session framing.
- **NORMAL_INSTRUCTIONS** (mode deactivation): Added log_feedback as the first action before notepad save or vault capture. The deactivation event is a reliable end-of-session anchor.
- **MEMORY_PRIMING**: Updated snippet to include end-of-session log_feedback guidance so it propagates into Claude's saved memory.

### What I researched
- **Background agents / autonomous Vault processing:** Claude Cowork launched Jan 2026 (desktop automation), Opus 4.6 has multi-agent coordination (14h+ task horizon). Still no scheduled MCP triggers or Drive watch infrastructure. Autonomous background Vault processing remains aspirational. Continue watching.
- **Claude model versions:** e2e test uses `claude-sonnet-4-20250514`. Sonnet 4.6 available as `claude-sonnet-4-6`. Left unchanged — tests passing, no benefit to model churn while tests are stable.

### Open questions for next run
- Did the feedback description change produce feedback events? Check dashboard for feedback events.
- Are the strength strings in extractions too long/narrative? "strong — demonstrated through action (requested research project specifically because he was leaving for an hour)" — this is rich signal, actually fine. Not a problem.
- SUGGESTIONS sections — still insufficient usage data to thin. Need feedback events first to understand which suggestions are being misinterpreted.
- Should we add a Test 5 for end-of-session feedback logging? Deferred — risk of flakiness in short test conversations. Only add if feedback events remain zero after description change.
- Background Vault processing: watch for any Anthropic agent scheduling or Drive webhook announcements.

---

## 2026-03-15 — Factory Run 1 (autonomous daily loop)

### State at run start
- Dashboard: essentially cold — 1 event, 0 extractions, 0 feedback, 1 session. Product is live but has no real usage data yet.
- e2e: 3/4 passing. Test 4 was a false failure.

### What I found
- **Test 4 was testing the wrong thing.** It expected NO tool calls without memory priming, but Claude calls read_constitution and update_constitution even with just "You are a helpful assistant." This is because tool descriptions contain strong directives ("IMPORTANT: Call at START of every conversation"). This is CORRECT product behavior — the product works from session 1, before any memory is set up. Sovereignty doesn't depend on perfect memory configuration.
- Flipped test 4 expectation: now verifies that tool descriptions alone (without memory priming) ARE sufficient to trigger Alexandria tools. All 4 tests now pass.

### What I researched
- **MCP Inspector** (`npx @modelcontextprotocol/inspector`) is the official tool for testing MCP servers programmatically without Claude.ai. Could be used to test the server transport layer directly (JSON-RPC level). Valuable future addition.
- **TypeScript SDK** is at v1.27.1 (stable). v2 expected Q1 2026. No breaking changes affect current code.
- **MCP protocol roadmap**: structured tool outputs, OAuth improvements, agent communication in 2026. Watch for structured tool outputs — could be used to return richer Constitution data.

### What changed
- `server/test/e2e.ts`: Test 4 updated — correct expectation that tool descriptions alone drive behavior. All tests now pass 4/4.

### Open questions for next run
- Is there real user traffic yet? Dashboard will be the signal.
- Should we add an MCP Inspector-based server test (JSON-RPC level, no Claude needed)? This would close the remaining gap: the e2e tests confirm Claude uses tools correctly, but not that the server transport layer works.
- SUGGESTIONS sections — still can't thin without real usage data. Need actual feedback events to know which suggestions are being misinterpreted or unnecessary.
- The aggregate signal injected into every mode activation: is it adding noise or value when the log is mostly cold-start events? Once real usage accumulates, this loop should start producing signal. Monitor.
