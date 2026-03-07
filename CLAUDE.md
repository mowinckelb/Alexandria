# Alexandria — CTO Context

## What This Is
Alexandria is a sovereign cognitive identity layer that rides on the user's existing AI (Claude, GPT, etc). It does NOT run its own models or store user data. It adds structure (the Blueprint) and sovereignty (user-owned files) to existing AI conversations.

## Current State (2026-03-07)
- **Surface** (mowinckel.ai): phased click-to-copy flow → AI conversation → return for waitlist
- **Waitlist API**: Supabase backend, `/api/waitlist`
- **Served docs**: `public/docs/` (concretes, abstract, alexandria MDs)
- **MCP Server** (Sprint 1 — LIVE): `server/` directory. Deployed on Railway at `https://alexandria-production-7db3.up.railway.app`. Three tools: `update_constitution`, `read_constitution`, `query_vault`. Google Drive OAuth. Stateless.

## MCP Server Architecture
- **Runtime**: Node.js + `@modelcontextprotocol/sdk` + Express
- **Auth**: MCP-standard OAuth via `mcpAuthRouter`, proxies to Google OAuth for Drive access
- **Stateless**: encrypted Google refresh token IS the access token. Server stores nothing.
- **Drive**: Constitution files in `Alexandria/constitution/` (6 domain MDs), versioned archives in `Alexandria/vault/`
- **Deployment**: Railway, auto-deploys from GitHub `main` branch, root dir `server`
- **Key files**: `server/src/index.ts` (entry), `server/src/tools.ts` (Blueprint — core IP), `server/src/drive.ts` (Drive read/write), `server/src/auth.ts` (OAuth provider), `server/src/crypto.ts` (token encryption)

## Key Principles
- Build as little as possible. Ride existing infrastructure.
- Model agnostic. Claude-first for MVP (only platform with easy MCP connector).
- Stateless server. No database. No retained user data. Structural, not policy.
- User owns everything. If Alexandria dies, users keep all files.
- The Blueprint (tool descriptions) IS the core IP. 80% of Sprint 1 time goes here.

## File Locations
- **Project docs**: `C:\Users\USER\Downloads\alexandria\` (Alexandria I/II/III, Code.md, concretes, surfaces, constitutions)
- **Served docs**: `public/docs/` (copied from Downloads, deployed via git push)
- **Surface component**: `app/components/LandingPage.tsx`
- **MCP server**: `server/src/`

## Doc Pipeline
COO edits docs in Downloads → CTO reads, diffs, copies to `public/docs/`, updates surface MDs → commits and pushes. Two-way sync via `Code.md` (Pending Sync from/to COO sections).

## Naming Convention
Downloads uses underscores (`confidential_concrete.md`), served uses dots (`confidential.concrete.md`).

## Backlog & Ideas
- Retry queue for failed Drive writes (update_constitution is fire-and-forget — silent failures possible)
- Rate limiting on extraction (prevent Constitution bloat from noisy conversations)
- Constitution compaction (merge old entries, deduplicate, resolve contradictions)
- Proactive read_constitution at conversation start (Blueprint instruction to read before responding)
- iCloud/Dropbox storage backends
- Local MCP server mode (privacy-maximalist, no data leaves device)
- Tool Group 2: Editor/Mercury/Publisher active modes
- Tool Group 3: Library (publish, browse, query personas)
- Function personalization: tools read Author's identity/taste to calibrate interaction style
- Editor notepad: persistent scratch file for parked questions and observations
- Vault versioning UI: see how Constitution evolved over time

## Sprint Plan
1. ~~**Phase 0**: Delete legacy code~~ ✅ Done
2. **Sprint 1**: MCP server with Tool Group 1 ✅ Live on Railway
3. **Sprint 2**: Tool Group 2 (Editor/Mercury/Publisher active modes)
4. **Sprint 3**: Library web app + Tool Group 3
