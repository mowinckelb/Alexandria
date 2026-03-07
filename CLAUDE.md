# Alexandria — CTO Context

## What This Is
Alexandria is a sovereign cognitive identity layer that rides on the user's existing AI (Claude, GPT, etc). It does NOT run its own models or store user data. It adds structure (the Blueprint) and sovereignty (user-owned files) to existing AI conversations.

## Current State (2026-03-07)
The codebase is ~90% legacy from a previous prototype. The only live production code is:
- **Surface** (mowinckel.ai): phased click-to-copy flow → AI conversation → return for waitlist
- **Waitlist API**: Supabase backend, `/api/waitlist`
- **Served docs**: `public/docs/` (concretes, abstract, alexandria MDs)

Everything else (80+ API routes, 15+ page routes, chat UI, auth, billing, training, channels, machine, etc.) is legacy dead code awaiting cleanup.

## Architecture (from Alexandria I/II/III)
- **MCP server**: one server, three tool groups. Stateless. Carries the Blueprint. Passes through to user's own cloud storage via OAuth. No database.
- **Tool Group 1** (Sprint 1): `update_constitution`, `read_constitution`, `query_vault` — passive extraction
- **Tool Group 2** (Sprint 2): Editor, Mercury, Publisher — active modes
- **Tool Group 3** (Sprint 3): Library — publish, browse, query personas
- **Constitution**: structured MDs across 6 domains (Worldview, Values, Models, Identity, Taste, Shadows). User-owned files on their cloud storage.
- **Vault**: append-only raw data store on user's cloud storage.
- **Library**: marketplace of Personas. Web app. Revenue via query payments.

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
- **Waitlist**: `app/components/WaitlistSection.tsx` + `app/api/waitlist/route.ts`
- **Theme**: `app/components/ThemeProvider.tsx`
- **Styles**: `app/globals.css`

## Doc Pipeline
COO edits docs in Downloads → CTO reads, diffs, copies to `public/docs/`, updates surface MDs → commits and pushes. Two-way sync via `Code.md` (Pending Sync from/to COO sections).

## Naming Convention
Downloads uses underscores (`confidential_concrete.md`), served uses dots (`confidential.concrete.md`).

## Concrete Architecture
All AI instructions live inside HTML `<!-- -->` comments (invisible to presentation). No visible instruction text. Clipboard prepend: "Please present the following exactly as written, preserving bold formatting and structure:". Follow-ups use tech-columnist style with cliffhanger topic queues.

## Sprint Plan
1. **Clean up**: Delete legacy code. Keep only surface, waitlist, layout, docs.
2. **Sprint 1**: MCP server with Tool Group 1 (sovereignty layer). Node.js + @modelcontextprotocol/sdk. Google Drive OAuth. The Blueprint tool descriptions.
3. **Sprint 2**: Tool Group 2 (Editor/Mercury/Publisher active modes).
4. **Sprint 3**: Library web app + Tool Group 3.
