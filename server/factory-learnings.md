# Factory Learnings

Persistent memory for the autonomous CTO system (health + meta triggers). Each run reads, reflects, adds. Meta compresses old runs into principles weekly — keeps the file short enough that agents get signal, not noise.

---

## Distilled principles (compressed from runs 1-5, 2026-03-15 to 2026-03-27)

1. **Migration cascades are real.** Infrastructure changes (Railway → Fly → Cloudflare) scatter references across aN, aX, tests, served content, trigger prompts. Always grep all downstream after any migration. The meta run exists to catch what health misses.

2. **Tool descriptions drive behavior without memory.** Claude calls Alexandria tools from tool descriptions alone — no memory priming needed. The product works from session 1. Sovereignty doesn't depend on setup.

3. **Feedback arm needs proactive triggers.** Reactive-only log_feedback produced zero events. Added end-of-session timing anchor. Pattern: every event type needs at least one proactive trigger, not just reactive ones.

4. **public/docs/ is NOT a symlink.** CLAUDE.md claims it is. It's a regular directory that drifts. Health trigger now checks for drift. Making it a real symlink may break Vercel — investigate.

5. **Sandbox blocks curl and CLIs.** External HTTP verification lives in smoke.yml (GitHub Actions, every 6h). Triggers do code analysis + MCP-based verification + git-based checks. Accept this split cleanly.

6. **Ignored Build Step is correct.** Vercel CANCELED deployments on content-only commits are expected, not failures. `git diff --quiet HEAD^ HEAD -- app/ public/ package.json next.config.ts vercel.json` controls this.

7. **Philosophy velocity exceeds verification velocity.** The founder evolves thesis faster than the system can track. This is fine — the Factory's job is to verify and compound, not to throttle.

8. **Prosumer channel is deterministic.** Hooks fire on events (deterministic) vs MCP connector (model decides = probabilistic). Stronger foundation. Same Blueprint, different plumbing.

9. **Background vault processing.** Watch for: Anthropic agent scheduling, MCP scheduled triggers, Google Drive push notifications API. The moment any path exists to "watch a folder and process new files autonomously" — implement immediately.

10. **Consumer MCP model abandoned.** Auth broken on Workers (WorkerTransport doesn't inject authInfo). Founder: "i dont like consumer." Left as dead code path.

---

## 2026-03-29 — Meta Run 1 (weekly evolution, autonomous)

### What the week showed
- Infrastructure matured: Railway → Fly → Cloudflare Workers. Serverless, 241 KiB, zero idle cost, $100/month. Bitter lesson applied to infra.
- Mercury scan system alive: daily three-tier agent processing producing structured fragments in vault_intake/.
- Philosophy velocity: data-and-intent principle, Shadow rename, Library reframe, PT metaphor, accretion mechanics — all crystallised a0→aN.

### What was fixed
1. Stale Fly.io references — 5 locations across aN, aX, Memo.md, Concrete.md
2. public/docs/ sync — Concrete.md and Vision.md had stale content + uppercase "AI"
3. public/partners/ sync — Memo.md resynced after opex fix
4. Test default port — 3001 → 8787 (wrangler dev)
5. Analytics log test added (was the only untested analytics route)

### Verification gaps
- 48% of routes lack automated tests (OAuth, billing, Drive init, cron, GitHub callback). Smoke covers happy path. These routes exercise via real user flows.
- Mercury scans have no verification mirror — added to health trigger as soft default.

### Trigger proposals
All resolved 2026-03-29 (interactive session):
1. ~~Fly.io → Cloudflare Workers~~ — both triggers updated
2. ~~Mercury freshness + public/docs sync + smoke workflow~~ — added to health as soft defaults
3. ~~OAuth discovery smoke~~ — already in smoke.yml
4. ~~CLI auth checks~~ — sandbox can't, smoke.yml handles external, SessionStart hook handles local

### Open questions
- Cron trigger for follow-up emails — is it firing? Consider KV key `last_cron_run` in /health.
- SUGGESTIONS thinning — need feedback event data first.
- Vercel DNS now monitored in smoke.yml (added 2026-03-29 after founder discovered misconfiguration).

---
