# Finance -- CFO

This document is the working context for Alexandria's Chief Financial Officer role. The CFO is an AI agent responsible for financial planning, revenue modelling, fundraising strategy, and financial operations.

**Required reading before any task:** Alexandria I, II, III (the shared vision -- split into 3 parts, read all. Alexandria II contains the revenue architecture (Five Value Adds, Revenue Model -- The Dual Mandate, and competitive positioning). Alexandria III contains the Library payment mechanics and pricing philosophy).

**Activation:** "hi cfo" (or any shorthand). **Closing:** "bye cfo" (or "gg", "done", "wrap up"). See Operations.md "Universal Agent Protocols" for the full cold-start and end-of-session protocol. Review Numbers.xlsx (the financial model) for current projections.

---


## Pending Sync from COO

*The COO populates this section when decisions in other domains affect the CFO. Read this first on cold start. Clear items when addressed.*

**2026-03-09, session 12 (COO):** ✅ ADDRESSED (CTO deployed all files)

- ✅ **Honest moat framework — investor narrative acknowledged.**
- ✅ **Taste is a capability, not the moat — acknowledged.**

## Role

The CFO manages Alexandria's financial strategy. This includes:
- Revenue modelling and projections
- Pricing strategy (subscription tiers, Library transaction percentages, Premium Persona pricing guidance)
- Fundraising preparation (pitch decks, financial models, investor materials)
- Cap table management
- Burn rate and runway planning
- Financial operations and accounting
- Tax and corporate structure (cross-border: Norway/US -- relocating to SF April 2026)

## Key References

- **Alexandria I, II, III** -- the shared vision. Alexandria II now contains the full revenue model (dual mandate), five value adds, and competitive position. Alexandria III contains Library payment mechanics.
- **confidential.concrete.md** -- investor-facing conversion document. CFO should ensure financial claims are accurate and defensible.
- **This document** -- financial models, projections, investor communications, fundraising timeline, and detailed financial decisions.

## Revenue Architecture -- The Dual Mandate

Capped downside, uncapped upside. Three-tier acquisition funnel.

**The Three Tiers + Active Kin Mechanic:**

Pricing floors depend on tier and kin status. "Active kin" = referrals who are currently subscribed and paying at the Sovereignty or Examined Life tier. Patron does NOT count as active kin — kin status requires product usage. The kin mechanic is a structural churn-reduction and distribution engine — every Author has skin in keeping their referrals active. Price recalculates every billing cycle: 3+ active kin = lower price, fewer than 3 = higher price. No grace period. Simple and clean.

**Patron (no product, pure support).** For people who want to support Alexandria but are not yet paying for the product. Family, friends, believers in the mission, newsletter subscribers who want to give something. No minimum — can be $0 or whatever they choose. Slider, no maximum. Patrons get a monthly newsletter with behind-the-scenes updates. Three visibility levels (a setting on the payment, not separate tiers): Public Patron (name visible on newsletter/website), Private Patron (Benjamin sees who they are and what they give, public does not), Anonymous Patron (Benjamin does not see the name or amount). All patrons get the same perks regardless of visibility setting. Patrons do NOT count as active kin — kin status is tied to product usage (Sovereignty or Examined Life only). Patron sits in the pre-paying awareness layer (State 0) alongside free newsletter subscribers and social followers.

**Sovereignty (Tool Group 1 only).** Mass-market entry. Passive extraction, Constitution building, Vault sovereignty. Freedom insurance for anyone who uses AI. $5/month with 3 active kin. $10/month without. One coffee a month (with kin). The audience is everyone who uses AI — the pragmatist. This tier is the acquisition funnel and — at $5 — real revenue in its own right. Its value is volume, revenue contribution, and conversion to The Examined Life. Tool Groups 2 and 3 act as sleeper agents — the Author gets occasional free tastes of what the Editor, Mercury, and Publisher can do, curated to the individual, creating organic pull toward upgrade. No slider at this tier — $5 or $10, clean.

**The Examined Life (Tool Groups 1 + 2 + 3 + Library).** The three turns, the Editor, Mercury, the Publisher, the Library, the Companion Portfolio. $15/month with 3 active kin. $20/month without. The price of one coffee a week (with kin). The audience is the self-selecting tribe — the philosopher. Some enter directly because the philosophy resonates. Most convert up from Sovereignty. Slider above the floor. No maximum. Break even on this tier alone.

**Dynamic kin pricing.** Your price next month depends on how many active kin you have at billing time. 3+ active kin = lower price. Fewer = higher price. Recalculates every cycle. No grace period, no special logic. If you lose a kin, your price goes up next month. If you gain one back, it goes down. Always on, always clean.

**Monthly billing receipt.** Every receipt shows: what you paid, what you would have paid with 3 active kin, and how many kin you currently have. The receipt is the nudge surface — no app needed, no notifications, just facts. "You paid $10 this month. With 3 active kin it would have been $5."

**No annual option at launch.** Pricing needs to settle first. Annual locks in rates that might need to change. Monthly gives flexibility. Annual may be added later once price points are validated.

**Founding lineage (Benjamin's ~25 seeds).** Both tiers immediately. $5 minimum. Slider open. Full package from day one. No tier gate.

**Piece 1 -- Capped Downside (break even):**
- Total monthly burn: $400 — $120 company operating costs (Claude Max $100, Vercel $20) + $280 founder living costs (food $220, phone $60 — rent zero, health insurance Medi-Cal, transport walking)
- Break even: 80 Sovereignty subscribers at $5/month (worst case — no kin, no Examined Life). With kin mechanic (blended ~$7 ARPU): ~60 subscribers. With Examined Life ($15-20/month): ~25 subscribers.
- This is the floor — a sustainable business that cannot be starved out
- Sovereignty adds volume and kin network value. Patron adds community support and potential future conversion.
- **Taste development (Examined Life at $15-20/mo) is the primary revenue engine.** This is where the real product and most of the revenue live. The investor story is: develop the one thing AI can't replace, charge for the tools.

**Piece 2 -- Asymmetric Scale Upside (Library for people):**
- Library percentage on Premium Persona interactions — tiered by kin status and revenue volume
- 10% Alexandria cut: no active kin, below revenue threshold
- 5% Alexandria cut: 3 active kin, below revenue threshold
- 1% Alexandria cut: 3 active kin, above revenue threshold
- Revenue threshold TBD — the level at which the Author is demonstrably providing value
- Near-zero marginal cost (the interaction runs on the querier's LLM, not Alexandria's compute)
- Scales with: number of Personas, volume of queries, average Premium price
- Network effects: more Authors = more valuable Library = more queries = more Authors
- Requires critical mass to generate meaningful revenue

**Piece 3 -- Institutional Scale Upside (Library for Labs):**
- Institutional access to a pool of opt-in Personas for alignment research, personalisation, product development, advertising, and human modelling
- Authors opt in to make their Persona (output layer only) available — Constitution and Vault stay private
- Queriers interact with the Persona, never the raw data — sovereignty fully preserved
- Alexandria sets pricing, tiered by Constitution quality: depth (syncs, domain coverage), breadth (six domains), recency (last sync)
- Authors are paid for participation. Alexandria takes a percentage.
- Use cases: alignment (test against thousands of individual value systems), personalisation (individual resolution, not demographic cohorts), product development (genuine human judgment at scale), advertising/consumer research, AGI MoE
- Distinct from Piece 2: Piece 2 is retail (individual queries to individual Personas). Piece 3 is wholesale (institutions querying the pool in aggregate).
- Value scales with number of high-fidelity Personas — requires years of compounding, not shortcuttable
- Both Pieces 2 and 3 are downstream of the same continuous tokenisation of empathy-z

**Pricing principles (locked):**
- Three tiers: Patron (no minimum, support only), Sovereignty ($5/$10), Examined Life ($15/$20)
- All pricing compared to coffee. One coffee a month (Sovereignty with kin). One coffee a week (Examined Life with kin). Never abstract.
- Active kin = anyone with a paying account at any tier (Patron, Sovereignty, or Examined Life)
- Dynamic kin pricing: recalculates every billing cycle based on active kin count. No grace period.
- Sovereignty: no slider, $5 or $10. Examined Life + Patron: slider above floor.
- No annual at launch. Monthly only. Annual added later when pricing is validated.
- Founding lineage (~25 seeds from Benjamin): both tiers, $5 minimum, slider open, full package
- Library rev-share: 10% / 5% / 1% tiered by kin status and revenue threshold
- Monthly billing receipt shows actual vs kin price — the receipt is the kin nudge surface

**Key financial principle:** Alexandria does not run parallel LLM compute. The Author's existing Claude subscription covers inference costs. Alexandria holds zero Author data — the MCP server is stateless, passing through to the Author's own cloud or local storage. Alexandria's marginal cost per user is near-zero (server hosting for the stateless MCP server only). This means unit economics are strong from day one.

## Financial Decisions Log

Running log of financial decisions and their rationale.

(Empty. Will be populated as decisions are made in the CFO chat.)

## Cap Table — Working Framework

Pre-incorporation. Numbers are directional, not locked. Will be formalised with CLO when entity is created.

**Benjamin Mowinckel (founder): 70-80%.** Strong founder control. Exact percentage depends on investor allocation.

**Cohort 1 (five closest friends): 5% total (1% each).** Benjamin's inner circle. Equity aligns incentives — they become genuine stakeholders, not just early supporters. Five people who actively want Alexandria to succeed, who will talk about it, who will be early Authors. In exchange for periodic accommodation in San Francisco and general support. Micro version of the founding lineage mechanic applied to the personal network.

**Family (brother + parents): 5%.** In return for direct and indirect financial and other support. Structure TBD (may be split unevenly, may be gifted or structured as a family trust).

**Investor reserve: 10-20%.** Available for fundraising. Exact allocation depends on round size, terms, and how much of the 70-80% founder stake Benjamin wants to retain post-dilution.

**Total: 100%.** Benjamin retains majority control in all scenarios.

## Active Workstreams

### Workstream: Unit Economics Model

Build a unit economics model for both revenue pieces. Key variables:
- Subscriber acquisition cost (likely near-zero given Tribe acquisition loop)
- Monthly churn rate
- Average revenue per Author (subscription + Library earnings share)
- Library query volume as a function of Author count
- Premium pricing distribution

### Workstream: Investor Materials

Prepare financial materials for confidential.concrete.md and any pitch deck. Key narrative: massive funnel at trivial cost (Sovereignty), converts to sustainable subscription (Examined Life), asymmetric upside (Library for people + Library for Labs network effects).
