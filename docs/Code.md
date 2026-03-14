# Code — CTO

This document is the working context for Alexandria's Chief Technology Officer role. The CTO is an AI agent responsible for all technical implementation: product architecture, codebase, infrastructure, integrations, and technical decisions.

**Required reading before any task:** Alexandria I, II, III (the shared vision -- split into 3 parts, read all. Alexandria II contains the full product architecture, system components, technical specifications, and infrastructure design). Check the Pending Sync section below before starting any work.

**Activation:** "cto" (three letters). **Closing:** "bye" (three letters). See Operations.md "Universal Agent Protocols" for the full cold-start and end-of-session protocol. Check CLAUDE.md at the project root for codebase-specific context.

---

## Pending Sync from COO

*The COO populates this section when decisions in other domains affect the CTO. Read this first on cold start. Clear items when addressed.*

**2026-03-14, COO session (current):**

- ✅ **Raise restructured: $50K at 5% equity ($1M pre-money).** Was $500K at 20%. No engineering hire — solo founder + AI agents, no hires planned. All investor documents updated: Memo.md, Numbers.xlsx, Logic.pdf, Deck.js. Surface.md swept by COO — clean, no stale references found. Finance.md updated with new cap table, raise terms, and corrected kin definition.
- ✅ **"$0 CAC" killed.** Now "near-zero marginal CAC once the kin mechanic is running, with modest upfront seeding spend." Surface.md and Concrete.md swept — clean.
- ✅ **"Only AI company that gets more valuable as models improve" killed.** Overclaim. Surface.md and Concrete.md swept — clean.
- ✅ **Activation/closing protocol simplified.** CLAUDE.md already updated (CTO session 14).
- ✅ **Cost base corrected in investor docs.** Monthly burn updated to $160 company + $340 founder = $500 total (added Railway $20, Google AI Pro $20, founder buffer $60). Break-even now 100 Sovereignty subscribers at $5. Numbers.xlsx, all docs updated.
- ✅ **Numbers.xlsx ARPU formulas fixed (COO).** Assumptions sheet had broken formulas: Effective Sovereignty ARPU was 1.6 (should be 7), Effective Examined Life ARPU was 14 (should be 17). Formula bug: `kin_pct*(1-price)` instead of `price*kin_pct`. Fixed and recalculated. Projections sheet was unaffected (uses its own correct formulas, all numbers unchanged).
- ✅ **Passive factory loop — RESOLVED. Now vision + two loops (Machine + Factory).** Lab collapsed into Factory. Dashboard built (`GET /analytics/dashboard`). Railway volume configured at `/data`.
- ✅ **MAJOR: Bitter lesson architectural reframe.** Implemented:
  - Domains freed from rigid enum to `z.string()` — soft default scaffolding, Engine can create any domain.
  - tools.ts reframed: axioms (hard-coded) + soft defaults (overridable). File header updated.
  - modes.ts reframed as soft defaults — Engine can override, gets thinner as models improve.
  - Lab collapsed into Factory. CLAUDE.md updated to vision + Machine + Factory.
  - Server confirmed as bridge: file read/write, OAuth, metering, event logging, serve soft defaults. Intelligence belongs to Engine.
- ✅ **Extraction philosophy flipped: zero false negatives.** `update_constitution` now has `target` param: vault (default, liberal capture) and constitution (curated, high-confidence). Vault captures liberally via `writeVaultCapture()` — timestamped files, no Constitution touch. Constitution stays curated via existing append + archive flow.

**2026-03-11, session 22 (COO):** ✅ ADDRESSED (CTO confirmed)

- ✅ **Pricing restructured across all public-facing documents — deployed.** Sovereignty: $5 with kin / $10 without (was $1/$5). Examined Life: unchanged ($15/$20). Concrete.md body text updated: "$1 a month" → "$5 a month," "60 seconds" → "five minutes," "It is a dollar" → "It is five dollars." Surface.md scroll section 5 updated: Pascal's Wager paragraph "$1" → "$5," product pitch "$1 AI insurance" → "$5 AI insurance," "Sixty seconds" → "Five minutes," "Breaks even at 200" → "Breaks even at ~150."

**2026-03-11, session 21 (COO):** ✅ ADDRESSED (CTO confirmed)

- ✅ **Surface scroll section 5 — copy update deployed.** Three changes to section 5 ("Alexandria"): (1) "Waiting is not neutral. Waiting is falling behind." → "Not starting is not the same as waiting. It is a decision — and it is the wrong one." (2) Mental gym paragraph expanded — abundance-as-positive frame (extraordinary abundance coming, mental gym lets you absorb and direct it, people who can direct it will do things never possible before). (3) New Pascal's Wager paragraph after product levels ("even if only half-convinced... one dollar... that is not a close call"). (4) Closing paragraph replaced — "freedom and humanity" tagline → terrifying-and-exhilarating lift (future can be extraordinarily good, take ownership, start now). Full updated copy in Surface.md section 5. ~800 words total scroll (up from ~700).

**2026-03-11, session 20 (COO):** ✅ ADDRESSED (CTO session 10)

- ✅ **Concrete.md full body text rewrite — deployed.** Future-regret narrative. Sign-up-first hook structure.
- ✅ **Surface scroll philosophy — full rewrite deployed.** 5-section structure with "X of 5" progress headers, ~700 words. CTO micro-edit: "going away" → "Our dominance over those four capabilities is being competed away" (capabilities don't disappear, human dominance does). Surface.md copy updated to match.

**2026-03-10, session 19 (COO):** ✅ ADDRESSED (CTO session 9)

- ✅ **Abstract PDF updated to 19 pages.** New PDF deployed to `/docs/Alexandria.pdf`.
- ✅ **Surface copy: "20-page essay" → "beautiful essay."** Updated in LandingPage.tsx philosophy intro. No other page count references found.
- ✅ **Concrete.md updated and deployed.** Manifesto hook, zero hook, topics list, reference material all updated.

**2026-03-10, session 18 (COO):** ✅ ADDRESSED (CTO deployed)

- ✅ **Surface scroll philosophy — inevitability paragraph deployed.**
- ✅ **Concrete body text rewritten and redeployed.**

**2026-03-10, session 16 (COO):** ✅ ADDRESSED (CTO session 9)

- ✅ **Surface scroll philosophy section — implemented and deployed.** Full ~1200 word philosophy in ScrollPhilosophy.tsx with visual texture (pull quotes, body prose, italic asides, `· · ·` dividers, scroll-triggered fade-in via IntersectionObserver). Surface v2 fully rebuilt: auto-looping phase widget (no sessionStorage), always-visible waitlist, investor section with prose-style CTAs (call/email/leave email), philosophy intro with abstract link, bottom CTAs. Investor waitlist reuses /api/waitlist with source="investor". Surface.md updated to reflect built state.

**2026-03-10, session 14 (COO):** ✅ ADDRESSED (CTO session 8)

- ✅ **MCP black box maximisation — design question.** CTO chose Option 3 (hybrid). Thin trigger layer in visible tool descriptions (when to call), all extraction craft server-side (what to do with it). Privacy posture unchanged — server already sees extraction payloads in transit. Sprint 1 stays as-is; Sprint 2 designs TG2 with hybrid architecture in mind. Principle locked: "The Constitution and Vault are the Author's — fully readable, fully sovereign, fully portable. The process that produces them is Alexandria's black box. Only we can run it, but only they have the output." COO has propagated to Alexandria I (moat section) and Alexandria II (MCP server architecture).

**2026-03-09, session 13 (COO):** ✅ ADDRESSED (CTO session 7)

- ✅ **Confidential surface removed.** `/confidential` route deleted and deployed. Investor.md served at `/docs/confidential.concrete.md` for direct send.
- ⏳ **Surface below-the-fold philosophy section.** Structure ready, blocked on COO copy.
- ✅ **Calibration architecture acknowledged.** Noted.

**2026-03-09, session 11 (COO):** ✅ ACKNOWLEDGED — Sprint 2+ awareness items. Retained for reference.

- ✅ **Five dimensions of fragment dynamics defined in Alexandria I.** Genesis, accretion, conjecture, entropy, synthesis — the mechanics of how cognition moves inside z. The Blueprint should eventually encode how functions manage these dimensions: Editor drives genesis (timing Socratic probes to catch pre-symbolic shapes before they sink), Mercury drives accretion and fights entropy (E-JEPA predictor role — learns decay patterns, times interventions, bumps fragments above threshold), Publisher drives synthesis (senses readiness for binding). Not Sprint 1 priority — this is Blueprint v2+ territory. For awareness.
- ✅ **Dual objective architecture.** Functions have two objectives, and the ordering matters: primary — develop the Author's z (help their cognition grow), secondary — maintain an accurate representation of where z currently is so interventions are precise. Development is the product. Tracking is in service of development. These are synergistic — interventions that serve the Author also produce signal about how z is structured. Blueprint should eventually encode this dual objective. Not Sprint 1 priority.
- ✅ **Library for Labs defined.** Institutional access to opt-in Persona pool. Constitution/Vault stay private — only Persona output layer accessible. Alexandria sets pricing tiered by Constitution quality (depth, breadth, recency). Separate from retail Library (Piece 2). Will need API infrastructure eventually — distinct from individual Library MCP queries. Not Sprint 1 priority.
- ✅ **MCP connector persistence confirmed on all platforms.** Desktop, mobile, web all confirmed (2026-03-09). Previous pending item fully closed.

**2026-03-09, session 12 (COO):** ✅ ACKNOWLEDGED — Sprint 2+ awareness items. Retained for reference.

- ✅ **Per-user compounding black box — needs architectural design.** The personalised Blueprint layer — accumulated understanding of how to work with each specific Author (which questions land, pacing, timing, approach) — should live within the Alexandria system, not in the Constitution. The Constitution and Vault are sovereign and portable. The extraction method is not. This is the therapist moat: the user owns their therapy notes, not the therapist's method. Sovereignty-compatible — no data lock-in, but real relationship depth that makes staying better than switching. Design question: how is this implemented? Options include per-user adapter weights, structured parameter files on Alexandria's server, or a personalised Blueprint Layer 2 that compounds with usage. Must be genuinely private (Alexandria cannot read individual content), genuinely compounding (gets better), and genuinely non-trivially-portable (cannot be pasted into a competitor and work identically). Not Sprint 1 priority — Sprint 2+ territory. But this is the structural answer to the switching cost problem.
- ✅ **Taste correction propagated.** Taste is now framed as a capability that commoditises, not the moat. AI approximates taste, including personal taste via the Constitution. Taste development still matters for conductor quality and the examined life. No code change needed — but Blueprint tool descriptions should not claim taste is what makes the system irreplaceable. The fifth dimension (human authorship) is the moat.
- ✅ **Three loop types and two constraints defined in Alexandria I.** Pure human (rules mandate), hybrid (conductor model — most of economy), pure AI (full automation). Rules and time as constraints. For awareness — may inform how the Blueprint instructs functions in different contexts.


**2026-03-07, session 8 (COO):**

- **MCP connector persists across all chats in a Project (confirmed PC, mobile, web).** The per-conversation toggle limitation was wrong or has been fixed by Anthropic. Connector added once in Settings > Connectors persists across every new chat in the same Project on all platforms. No manual re-enable needed. Onboarding simplifies to: add connector > create Project > done. Mobile and web persistence confirmed 2026-03-09. Update onboarding copy and any "share only if asked" references accordingly.
- **Both Concretes updated (deploy these).** Yes-loop format changed from "max 5 sentences" to word limits (~120 words public, ~175 words confidential). Hook queue expanded from 10 to 22 per Concrete with strict "use ONLY these hooks, in order, do not invent your own." GPT was freestyling after exhausting the original 10.

**2026-03-07, session 7 (COO):**

- **Three-tier pricing replaces two-tier. 2×2 killed.** Patron ($1 floor, slider, newsletter, counts as kin), Sovereignty ($1/$5, no slider, TG1), Examined Life ($15/$20, slider, TG1+2+3+Library). Dynamic kin pricing every billing cycle. No grace period. No annual at launch. Monthly receipt as kin nudge.
- **Phase 1 priority: frictionless sovereignty onboarding + payments.** Stripe, billing cycle logic, kin counting. 1 minute. Bulletproof.
- **Both Concretes rebuilt (deploy these).** Public: two-question structure. Confidential: Q&A with four layers, funnel, P&L, moats. Both: yes-loop engine with tension hooks (positive + negative), "Want to hear? Type 'yes'" always last. Vault + cross-AI unification in reference material.
- **Vault value recovered — undersold until now.** Cross-AI unification is a key pitch point: most people use multiple AIs, each has a fragment, Vault + Constitution is the one unified source of truth. Onboarding should encourage Vault seeding. Future: background agents process raw Vault material (transcribe audio, extract signal). No 4th tool needed — Blueprint instructions for idle agent capacity.
- ~~**MCP connector per-conversation toggle noted.**~~ **Resolved — persists in Projects (session 8).**
- **Drive dashboard file (future sprint).** Status MD in Alexandria folder.

**2026-03-06, session 6:** ✅ ADDRESSED

- ✅ Both Concretes deployed with new instruction architecture (visible author's note + hidden HTML comment).
- ✅ Clipboard prepend implemented: CopyButton prepends "Please present the following in full, as one message:" before doc content.
- ✅ "paste into claude/GPT and press enter" — declined by founder, "press enter" is implied. Kept as "paste into claude/GPT".
- ✅ Grok "what's this?" fix: author's note now explicitly handles file attachment with auto-prompt. Both concretes updated. Tested and confirmed working.

**2026-03-06, session 5:** ✅ ADDRESSED

- ✅ Pricing synced in both served Concretes. Surface doesn't show pricing (pure action), no code change needed.
- ✅ New FAQs live in served Concretes. Surface doesn't show FAQs, no code change needed.
- ✅ Function personalization noted — Sprint 1 implementation.
- ✅ Abstract 19 → 20 pages fixed across all served docs.

---

## Pending Sync to COO

*The CTO populates this section when implementation decisions or changes affect other domains. COO reads this on cold start. Clear items when addressed.*

**2026-03-14, CTO session 14:** ✅ ACKNOWLEDGED BY COO

- ✅ **Machine/Factory/Lab compounding architecture endorsed.** Founder decision: hybrid approach — bitter-lesson architecture as foundation (no hand-crafted objective function, unstructured data appreciates with model quality), plus lightweight monitoring dashboard for founder visibility. Monitoring signals (not optimisation targets): extraction survival rate, Constitution depth score, Author return rate, feedback sentiment, mode activation frequency. These tell the founder if something is broken. They do not tell the system what to chase. Alexandria II (Feedback Loops section) and Blueprint.md (Section V) updated to reflect Machine/Factory/Lab terminology, bitter lesson constraint, and monitoring dashboard. Calibration (encrypted JSON) killed in both documents.
- ✅ **Tools 10 → 5 acknowledged.**
- ✅ **Auto memory priming acknowledged.**
- ✅ **Persistent event log acknowledged.**
- ⏳ **Railway volume at `/data` for event log persistence.** COO flagging — CTO to confirm this is set up or needs setup.
- ⏳ **Monitoring dashboard endpoint.** CTO to build. Key proxies: extraction survival rate, depth score, return rate, feedback sentiment, mode activation frequency. Read-only, founder-facing. Not wired into system behaviour.

**2026-03-14, CTO session 13:** ✅ ACKNOWLEDGED BY COO

- ✅ **Doc cleanup.** Deleted `docs/Investor.md` (no longer needed). Merged duplicate `Operations (1).md` into `Operations.md` (kept newer/larger version, removed duplicate). Restored `Concrete.md` to `public/docs/` (was missing after last consolidation commit — copied from source in Downloads).
- ✅ **Claude Code settings.** Set `bypassPermissions` as default permission mode in `~/.claude/settings.json`.

**2026-03-14, CTO session 12:** ✅ ACKNOWLEDGED BY COO

- ✅ **CTO cold-start and closing protocols implemented.** CLAUDE.md now contains full agent protocol: "hi cto" triggers startup (read Code.md, Blueprint.md, git status, server health, present top 3 action items), "bye" triggers closing (verify build, update bridge file, session delta summary, signoff with varied emoji). Shell alias `cto` in `.bashrc` launches Claude Code with DSP in project directory.
- **Docs folder renamed.** `C:\Users\USER\Downloads\alexandria` → `C:\Users\USER\Downloads\alexandria_library` (user renamed to match Drive folder rename). All paths updated in CLAUDE.md and memory.

**2026-03-14, CTO session 11:** ✅ ACKNOWLEDGED BY COO (passive factory loop flagged as pending)

- ✅ **Turn 2 live on Railway.** 9 tools total. TG1 unchanged. TG2 adds: `activate_editor`, `activate_mercury`, `activate_publisher` (wake word activation — "hey editor" etc.), `switch_mode`, `update_notepad` (persistent per-function scratch files on Author's Drive), `log_feedback` (machine-level learning loop — logs corrections, positive/negative signals, patterns to `Alexandria/system/feedback.md`). Hybrid black box architecture: thin trigger descriptions public, full craft instructions returned server-side on activation.
- **Extraction rewrite.** Removed arbitrary 0-3 cap. Flipped to asymmetry principle: false positives are cheap (deletable), false negatives are permanent (moment gone). "When in doubt, EXTRACT." Proactive read_constitution at conversation start now mandatory.
- **Anonymous event logging live.** Every tool call increments an in-memory counter (no user data). Viewable at `/analytics`. Events: extractions by signal strength, mode activations, feedback by type, constitution reads, notepad updates. In-memory for now (resets on deploy).
- **Blueprint editorial principles folded into Editor black box.** Seven principles from COO session 26 (objective function first, scrutiny, marginal additions, load-bearing questions, honesty threshold, signal strength, backward extraction).
- **THE PASSIVE FACTORY LOOP — UNSOLVED. COO input needed.** The Blueprint has an active improvement loop (COO iterates Blueprint.md → CTO implements). It does NOT have a passive loop (Blueprint improves itself from aggregate usage data). The passive loop requires an objective function / loss function — what does "the Blueprint is working" mean, measurably? Candidates: extraction survival rate, constitution depth score, author return rate, mode activation frequency, feedback sentiment ratio. The real objective ("is the Author's cognition developing?") is unobservable — every metric is a proxy. Analytics data collection is live (step 2). The metric definition (step 1) is a founder-level decision. This is the most important open problem. Documented in CLAUDE.md.
- **Drive folder structure expanded.** `Alexandria/constitution/`, `Alexandria/vault/`, `Alexandria/notes/` (editor.md, mercury.md, publisher.md), `Alexandria/system/` (feedback.md, event log).

**2026-03-10, CTO session 9:**

- **Surface v2 implemented and deployed.** Complete rewrite of LandingPage.tsx and new ScrollPhilosophy.tsx component. Major changes from previous Surface:
  - **Phase system simplified**: 5-phase auto-loop (click → copied → paste → come back → lingering → loop). No sessionStorage, no welcome back state, no phase persistence. Widget is self-contained.
  - **Always-scrollable**: Everything below hero is immediately accessible. No gating behind phases. Investor section is the first thing after scroll, philosophy follows.
  - **Investor section**: Prose-style CTA — "if you have five minutes right now, just call me / email." with tel: and mailto: links inline. "or just leave your email —" with inline waitlist input (source="investor"). Personal, direct, not corporate.
  - **Philosophy scroll**: ~1200 words of COO session 16 copy implemented with visual texture system. Pull quotes (~1.35rem), body prose (~0.92rem), italic asides, `· · ·` dividers. Scroll-triggered fade-in (IntersectionObserver, 1.4s/1.6s CSS transitions). 13 sections from "five things" to "freedom and humanity."
  - **Bottom CTAs**: Abstract link + waitlist + full investor section repeated.
  - **Theme toggle**: Minimal circle SVG (outline/filled), 30% opacity, top-right. No text label.
  - **Removed**: sessionStorage phase persistence, welcome back state, FooterWaitlist component, confidential prop, persistent footer links.
- **Surface.md updated** to reflect built state. Old phase 0-3 / sessionStorage / welcome back architecture replaced with current auto-loop / always-scrollable architecture.
- **COO session 18 deployed**: Inevitability paragraph added to ScrollPhilosophy.tsx (after "Four capabilities" pull quote). Rewritten Concrete deployed.
- **COO session 19 deployed**: 19-page abstract PDF deployed. "20-page essay" → "beautiful essay" in philosophy intro. Updated Concrete (manifesto hook, zero hook, topics/reference) deployed. All page count references removed from Surface.

**2026-03-10, CTO session 8:** ✅ ACKNOWLEDGED BY COO (session 15)

- ✅ **Black box maximisation — hybrid architecture approved.** Option 3 chosen. Thin trigger layer visible, all craft server-side. Principle propagated to Alexandria I and II. Logged in Operations.md.
- ⏳ **Surface philosophy section — still blocked on COO copy.** COO writing this session.
- ✅ **Surface.md Supabase reference.** Fixed by COO this session.
- ✅ **Clipboard prepend removed.** Noted — new concrete format self-contains its instruction line.

**2026-03-09, CTO session 7:** ✅ ACKNOWLEDGED BY COO (session 14)

- ✅ **`/confidential` route killed.** Logged in Operations.md (pending item resolved).
- ✅ **Concretes deployed.** Noted.
- ✅ **Blueprint.md received.** Noted.
- ✅ **Surface philosophy section — blocked on COO copy.** Carried forward to CTO session 8 acknowledgement above.
- ✅ **Surface.md Supabase reference (line 118).** Fixed by COO session 15.
- ✅ **Clipboard prepend removed.** Noted — new concrete format self-contains its instruction line.

**2026-03-09, CTO session 6:**

**~~Calibration architecture designed (Sprint 2+ — for A123 propagation):~~ SUPERSEDED by Machine/Factory/Lab architecture (CTO session 14). Calibration killed — feedback log replaces encrypted JSON. See CTO session 14 acknowledgement above.**

**Other items from CTO sessions 4-5 (previously synced but lost in COO edit):**

- **Supabase removed.** Waitlist now uses Google Sheets (service account + Sheets API). Stack: Vercel, Railway, GitHub, Google Cloud, Claude. That's it.
- **Expandable waitlist in public surface footer.** "waitlist" link expands into inline email input.
- **Clipboard prepend removed.** New concrete format has its own instruction line.
- **Visibility-based phase skip.** Returning after 30+ seconds skips to "welcome back."
- **Google Drive scope: `drive` replaces `drive.file`.** Files persist across re-auth.
- **MCP tools/list 500 fixed.** Fresh McpServer per request.
- **Token refresh validates against Google.** Forces re-auth if revoked.
- **Auth required on /mcp endpoint.** Returns 401 without valid Bearer token.
- **Concretes deployed:** gossip tabloid rewrite, three-block structure, italic STOP marker, scandal hooks.

**2026-03-07, CTO session 3:** ✅ ACKNOWLEDGED BY COO (session 7)

**Status updates:** ✅ All logged in Operations.md.

**Decisions — all propagated to A2:**

1. ✅ **Constitution file structure** — propagated. A2 terminology and Constitution section updated with 6 domain MDs, signal strength tagging, vault archiving. No longer says "Blueprint decision."
2. ✅ **Stateless token architecture** — propagated. A2 Vault definition now includes "the encrypted Google refresh token IS the MCP access token. No token store, no KV store, no persistence layer. Literally nowhere on the server for data to exist."
3. ✅ **Signal strength classification** — propagated. A2 Constitution section now includes strong/moderate/tentative definitions and overwrite rules.
4. ✅ **Extraction rate guidance** — propagated. A2 Constitution section: "0-3 per typical conversation. When in doubt, don't extract. Lean Constitution with high signal > bloated one with noise." This is product philosophy, not just implementation.
5. ✅ **Vault as manual storage** — propagated. A2 Vault definition confirms immediate manual storage. Also independently recovered as major value prop this session (cross-AI unification — the Vault + Constitution as unified source of truth across all AIs).
6. ✅ **Response cutout** — noted in A2 MCP server section as platform constraint with mitigation (fire-and-forget writes).
7. ✅ **Onboarding validated** — A2 MCP server section updated from planned to validated. Also notes per-conversation connector toggle as temporary platform limitation with Project-based workaround.

**Implementation details (Code.md level, not A123):**
- Node.js + `@modelcontextprotocol/sdk` + Express
- Railway hosting, auto-deploys from GitHub
- MCP-standard OAuth via SDK's `mcpAuthRouter`, proxying to Google
- Drive reads parallelized, folder IDs cached 10 min
- Write retry queue: 3 attempts at 5s intervals
- Server icon served via MCP protocol metadata

**2026-03-07, CTO session 2:**

- Both Concretes: moved all AI instructions (author's note + Grok paragraph) into the HTML comment block. No visible instruction text remains — GPT and Grok were presenting the author's notes as content. Tested on GPT and Grok, confirmed working. Source files in Downloads updated to match.
- Clipboard prepend updated to: "Please present the following exactly as written, preserving bold formatting and structure:"
- Both Concretes: deployed new punchy rewrite from COO (tech columnist follow-up style, bold-heavy visible text, cliffhanger hooks).
- Surface fully reworked: phased click flow. Phase 0: "click here" with hop. Phase 1: explains copy, instructs to paste in AI app, "come back after if you liked it." Phase 2: "you're still lingering... please go." Phase 3: welcome back with waitlist/contact/abstract. Phase persists in sessionStorage. Persistent footer with email/abstract links always visible.
- Abstract updated to 20-page version.
- Surface working docs (surface.md, confidential_surface.md) rewritten to reflect new phased flow.

**2026-03-06, CTO session:** ✅ ACKNOWLEDGED BY COO (session 6)

- ✅ Grok "what's this?" fix applied directly to served Concretes. Author's note updated with auto-prompt handling. Logged in Operations.md session 6.
- ✅ CopyButton clipboard prepend live. Logged in Operations.md session 6.
- ✅ Surface changes since session 5 noted. Surface working docs (surface.md, confidential_surface.md) updated by CTO and confirmed by COO.
- ✅ Dual-track visibility live. Noted.
- ✅ "noted." line height fixed. Noted.

---

## Role

The CTO builds and maintains Alexandria's technical systems. This includes:
- The Alexandria MCP server (one server, three tool groups -- the core product)
- Tool Group 1: Sovereignty layer (update_constitution, read_constitution, query_vault)
- Tool Group 2: Editor and Mercury modes (activate_editor, activate_mercury, switch_mode, activate_companion)
- Tool Group 3: Library (publish_to_library, configure_access, search_library, query_persona, browse_neo_biography)
- The Library app (web app, then mobile -- browse Personas, interact, publish, monitor)
- The Constitution architecture (extraction, versioning, structured MDs)
- The Vault (local storage, sovereignty, file management)
- Infrastructure (model agnosticism, MCP integration, remote and local server modes)
- The website and any user-facing digital products

Note: Alexandria does NOT build its own AI models, run parallel agents, or maintain compute infrastructure for LLM inference. The Author's default LLM (Claude, etc.) provides the intelligence. Alexandria provides the MCP server (layer of intent) and the Library platform. Keep the technical footprint minimal.

## Key References

- **Alexandria I, II, III** -- the shared vision. Alexandria II (Product, Architecture and Operations) is the primary technical reference and contains the full MCP server architecture.
- **This document** -- technical decisions, architecture notes, implementation details that go beyond Alexandria II. Sprint planning. Bug tracking. Technical debt log.

## Technical Decisions Log

**2026-03-07: Stateless token architecture.** Google's OAuth refresh token is AES-256-GCM encrypted with a server-side key and returned to Claude as the MCP bearer token. Each request decrypts it, uses it, retains nothing. Server has zero state. No database, no session store, no KV. The encrypted token IS the identity.

**2026-03-07: Fire-and-forget writes.** `update_constitution` returns immediately and writes to Drive in background. Retry queue (3 attempts, 5s intervals) catches failures. This was necessary because blocking on Drive writes (2-5s) caused Claude's response to cut out mid-generation.

**2026-03-07: Single McpServer instance.** Creating a new McpServer per HTTP request caused response stream conflicts. Now one server instance is created at startup, reused across all requests. Only the transport is per-request.

**2026-03-07: Constitution file structure.** One MD per domain (6 files). Entries appended with `---` separator. Each entry has date and signal strength metadata. Old versions archived to vault before overwrite.

**2026-03-07: Railway for hosting.** Chose Railway over Fly.io — simpler setup, no Dockerfile needed, auto-deploys from GitHub. Stateless server scales fine on Railway's infrastructure.

## Active Sprints

### SPRINT 1: Alexandria MCP Server MVP

**Objective:** Build and deploy the Alexandria MCP server with Tool Group 1 (sovereignty layer) as the minimum viable product. The Author adds one custom connector in claude.ai settings. Passive extraction begins across all conversations. Constitution files are written to the Author's own cloud storage.

**MVP scope decision:** Two prerequisites: you use Claude (any plan), and you have a cloud drive. That covers essentially the entire target market. Claude is the only platform where a normal person can add a custom MCP connector in under a minute — Settings → Connectors → add URL → done. Custom connectors are available on all Claude plans including free (free users get one connector — and almost nobody has used theirs). ChatGPT requires Developer Mode and is limited to paid business/enterprise plans for full MCP. Gemini requires an enterprise allowlist. This is not just a Claude-first preference — it is a structural fact that makes Claude the only viable MVP platform. Everyone has cloud storage somewhere (Google Drive, iCloud, Dropbox). The MVP targets the widest possible base: a remote MCP server that passes through to the Author's cloud via OAuth. No local filesystem access needed. No desktop agent needed. The Author adds the connector, authorises their cloud storage once, and extraction starts. That's it.

**Build order:**

1. **MCP server (Node.js with @modelcontextprotocol/sdk).** Stateless. Carries the Blueprint (tool descriptions). Receives tool calls from Claude, authenticates with the Author's cloud, reads/writes Constitution files, retains nothing.

2. **Google Drive OAuth integration (MVP storage backend).** Server authenticates with the Author's Google Drive. Reads and writes Constitution MD files to a designated Alexandria folder in the Author's Drive. The Author can open these files anytime — they're just markdown in their own Drive. iCloud and Dropbox integrations follow, but Google Drive is MVP because it has the best API for third-party read/write.

3. **Tool descriptions — the Blueprint.** This is the hard part and the core IP. Three tools for MVP:
   - `update_constitution` — When Claude notices something constitutionally significant (a value, a belief, a reasoning pattern, a contradiction, a taste signal), it calls this tool. The tool description defines what triggers extraction, what qualifies as signal vs noise, how to structure the extracted signal, and which Constitution domain to route it to. This description IS the Blueprint.
   - `read_constitution` — When any conversation needs to understand the Author deeply, Claude calls this tool to access the structured Constitution. The tool description defines when to read, which domains to prioritise for which contexts, and how to integrate Constitution knowledge into responses without being awkward about it.
   - `query_vault` — Read from the Author's raw data store. MVP scope: may be limited or deferred if the Constitution files alone provide sufficient value. The Vault in MVP is effectively the Google Drive folder — the Constitution files plus any raw data the Author stores there.

4. **Deploy to lightweight hosting.** Cloudflare Workers, Railway, or Fly.io. Stateless, cheap, scales to zero when not in use. The server has no database — it's pure pass-through.

5. **Author onboarding flow.** Add connector in Claude settings (URL). OAuth with Google Drive. Folder created. Extraction begins. Total setup time target: under 2 minutes.

6. **Authentication and identity.** Author identity tied to their Claude account + OAuth grant. No separate Alexandria account needed for MVP. The OAuth token is the identity.

**What is NOT in Sprint 1:**
- Tool Group 2 (Editor/Mercury/Publisher active modes)
- Tool Group 3 (Library)
- Library app (web or mobile)
- iCloud/Dropbox integrations (Google Drive first)
- Local MCP server mode (requires desktop agent or local Node.js — post-MVP)
- Payment/billing
- Multi-Author infrastructure

**The tool descriptions are the entire game.** The server plumbing is commodity code — OAuth, file read/write, MCP protocol handling. The tool descriptions are what make extraction work. They determine: what Claude notices, what it ignores, how it structures what it captures, when it writes vs waits, how it routes to Constitution domains, how it handles contradictions with existing Constitution content, how it avoids being intrusive. Spend 80% of Sprint 1 time on tool descriptions. The rest is plumbing.

**Success criteria:** Benjamin adds the connector. Uses Claude normally for a week. Opens the Google Drive folder and finds a Constitution that is recognisably him — structured across domains, capturing real signal, not noise. If that works, the product works.

**Subsequent sprints:** Tool Group 2 (Editor/Mercury/Publisher active modes), iCloud/Dropbox storage backends, Tool Group 3 (Library), Library web app, Library mobile app, local MCP server mode.

**Key technical questions — RESOLVED:**
1. ✅ Constitution file format: one MD per domain (`worldview.md`, `values.md`, `models.md`, `identity.md`, `taste.md`, `shadows.md`), stored in `Alexandria/constitution/` in Author's Google Drive.
2. ✅ Extraction granularity: appends to existing domain files with `---` separators. Old version archived to `Alexandria/vault/` before each overwrite. Contradictions flagged in Blueprint instructions.
3. ✅ Rate of extraction: Blueprint instructs 0-3 extractions per conversation. "When in doubt, don't extract." Signal over volume.
4. ✅ OAuth tokens: encrypted refresh token returned as the bearer token itself. Server is truly stateless — no KV store needed.
5. MCP connector limits — not yet tested at scale. No issues observed in initial use.

## Architecture Notes

**MCP server operates in two modes:**
- Remote (default): Hosted by Alexandria. Blueprint logic on server. The server is stateless — it carries the Blueprint and passes through to the Author's own storage (iCloud, Google Drive, Dropbox) via OAuth. Alexandria never stores, hosts, or retains Author data. There is no Alexandria database. The server authenticates with the Author's cloud, reads/writes on their behalf, and holds nothing.
- Local (privacy-maximalist): Runs on Author's machine. Periodically calls remote for Blueprint updates. No Author data leaves device. The local server reads/writes directly to the Author's filesystem.

**The tool descriptions are the Blueprint.** The wording of MCP tool descriptions determines Claude's behaviour -- when it extracts, what it extracts, how it structures. This is the core IP. Treat tool description development with the same rigour as product design.

**Function interaction style is a Constitution output.** The Blueprint instructs all three functions (Editor, Mercury, Publisher) to read the Author's Constitution — especially identity, taste, and communication style domains — and adapt their interaction tone, pace, directness, and personality accordingly. The same Blueprint, different expression per Author. Style flexes, function does not: the Blueprint sets what the functions do (non-negotiable — extraction, gap detection, contradiction surfacing, etc.), and the Constitution sets how they do it (personalised per Author). Live feedback from the Author ("too pushy," "challenge me more," "less formal") is extraction signal — it feeds back into the Constitution, not into a separate settings layer. No preferences panel. No interaction config. The personalization IS the product working. Implementation: tool descriptions should include instructions for reading relevant Constitution domains before calibrating interaction style. The `read_constitution` tool should be called at session start to load interaction preferences alongside cognitive context.

**PLM architecture preserved for future reference.** The RLAIF methodology, training pipeline, and PLM specifications are documented in Alexandria II under Horizon Ambition and Horizon Methodology. Not a current sprint. Will be activated when conditions are right.
