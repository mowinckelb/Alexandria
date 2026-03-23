# Finance

Financial planning, revenue modelling, fundraising, and cap table for Alexandria.

---

## Revenue Architecture -- The Dual Mandate

Capped downside, uncapped upside. Three-tier acquisition funnel.

**The Three Tiers + Active Kin Mechanic:**

Pricing floors depend on tier and kin status. "Active kin" = referrals who are currently subscribed and paying at the Sovereignty or Examined Life tier. Patron does NOT count as active kin — kin status requires product usage. The kin mechanic is a structural churn-reduction and distribution engine — every Author has skin in keeping their referrals active. Price recalculates every billing cycle: 3+ active kin = lower price, fewer than 3 = higher price. No grace period. Simple and clean.

**Patron (no product, pure support).** For people who want to support Alexandria but are not yet paying for the product. Family, friends, believers in the mission, newsletter subscribers who want to give something. No minimum — can be $0 or whatever they choose. Slider, no maximum. Patrons get a monthly newsletter with behind-the-scenes updates. Three visibility levels (a setting on the payment, not separate tiers): Public Patron (name visible on newsletter/website), Private Patron (Benjamin sees who they are and what they give, public does not), Anonymous Patron (Benjamin does not see the name or amount). All patrons get the same perks regardless of visibility setting. Patrons do NOT count as active kin — kin status is tied to product usage (Sovereignty or Examined Life only). Patron sits in the pre-paying awareness layer (State 0) alongside free newsletter subscribers and social followers.

**Sovereignty (full passive extraction, metered active tastes).** Mass-market entry. Passive extraction, Constitution building, Vault sovereignty. Freedom insurance for anyone who uses AI. $5/month with 3 active kin. $10/month without. One coffee a month (with kin). The audience is everyone who uses AI — the pragmatist. This tier is the acquisition funnel and — at $5 — real revenue in its own right. Its value is volume, revenue contribution, and conversion to The Examined Life. Metered tastes of the active functions — occasional free mode activations that let the Author experience what Editor, Mercury, and Publisher can do, curated to the individual, creating organic pull toward upgrade. The bridge between tiers is dynamic: a little leakage is fine. No slider at this tier — $5 or $10, clean.

**The Examined Life (unlimited access to all five tools + Library).** The three turns, the Editor, Mercury, the Publisher, the Library, the Companion Portfolio. $15/month with 3 active kin. $20/month without. The price of one coffee a week (with kin). The audience is the self-selecting tribe — the philosopher. Some enter directly because the philosophy resonates. Most convert up from Sovereignty. Slider above the floor. No maximum. Break even on this tier alone.

**Dynamic kin pricing.** Your price next month depends on how many active kin you have at billing time. 3+ active kin = lower price. Fewer = higher price. Recalculates every cycle. No grace period, no special logic. If you lose a kin, your price goes up next month. If you gain one back, it goes down. Always on, always clean.

**Monthly billing receipt.** Every receipt shows: what you paid, what you would have paid with 3 active kin, and how many kin you currently have. The receipt is the nudge surface — no app needed, no notifications, just facts. "You paid $10 this month. With 3 active kin it would have been $5."

**No annual option at launch.** Monthly only initially. Pricing needs to settle before locking longer commitments. Quarterly (10% discount) and annual (20% discount) added once price points are validated.

**Founding lineage (Benjamin's ~25 seeds).** Both tiers immediately. $5 minimum. Slider open. Full package from day one. No tier gate.

**Piece 1 -- Capped Downside (break even):**
- Company opex: $101/month — Claude Max $100, Railway $1. Everything else is free: GitHub, Google Drive, Vercel, Fly.io (cold standby), UptimeRobot (health monitoring), Google Cloud Console, Claude Code, claude.ai, domain (owned). Two paid services and an entire free stack.
- Founder living costs (separate from company opex): $228/month + rent — food $200, Tello $7, Apple Music $11, iCloud 2TB $10. Rent currently $0 (living with a friend in SF). Health insurance Medi-Cal (free). Transport walking.
- Break even on company opex: ~21 Sovereignty subscribers at $5/month (covers $101 + payment processing fees). That is the real number. With kin mechanic (blended ~$7 ARPU): ~15 subscribers. With Examined Life ($15-20/month): ~6 subscribers. Payment processing: Sovereignty uses ACH/Direct Debit (0.8% flat via GoCardless or Stripe ACH — optimised for high-volume low-dollar subscriptions). Examined Life uses Stripe cards (2.9% + $0.30 — higher fees acceptable on higher ticket). This cuts blended processing fees from ~6.7% (all-Stripe) to ~1.4% of revenue.
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
- Alexandria sets pricing, tiered by Constitution quality: depth (syncs, domain coverage), breadth (how much of the cognitive map is covered), recency (last sync)
- Authors are paid for participation. Alexandria takes a percentage.
- Use cases: alignment (test against thousands of individual value systems), personalisation (individual resolution, not demographic cohorts), product development (genuine human judgment at scale), advertising/consumer research, AGI MoE
- Distinct from Piece 2: Piece 2 is retail (individual queries to individual Personas). Piece 3 is wholesale (institutions querying the pool in aggregate).
- Value scales with number of high-fidelity Personas — requires years of compounding, not shortcuttable
- Both Pieces 2 and 3 are downstream of the same continuous tokenisation of empathy-z

**Pricing principles (locked):**
- Three tiers: Patron (no minimum, support only), Sovereignty ($5/$10), Examined Life ($15/$20)
- All pricing compared to coffee. One coffee a month (Sovereignty with kin). One coffee a week (Examined Life with kin). Never abstract.
- Active kin = referrals who are currently subscribed and paying at the Sovereignty or Examined Life tier. Patron does NOT count.
- Dynamic kin pricing: recalculates every billing cycle based on active kin count. No grace period.
- Sovereignty: no slider, $5 or $10. Examined Life + Patron: slider above floor.
- No annual at launch. Monthly only. Quarterly and annual (10%/20% discounts) added once pricing is validated.
- Founding lineage (~25 seeds from Benjamin): both tiers, $5 minimum, slider open, full package
- Library rev-share: 10% / 5% / 1% tiered by kin status and revenue threshold
- Monthly billing receipt shows actual vs kin price — the receipt is the kin nudge surface
- **Billing frequency:** Monthly (default), quarterly (10% discount), annual (20% discount). Monthly-only at launch until pricing is validated — quarterly and annual added once price points settle. Discounts reduce churn (longer commitment) and improve cash flow (upfront payment). Annual Sovereignty with kin: $54/yr ($4.50/mo effective). Annual Examined Life with kin: $144/yr ($12/mo effective).
- **Payment processing:** Sovereignty tier uses ACH/Direct Debit (0.8% flat — GoCardless or Stripe ACH). Examined Life uses Stripe cards (2.9% + $0.30). ACH default for Sovereignty optimises the highest-volume, lowest-dollar tier. Stripe for Examined Life is acceptable because higher ticket absorbs the fee. Blended processing cost drops from ~6.7% (all-Stripe) to ~1.4% of revenue. This is a meaningful margin improvement at scale.

**Key financial principle:** Alexandria does not run parallel LLM compute. The Author's existing Claude subscription covers inference costs. Alexandria holds zero Author data — the MCP server is stateless, passing through to the Author's own cloud or local storage. Alexandria's marginal cost per user is near-zero (server hosting for the stateless MCP server only). This means unit economics are strong from day one.

## Financial Decisions Log

Running log of financial decisions and their rationale.

(Empty. Will be populated as decisions are made in the CFO chat.)

## Cap Table — Current

Alexandria Library, Inc. incorporated as Delaware C-Corp via Stripe Atlas. 10,000,000 shares authorised. Benjamin Mowinckel is sole director, President, and Secretary.

**Benjamin Mowinckel (founder): ~90%.** Sole founder. 100% current ownership. Post-raise target ~90% (exact depends on final allocation of Cohort 1 and family grants).

**Cohort 1 (five closest friends): ~5% total (~1% each).** Benjamin's inner circle. Equity aligns incentives — they become genuine stakeholders, not just early supporters. Five people who actively want Alexandria to succeed, who will talk about it, who will be early Authors. In exchange for periodic accommodation in San Francisco and general support.

**Family (brother + parents): ~5%.** In return for direct and indirect financial and other support. Structure TBD (may be split unevenly, may be gifted or structured as a family trust).

**Investor raise: $50K at ~1% equity ($5M pre-money valuation).** Small check, high conviction. The company does not need the money — company opex is $101/month. The $50K is a buffer that lets the founder stay in build mode without friction, and funds modest brand building (ads, events, merch, community). The real value of the investment is partnership, not capital. No engineering hire — solo founder + AI agents, no hires planned.

**Total: 100%.** Benjamin retains majority control in all scenarios.

## Active Workstreams

### Dual Acquisition Strategy

Two channels, each optimised for its tier:

**AI-autonomous global funnel (Sovereignty).** High-scale, autonomous AI-driven marketing. Social media content generation, automated ad production, global distribution — a pure AI maximisation game. Near-zero marginal CAC once the kin mechanic is running. For physical-world presence (posters, flyers, local activations) without the founder, use rent-a-human services (TaskRabbit, etc.) orchestrated by the AI. This is the volume play: get every AI user on Earth into the $5 sovereignty tier.

**Human-personal local brand (Examined Life).** Low-scale, high-signal, founder-led. Benjamin in San Francisco — meeting people, writing letters, hosting events, building the cult. The examined life tier sells through personal conviction, not ads. This is the depth play: a threshold game where the human signal is the product.

The duality mirrors the tier structure: AI for scale, human for soul.

### Workstream: Unit Economics Model

Build a unit economics model for both revenue pieces. Key variables:
- Subscriber acquisition cost (near-zero marginal CAC on Sovereignty via AI-autonomous funnel, modest spend on Examined Life via founder-led brand building)
- Monthly churn rate
- Average revenue per Author (subscription + Library earnings share)
- Library query volume as a function of Author count
- Premium pricing distribution

### Workstream: Investor Materials

Prepare financial materials for Memo.md and any pitch deck. Key narrative: massive funnel at trivial cost (Sovereignty), converts to sustainable subscription (Examined Life), asymmetric upside (Library for people + Library for Labs network effects). Current raise: $50K at ~1% equity ($5M pre-money). Numbers.xlsx contains the full financial model.
