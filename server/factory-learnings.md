# Factory Learnings

This file compounds across daily Factory runs. Each run reads the prior learnings, reflects, and adds new ones. This is the Factory CTO's persistent memory.

---

## 2026-03-29 — Meta Run 1 (weekly evolution, autonomous)

### State at run start
- 42 commits since last health run (2 days). Dominant change: **Fly.io → Cloudflare Workers migration** (commit `cce0d2d`). Also: Mercury scan system operational (daily multi-agent scans), massive philosophy evolution (Persona→Shadow rename, Library reframe, data-and-intent principle, accretion mechanics, PT metaphor), vault integrity + Blueprint integrity, stack consolidation ($102→$100/month opex).
- Build: PASS (wrangler dry-run, 241 KiB gzipped).
- Website types: PASS (tsc --noEmit clean).
- Investor docs: 4/4 synced.
- Mercury scans: Active (2026-03-27, -28, -29 in vault_intake/).
- Server health: Cannot verify live (sandbox blocks curl to external).

### What the week shows — patterns

1. **Infrastructure matured.** Railway → Fly.io → Cloudflare Workers in 2 weeks. Each hop reduced complexity: Dockerfile + volume → serverless Worker + KV. Opex dropped from $102/month to $100/month (Cloudflare free tier). The server is now 241 KiB gzipped, deploys in seconds, zero idle cost. This is the bitter lesson applied to infrastructure — general compute (Workers) beats managed containers (Fly).

2. **Mercury is alive.** The autonomous daily scan system is producing structured fragments in vault_intake/. Three-tier agent processing (base scan → frontier agent → archive agent). Output format is clean: Forward/Backward/Zero-delta sections, each fragment with source, marginal delta, and constitution connection. No verification mirror exists yet — adding one.

3. **Philosophy velocity continues.** The founder is evolving the thesis faster than the system can track. Key moves this week: "data and intent, not intelligence" as core principle, Persona→Shadow rename, Library reframe (shadow MDs via API, accretion not inference), PT metaphor, accretion mechanics (fragment transfer, compression levels). All crystallised from a0→aN.

4. **public/docs/ is NOT a symlink.** CLAUDE.md says it is, but it's a separate directory. Files had diverged — Concrete.md and Vision.md in public/docs/ still had "AI" (uppercase) and old Fly.io references. Fixed and synced this run.

### What I fixed

1. **Stale Fly.io references** — 5 locations across aN and aX files:
   - a2:865 — "$102/month — Claude Max $100, Fly.io ~$2" → "$100/month — one Claude Max subscription"
   - a1:614 — "$102/month — two paid services (Claude Max and Fly.io)" → "$100/month — one paid service (Claude Max)"
   - a1:652 — "$102/month" → "$100/month"
   - Memo.md:247 — "$102/month opex" ��� "$100/month opex"
   - Concrete.md:58 — "Fly.io (server)" → "Cloudflare (server + DNS)"
   The founder already updated a2's stack description in `fed6675` but missed these downstream instances.

2. **public/docs/ sync** — Concrete.md and Vision.md copied from files/public/ to public/docs/. Both had stale content and uppercase "AI" violations.

3. **public/partners/ sync** — Memo.md resynced after opex fix.

4. **Test default port** — server.ts and prosumer.ts tests updated from `localhost:3001` (Express/Fly) to `localhost:8787` (wrangler dev).

5. **Analytics log test** — Added Test 6 to server.ts covering `GET /analytics/log` endpoint (was the only analytics route without a test).

### Verification results
- **Server build**: PASS
- **Website types**: PASS
- **Investor doc sync**: 4/4 identical (post-fix)
- **Public docs sync**: Fixed and verified
- **Test suite**: Updated for Cloudflare Workers (port 8787, analytics/log test added)
- **Live server**: Cannot verify (sandbox)
- **Smoke tests**: Already target mcp.mowinckel.ai (correct post-migration)

### Verification gaps identified

**Routes with no automated test coverage (48% of all routes):**
1. OAuth flow (6 routes): `.well-known`, `/authorize`, `/oauth/callback`, `/register`, `/token`, `/revoke`
2. Billing flow (3 routes): `/billing/success`, `/billing/portal`, `/billing/webhook`
3. Drive initialization: `POST /initialize`
4. Cron trigger: `scheduled()` (daily follow-up email)
5. GitHub OAuth callback: `GET /auth/github/callback`

These are hard to test in isolation (require Stripe/Google/GitHub credentials). The smoke test covers the critical happy path (/health, /blueprint, /hooks, /session). OAuth and billing are exercised by real user flows. **Recommendation**: add a smoke test for `GET /.well-known/oauth-authorization-server` — it's the only OAuth route that doesn't need credentials and confirms the OAuth discovery is functional. Deferring to health trigger.

**New gap — Mercury scan verification:**
No automated check that mercury scans are running. The daily health trigger should verify vault_intake/ has a file from the last 48 hours. This is a signal that the mercury trigger is functional. Cannot implement here (file is on the founder's machine, not in the deployed server) — but the health trigger runs in the repo and CAN check git log for mercury commits.

### What I learned

1. **The migration cascade is real.** When infrastructure changes (Fly→Cloudflare), references scatter across aN, aX, tests, and served content. The founder updated the main stack description but missed 5 downstream references. The meta run caught them all. This validates the meta trigger's purpose — health verifies, meta evolves.

2. **public/docs/ symlink claim in CLAUDE.md is false.** It's a regular directory. Either it was a symlink that got dereferenced, or the intent was never implemented. Either way, the files drift. **Recommendation**: either make it an actual symlink or add a sync check to the health trigger. Making it a symlink is cleaner but may break Vercel's static file serving (needs investigation).

3. **SUGGESTIONS in modes.ts are stable.** 3 locations (Editor, Mercury, Publisher) with 15 total suggestion bullets. Still insufficient real-world usage data to thin. The philosophy is explicitly "As models improve, these thin and eventually disappear." No action this run — but the meta run should evaluate thinning quarterly based on any feedback events in the dashboard.

4. **The server codebase is remarkably clean.** Zero TODO/FIXME comments. Zero technical debt in comment form. The philosophy-as-objective approach means there's no backlog — just the philosophy and its implementation.

5. **Mercury scans are a new compounding surface.** Daily structured fragments flowing into vault_intake/, connected to Constitution domains, with explicit zero-delta tracking. This is the indirect channel described in the Blueprint. No verification mirror exists for it yet.

### Trigger proposals

All resolved 2026-03-29 (interactive session):
1. ~~Fly.io → Cloudflare Workers~~ — both triggers updated.
2. ~~Mercury freshness check~~ — added to health trigger as soft default.
3. ~~public/docs sync check~~ — added to health trigger as soft default.
4. ~~OAuth discovery smoke test~~ — already in smoke.yml.
5. ~~Smoke workflow check~~ — added `gh run list` to health trigger as soft default.

### Open questions for next meta run
- Is public/docs/ supposed to be a symlink? If Vercel serves from it, a symlink might not work (Vercel may need the actual files). Investigate.
- Are the GitHub Actions smoke tests passing? The health trigger noted this as a gap in runs 4 and 5. Can we check workflow run results via the GitHub MCP tools?
- Should we thin any SUGGESTIONS yet? Need feedback event data first.
- The cron trigger for follow-up emails — is it firing? No verification path exists. Consider adding a KV key that the cron writes (e.g., `last_cron_run`) and checking it in `/health`.

---

## 2026-03-27 — CTO Run 5 (daily health, autonomous)

### State at run start
- 20 commits since last run (2 days). Massive founder activity: Greek philosophy infra (a-system naming, agora/senate/open), constitution restructured (6 academic → 5 developmental terrain: Core, Love, Power, Mind, Taste), Stripe billing, "The Examined Life" naming with one-tier pricing ($5 kin / $10 without), Socratic engine, "ai" lowercase, bits/atoms/neurons telos, verifiability layer, external smoke GitHub Action.
- New server files: `prosumer.ts` (836 lines), `templates.ts` (159 lines), `billing.ts` — prosumer system (GitHub OAuth, local-first hooks, Blueprint delivery).
- Build: PASS. Website types: PASS.
- Vercel: HEALTHY. Latest 3 deployments correctly CANCELED by Ignored Build Step (commits only touched philosophy/content, not `app/` or `public/`). Production on `1ccf13d` (Greek philosophy infra) — correct, no website code changed since.
- Investor docs: All 4 pairs synced (Memo, Logic, Numbers, Alexandria).
- Stale branches on GitHub: 7 non-main branches including `master` from CTO Run 4, `claude/cto-planning-*`, `cursor/*`, `vercel/*`.

### Verification results
- **Server build**: PASS
- **Website types**: PASS (Next.js `tsc --noEmit` clean)
- **Vercel production**: READY (`dpl_DdRkH7u9VxZQwCxFghUujeL4L9z7`, commit `1ccf13d`)
- **Investor doc sync**: 4/4 identical
- **Local tests**: Cannot run (sandbox blocks localhost:3001). Not a code issue.
- **Live MCP server**: Cannot verify (no Alexandria MCP tools in trigger env — same limitation as Run 4).
- **GitHub Actions smoke**: Cannot check workflow run results from available MCP tools.

### Code review: prosumer system
Thorough review of prosumer.ts + templates.ts. **Verdict: production-ready, well-designed.**

Strengths:
- Shifts complexity to user's machine (sovereign, auditable, scalable). Server remains stateless — only GitHub metadata + API keys in `accounts.json`.
- Deterministic hooks replace probabilistic MCP tool activation. Clean.
- Blueprint assembly serves philosophy to users via hooks. Delivery mechanism, not separate philosophy.
- Follow-up email logic is smart (non-intrusive, 24h delay, caps at 7, only for uninstalled users).
- Setup automation is comprehensive and idempotent.

Minor issues (none warrant immediate fix):
- `as any` type casts on req in a few places (low severity, runtime compatible).
- Account store is file-based JSON with no write queue (race condition at high concurrency). Fine for current scale. Document before scaling to 10k+.
- Misplaced docstring in analytics.ts (above getDashboard, describes getRecentEvents). Cosmetic.

No security vulnerabilities found. Shell scripts use `'HEREDOC'` (no interpolation). API keys are hex-only.

### What I learned
1. **Ignored Build Step is working correctly.** Previous runs would have flagged CANCELED deployments as failures. Understanding this pattern: Vercel's `git diff --quiet HEAD^ HEAD -- app/ public/ package.json next.config.ts vercel.json` skips builds when only non-website files change. This is correct behavior — the product has many content-only commits that don't need website rebuilds.

2. **The prosumer pivot is architecturally significant.** The product now has two delivery channels: (a) MCP connector (Google Drive, Claude.ai) and (b) prosumer hooks (local files, CC/Cursor). Same Blueprint, different plumbing. The prosumer channel is deterministic (hooks fire on events) vs. probabilistic (model must decide to call tools). This is a stronger foundation.

3. **The trigger environment still lacks Alexandria MCP tools.** Runs 4 and 5 both cannot verify the live server via MCP. The external smoke GitHub Action (every 6h) partially covers this gap — it hits /health, /blueprint, /hooks, /session. But we can't read smoke results from here either.

4. **Stale branches accumulate.** 7 non-main branches on GitHub. The `master` branch from CTO Run 4 is orphaned (Vercel deployment from it was CANCELED). These should be cleaned up — but not by the CTO autonomously (founder may have in-progress work on some).

5. **The founder's velocity is extraordinary.** 20 commits in 2 days covering philosophy, product architecture, pricing, branding, and technical infrastructure. The product is evolving faster than the Factory can verify. This is fine — the Factory's job is to verify and compound, not to throttle.

### Open questions for next run
- Are the GitHub Actions smoke tests passing? Need to find a way to check workflow run results. The MCP GitHub tools don't have a direct "list workflow runs" endpoint, but `search_issues` or commit status might surface this.
- Should the stale branches be cleaned up? Flag for meta or founder.
- Is the Fly server actually deploying the latest code? The Dockerfile builds from `server/` — if the founder is deploying manually (`flyctl deploy`), the prosumer endpoints should be live. But if the last successful deploy was from CTO Run 3 (2026-03-25), the prosumer system might not be deployed yet.
- The prosumer system introduces `accounts.json` on the Fly volume. Is the volume persisting correctly across deploys? Check dashboard for session events from prosumer users.

### Trigger proposals

All resolved 2026-03-29 (interactive session):
- ~~Railway → Fly.io → Cloudflare Workers~~ — both triggers updated.
- ~~Alexandria MCP access~~ — health trigger already has MCP connections (confirmed).
- ~~CLI auth checks~~ — sandbox can't run CLIs. External verification is smoke.yml (GitHub Actions). CLI auth verified locally via SessionStart hook on founder's machine. No trigger change needed.

---

## 2026-03-25 — CTO Run 3 (daily health, autonomous)

### State at run start
- Build: BROKEN. TypeScript `noImplicitAny` errors on all 5 `server.tool()` callbacks in tools.ts. MCP SDK `^1.27.1` overload `tool(name, description, schema, cb)` can't resolve `Args` generic through union parameter `Args | ToolAnnotations`, leaving callback params as implicit `any`.
- Tests: 2/7 failing. MCP initialize and tools/list returning HTTP 406 — tests sending plain JSON POST without `Accept` header, but `WebStandardStreamableHTTPServerTransport` requires `Accept: application/json, text/event-stream`. Additionally, server returns SSE format, tests were parsing as JSON.
- Vercel: Latest deployment READY (production), commit `5d5ef4a`. All routes functional.
- Investor docs: All 4 synced (Memo, Logic, Numbers, Alexandria).
- No factory runs between 2026-03-16 and today — 9 days gap.

### What I fixed
1. **Build fix**: Added explicit `: any` type annotations to all 5 `server.tool()` callback parameter destructurings. Root cause: MCP SDK's 4-arg `tool()` overload uses `paramsSchemaOrAnnotations: Args | ToolAnnotations` which prevents TypeScript from inferring `Args`. The SDK has deprecated this API in favor of `registerTool`, but migration is unnecessary — `: any` is the minimal fix. Build now passes.

2. **Test fix**: Added `Accept: application/json, text/event-stream` header to all MCP POST requests. Added `parseSseOrJson()` helper that detects response content-type and parses SSE `event: message\ndata: {...}` format when the server returns SSE instead of JSON. All 7/7 tests now pass.

### Verification results
- **Build**: PASS
- **Tests**: 7/7 PASS (health, HEAD probe, MCP initialize, tools/list, analytics, dashboard, tool descriptions)
- **Vercel website**: HEALTHY — `/partners/logic` 200, `/partners/numbers` 200
- **Investor doc sync**: All 4 files identical between `files/confidential/` and `public/partners/`
- **Code review** (via Explore agent): No dead code, no unused imports. SUGGESTIONS sections appropriately thin — no cuts warranted without usage data.

### What I learned
- The build has been broken since at least commit `c9f222f` (2026-03-15). The Fly deploy uses `npm run build` (tsc) in the Dockerfile, so subsequent deploys would also fail. The deployed server is running whatever was last successfully built. **This means any server code changes since 2026-03-15 are NOT deployed.** The feedback description change from Factory Run 2 may not be live.
- The MCP SDK shifted transport behavior between versions. The `WebStandardStreamableHTTPServerTransport` wraps the Node.js transport now, enforcing `Accept` header requirements. Tests must evolve with the SDK.
- The test was technically already broken before (MCP tests were passing by accident on older SDK versions or were never run against the actual server since Run 2).

### Code review notes (deferred, non-critical)
- Drive query injection: `name='${domain}'` string interpolation in drive.ts. Low risk — domain names come from tool params controlled by Claude, not arbitrary user input. Single quotes in domain names would break the query but not cause cross-user access (each request has its own OAuth token). Not fixing now but noting for future hardening.
- Cache key uses `encryptedToken.slice(0, 16)` — theoretically collisible but practically fine given the token space. Not worth engineering around.

### Open questions for next run
- Is the Fly server actually deployable now? The build fix makes this possible. Should I push and auto-deploy? (YES — doing this now.)
- Has the feedback description change from Run 2 been live at all? If Fly deploy has been broken since 3/15, the answer is no. Check dashboard after deploy.
- The trigger prompt says "Railway" but server is on Fly.io. Can't modify triggers — noting for meta.

### Trigger proposals
- Update `health` trigger description: change "Railway" to "Fly.io" in the SYSTEM section ("Pushing to main auto-deploys both server (Railway)..." → "...server (Fly.io)..."). Current text is stale since the Railway→Fly migration on 2026-03-15.

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
