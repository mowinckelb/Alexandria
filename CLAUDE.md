# Alexandria — CTO Context

## What This Is
Alexandria is a sovereign cognitive identity layer that rides on the user's existing AI (Claude, GPT, etc). It does NOT run its own models or store user data. It adds structure (the Blueprint) and sovereignty (user-owned files) to existing AI conversations.

## Current State (2026-03-14)
- **Surface** (mowinckel.ai): phased click-to-copy flow → AI conversation → return for waitlist
- **Waitlist API**: Google Sheets backend (service account + Sheets API), `/api/waitlist`
- **Served docs**: `public/docs/` (concretes, abstract, alexandria MDs)
- **MCP Server** (Turn 2 — LIVE): `server/` directory. Deployed on Railway at `https://alexandria-production-7db3.up.railway.app`. 9 tools: TG1 (update_constitution, read_constitution, query_vault) + TG2 (activate_editor, activate_mercury, activate_publisher, switch_mode, update_notepad, log_feedback). Google Drive OAuth. Stateless. Anonymous event logging at `/analytics`.
- **Stack**: Vercel (website), Railway (MCP server), GitHub, Google Cloud (OAuth + Sheets), Claude. No other dependencies.

## MCP Server Architecture
- **Runtime**: Node.js + `@modelcontextprotocol/sdk` + Express
- **Auth**: MCP-standard OAuth via `mcpAuthRouter`, proxies to Google OAuth for Drive access
- **Stateless**: encrypted Google refresh token IS the access token. Server stores nothing.
- **Auth on /mcp**: returns 401 without valid Bearer token (forces OAuth flow)
- **Token refresh**: validates against Google before returning (forces re-auth if revoked)
- **Drive scope**: `drive` (not `drive.file` — files must persist across re-auth)
- **Drive**: Constitution files in `Alexandria/constitution/` (6 domain MDs), versioned archives in `Alexandria/vault/`
- **Fresh McpServer per request**: `connect()` can only be called once per instance
- **Deployment**: Railway, auto-deploys from GitHub `main` branch, root dir `server`
- **Key files**: `server/src/index.ts` (entry), `server/src/tools.ts` (Blueprint — core IP), `server/src/modes.ts` (black box mode instructions), `server/src/drive.ts` (Drive read/write), `server/src/analytics.ts` (anonymous event logging), `server/src/auth.ts` (OAuth provider), `server/src/crypto.ts` (token encryption)
- **Drive folder structure**: `Alexandria/constitution/` (6 domain MDs), `Alexandria/vault/` (versioned archives), `Alexandria/notes/` (per-function notepads), `Alexandria/system/` (feedback log, future calibration)

## Key Principles
- Build as little as possible. Ride existing infrastructure.
- Model agnostic. Claude-first for MVP (only platform with easy MCP connector).
- Stateless server. No database. No retained user data. Structural, not policy.
- User owns their data (Constitution, Vault). If Alexandria dies, users keep all files.
- The Blueprint (tool descriptions) is visible to AIs (that's how MCP works). Not secret IP — first-mover + iteration speed.
- The Calibration file (Sprint 2+) encrypted with our key is the structural moat.

## File Locations
- **Project docs**: `C:\Users\USER\Downloads\alexandria\` (Alexandria I/II/III, Code.md, concretes, surfaces, constitutions)
- **Served docs**: `public/docs/` (copied from Downloads, deployed via git push)
- **Surface component**: `app/components/LandingPage.tsx`
- **MCP server**: `server/src/`

## Doc Pipeline
COO edits docs in Downloads → CTO reads, diffs, copies to `public/docs/`, updates surface MDs → commits and pushes. Two-way sync via `Code.md` (Pending Sync from/to COO sections).

## Naming Convention
Downloads uses underscores (`confidential_concrete.md`), served uses dots (`confidential.concrete.md`).

## Calibration Architecture (Sprint 2+)
Per-user compounding layer — how Alexandria learns to work with each Author.
- **File**: `Alexandria/system/calibration.enc` on user's Google Drive
- **Content**: ~100-200 numerical parameters (probe effectiveness, directness tolerance, pacing, challenge threshold, etc.)
- **Encrypted** with key only Alexandria's server holds. User can't read it. Competitor can't read it.
- **Compounds**: Blueprint instructs AI to read at session start, observe during session, update at session end
- **Sovereignty**: Constitution/Vault = user's data (portable). Calibration = Alexandria's craft (stays with us). Therapist analogy.
- **General compounding**: opt-in anonymized aggregate patterns improve the Blueprint for everyone. Flywheel.
- **No new infra for per-user files** — uses existing Drive connection. Aggregate analytics on Railway.

## The Passive Factory Loop — UNSOLVED
The Blueprint has two compounding loops:
- **Active loop** (working): COO iterates Blueprint.md from experience → CTO implements → deploys. Manual. Scales with founder time.
- **Passive loop** (MISSING): Blueprint improves itself across all users based on observable metrics. Requires:
  1. **An objective function / loss function** — what does "the Blueprint is working" mean, measurably? Candidates: extraction survival rate, constitution depth score, author return rate, mode activation frequency, feedback sentiment ratio. The real objective ("is the Author's cognition developing?") is unobservable. Every metric is a proxy.
  2. **Data** — anonymous event logging now live at `/analytics` (extraction counts, mode activations, feedback types). In-memory, resets on restart. Raw material for defining the metric.
  3. **A mechanism** that adjusts the Blueprint based on that data. Not built. Can't build until the metric is defined.

This is the most important open problem. Without it, the Blueprint only improves as fast as the founders can iterate. With it, the Blueprint improves from every conversation every user has.

## Backlog & Ideas
- **Passive factory loop objective function** — founder-level decision (see above)
- Calibration implementation (Turn 2.5 — see architecture above)
- Constitution compaction (merge old entries, deduplicate, resolve contradictions)
- iCloud/Dropbox storage backends
- Local MCP server mode (privacy-maximalist, no data leaves device)
- Tool Group 3: Library (publish, browse, query personas)
- Vault versioning UI: see how Constitution evolved over time
- Drive folder rename warning in onboarding (folder must be named "Alexandria")
- Persistent analytics (current in-memory counters reset on deploy)

## Turn Plan
1. ~~**Phase 0**: Delete legacy code~~ ✅ Done
2. **Turn 1**: MCP server with Tool Group 1 ✅ Live on Railway
3. **Turn 2**: Tool Group 2 (Editor/Mercury/Publisher active modes + feedback loop + analytics) ✅ Live on Railway
4. **Turn 3**: Library web app + Tool Group 3
