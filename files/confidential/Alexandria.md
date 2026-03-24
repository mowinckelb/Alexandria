# Alexandria — Company Overview

**Cognitive identity infrastructure. No one is building the full stack.**

| | |
|---|---|
| Category | Cognitive identity infrastructure |
| Stage | Pre-revenue. Product live. Founder uses daily. |
| Structure | Delaware C-Corp (Stripe Atlas) |
| Founder | Benjamin Mowinckel — San Francisco, April 2026 |

*Confidential. Not for distribution.*

---

## The Bet

Alexandria builds sovereign tools that capture, develop, and preserve individual human cognition through the AI transition. One MCP connector added to the user's AI account. Five tools activate across all conversations. The user's cognitive identity — how they think, what they value, how they reason — builds over time on their own storage, fully portable, fully owned.

The objection: people do not think in words. Correct. Most cognition is pre-linguistic. Alexandria does not claim to represent thought — it claims to make thought compoundable. The process of forcing cognition through language restructures the cognition itself (Lieberman 2007, Kross 2014). Pre-verbal cognition does not compound, does not transfer, cannot interface with AI. The compression is lossy. The compounding benefit exceeds the loss.

No startup is building the full stack. Top-tier VCs have invested $100M+ in adjacent companies building fragments of the thesis. The company does not need the money — company opex is $101/month. Capital accelerates the experiment, it does not enable the company.

## Why Now

Three structural shifts converge.

**MCP has won.** The Model Context Protocol — 97 million monthly SDK downloads, 10,000+ active servers, 543+ clients — is now the universal standard for connecting AI models to external tools. In December 2025, Anthropic donated MCP to the Agentic AI Foundation under the Linux Foundation; co-founders include Anthropic, OpenAI, and Block, with AWS, Google, and Microsoft as platinum members. Alexandria rides the winning standard.

**Claude and ChatGPT both support MCP connectors.** Claude is the first platform where any user (including free tier) can add a custom MCP connector with zero gatekeeping. ChatGPT now supports MCP connectors for all paid users. A distribution channel that costs nothing to access.

**Regulation favours sovereignty.** GDPR enforcement is escalating — LinkedIn fined €310 million in October 2024 for behavioural profiling without consent. Deeper cognitive profiles attract more scrutiny. The regulatory direction pushes toward transparency and portability, which favours sovereign architecture.

---

## Product

An MCP server. The user adds one connector. Five tools activate across all conversations. Alexandria has no database, no server state. Files are stored on the user's own storage — human-readable markdown organised into domains. The server is a stateless bridge: there is structurally nowhere on the server for data to exist.

**Layer 1 — Sovereignty ($5-10/month).** Unifies fragmented AI memories across providers into one structured picture: worldview, values, mental models, identity, taste, known blind spots. Stored on the user's own files. Works across every AI provider. Fully portable, never locked in.

**Layer 2 — Mental Gym ($15-20/month).** Dedicated tools that actively develop self-knowledge: Socratic questioning, blind spot surfacing, creative iteration calibrated to the user's taste. The product is the changed person.

**Layer 3 — Living Library (no additional cost to the author).** Users share their developed perspective. Others query it and pay. At institutional scale, AI labs access a pool of opt-in structured cognitive representations for alignment research, personalisation, and human modelling — the only sovereignty-compatible dataset of its kind.

All three layers are the same product, same architecture, same user at different depths of engagement — a natural funnel, not three separate businesses.

---

## Traction

Pre-revenue. Product live and working. Honest about what exists and what does not.

MCP server deployed on Railway — five tools, Google Drive OAuth, stateless pass-through. Working extraction across taste, values, identity, and worldview domains. Constitution building demonstrated in live daily usage. Cross-model tested: extraction triggers fire correctly in Claude conversations. Surface (mowinckel.ai) live. Abstract (19-page philosophy) and Logic.pdf (formal argument: 44 premises, 11 conclusions, 20 assumptions) shipped. Concrete (AI-readable conversion document) tested on Claude, GPT, Gemini, Grok — all four execute correctly. Incorporated as Delaware C-Corp via Stripe Atlas.

No revenue. No external users. Distribution has not started. The product works. The kin mechanic handles organic growth once seeded.

---

## Competitive Landscape

**Two established categories have formed. Neither is Alexandria.**

Developer memory infrastructure: Mem0 ($24M from YC/Peak XV — 186M API calls/quarter, AWS exclusive memory provider), Letta ($10M from Felicis at $70M valuation), Supermemory ($2.6M). These store factual key-value memories for developers building apps. Not cognitive identity. Not consumer-facing.

Personal AI companions: Personal AI ($23.8M from a16z — trains per-user models, platform-locked), Delphi ($19.1M from Founders Fund + Anthropic — digital clones outward for others), Kin ($4.1M — on-device advisors, destination app, no cross-AI portability).

Lab giants are constrained by the lock-in disincentive. A structured portable profile makes switching trivial. The personalisation benefit does not currently exceed the lock-in cost. That threshold gap is Alexandria's runway.

The closest philosophical competitor — ownself.ai — takes a blockchain approach but appears pre-launch with no visible funding or traction. Alexandria is live with pragmatic architecture. Dead: Dot (shutdown October 2025, users lost their data), Limitless (acquired by Meta December 2025, product killed). Both deaths validate the sovereignty architecture.

No funded company combines all four: sovereign (user owns data), cognitive identity (values/taste/worldview, not facts), model-agnostic via MCP, and no own models.

---

## Business Model

**Cost base: near-zero.** No payroll. No compute (user's AI subscription covers inference). No storage (user's cloud). No database. Solo founder with AI agents. Company opex: $101/month — Claude Max $100, Railway $1. Everything else is free tier or owned. Payment processing optimised: Sovereignty tier uses ACH (0.8% flat), Examined Life uses Stripe cards (2.9% + $0.30) — blended processing cost ~1.4% of revenue.

**Break-even: ~21 Sovereignty subscribers at $5/month.** With kin mechanic active (blended ~$7 ARPU): ~15. With Examined Life ($15-20): as few as 6.

**Growth engine.** Kin pricing — each user's price drops if they have 3+ active referrals. Structural pressure on both acquisition and retention. Founding lineage of ~25 seeds compounds: 25 to 75 to 225 to 675 to 2,025. Near-zero marginal CAC once the flywheel is turning.

**5-year projections (conservative case):**

| | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|---|---|---|---|---|---|
| Sovereignty users | 2,000 | 5,000 | 11,000 | 20,900 | 33,400 |
| Examined Life users | 210 | 565 | 1,405 | 3,036 | 5,493 |
| Subscription revenue | $211K | $535K | $1.2M | $2.4M | $3.9M |
| Library for Labs | — | — | $100K | $250K | $600K |
| **Total revenue** | **$211K** | **$535K** | **$1.3M** | **$2.6M** | **$4.6M** |
| Total costs | $31K | $56K | $103K | $196K | $306K |
| **Net income** | **$180K** | **$479K** | **$1.2M** | **$2.5M** | **$4.3M** |

Assumptions are conservative on some axes (8% initial conversion, 4% monthly churn) and optimistic on others (150% Y1 growth). Full sensitivity in Numbers.xlsx.

---

## The De-Risk Ladder

The company has four unresolved risks, each with a price tag:

**Rung 1 (~$50K):** Seeds the experiment and buffers the founder. Answers the four existential questions: does anyone want this, does the kin mechanic compound, does the brand land, can the founder sustain. If it works, the company has answered the only questions that matter.

**Rung 2 (~$200K-500K):** Scales what works. Pour fuel on the flywheel if kin compounds. Pivot distribution if it doesn't. First 1,000 Authors. No hires — invest in brand, community, and the founding lineage.

**Rung 3 (~$1M+):** Mental Gym conversion at scale. International expansion. Brand as category-defining standard. If the Library has traction, explore it. If not, the subscription business is the business.

Each rung purchases the next tier of de-risking. The company does not need the money — $101/month opex. The founder builds regardless. Capital accelerates the experiment, it does not enable the company.

---

## Use of Funds

Regardless of rung, capital goes to three buckets:

**Seeding experiment.** Brand building, community presence, events, content. The fuel that gets the kin mechanic flywheel started. The 25 founding seeds need activation energy — everything after that is organic.

**Founder buffer.** SF living costs. Removes friction so the founder focuses on building. At $228/month + rent, a small buffer extends runway for years.

**Distribution infrastructure.** MCP registry listing, ChatGPT Apps partner application, one-click install configs for top AI clients, security positioning. The channels that put Alexandria where users already are.

---

## Risks

**A major player builds equivalent functionality.** This is the exit thesis, not the failure mode. Apple acquiring the trust layer is the highest-return outcome. Apple does not create categories — it acquires after someone smaller proves the market.

**The Library is hard to bootstrap.** Cold start is solved by design: Sovereignty builds Constitutions before the Library needs them. By the time Library launches, the dataset exists.

**Solo founder, single point of failure.** Solo by choice. AI agents fill all C-suite roles. 35% of 2024 startups were solo-founded (Carta). The AI-native model is the thesis applied to the organisation.

**No technical credentials or track record.** The hard part is philosophical, not technical. The engineering is commodity work. The entire product was built by AI agents — which proves the thesis.

**The pain point is not acutely felt yet.** Requires frame imposition before conversion. Once someone accepts that their cognitive identity is fragmented, locked in, and undeveloped — the product sells itself. The kin mechanic creates the social pressure that spreads the frame.

---

## Key Questions

**Why can't a lab just build this?** They can. The engineering is trivial. The defence is economic: a structured portable profile makes switching trivial, and the personalisation value does not currently exceed the lock-in cost. That threshold gap is the runway. Regulation reinforces it. Breach liability raises the stakes.

**What happens when models get better at personalisation?** Better models make Alexandria better, not obsolete. The value is in the structured data and extraction methodology. A model release cannot replicate years of accumulated cognitive profiles. One of the few AI investments that improves with every model release rather than being absorbed by it.

**What's the formal argument?** Logic.pdf — 44 premises, 11 conclusions, 20 assumptions. Every settled premise cannot reasonably be denied. The only conversation is about the assumptions.

---

## The Founder

**Benjamin Mowinckel** — American-Norwegian. Three years in venture capital (sourcing, due diligence, portfolio support). Left because the thesis demanded building, not funding.

The hard part of Alexandria is not technical. A lab could rebuild the stack in a week. The hard part is philosophical — seeing the problem, understanding what to build, knowing how to do the extraction well. The engineering was built entirely with AI agents, which proves the thesis: one human with philosophical depth and AI leverage.

The company itself is the proof of concept. The operating model is the product's thesis applied to the organisation.

---

**Benjamin Mowinckel**
benjamin@mowinckel.com | +1 (415) 503-8178
mowinckel.ai
