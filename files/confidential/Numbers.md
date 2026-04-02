# Numbers

## Alexandria

### Monthly Operating Cost

| | $/mo | |
|---|---:|---|
| Rent | $0 | Sleeping on a friend's floor |
| Transport | $0 | Walks everywhere |
| Office | $0 | Public libraries |
| Gym, subscriptions, coffee, restaurants, alcohol, clubs, etc. | $0 | Calisthenics, zero vices, 997; all marginal attention on the singularity |
| Health insurance | $0 | Medi-Cal |
| Food | $260 | OMAD-1 (one fasted day/week), $10/day |
| Claude Max | $100 | anthropic.com |
| iCloud, Apple Music, Tello | $28 | |
| **Bare minimum** | **$388** | |
| **Safe monthly (incl. buffer)** | **$5,000** | Covers rent (when needed), travel, unexpected |
| **Safe annual** | **$60,000** | |

Free stack: GitHub, Vercel, Cloudflare (Workers + KV + D1 + R2 + DNS + email), Stripe, Mercury, Claude. Company opex = Claude Max ($100). Everything else is free tier. Six dependencies, all CLI-controllable.

---

### Legal & Filing Costs

**One-time:**

| | $ |
|---|---:|
| Stripe Atlas (Delaware C-Corp) | $500 |
| California foreign qualification | $150 |
| **Total one-time** | **$650** |

**Recurring annual:**

| | $/yr |
|---|---:|
| Delaware franchise tax | $400 |
| California franchise tax | $800 |
| Registered agent | $150 |
| CPA — federal return | $1,500 |
| CPA — state return(s) | $500 |
| **Total recurring annual** | **$3,350** |

---

### Pricing

One tier. Everyone gets everything. Slider open — Authors pay what it's worth.

| The Examined Life | $/mo |
|---|---:|
| With 3+ active kin | $5 floor |
| Without 3 kin | $10 floor |
| Slider | No ceiling |

60% of users expected to have 3+ active kin.

| | $/mo |
|---|---:|
| **Blended ARPU** | **$7** |

After kin mix and quarterly/annual discounts. Slider surplus adds to ARPU but is not modelled — pure upside.

Promo codes: Author-generated. Alexandria subsidises from its 50% Library cut. Viral mechanic, not discount.

---

### Payment Processing

| | Rate | |
|---|---:|---|
| Stripe % | 2.9% | |
| Stripe per-txn fee | $0.30 | Per transaction |

---

### Founding Cohort

| | |
|---|---:|
| Founding seeds | 25 |
| Pricing | $5 floor, slider open |
| If each seed brings 3 kin | 25 → 75 → 225 (Q1) |
| If kin multiplier is 1.5x | 25 → 38 → 57 (slower but organic) |
| Break-even on company opex | 21 subscribers at $5/month |
| Break-even on founder costs | ~80 subscribers at $7 blended ARPU |

Three distribution channels: local (founder in SF), network (Library viral — quizzes, shareable shadows), global (content claws — future, ai agents on video platforms).

---

### Growth

| | |
|---|---:|
| Year 1 users (EOY) | 2,000 |
| Monthly churn | 4% |

---

### Patron Tier — The Structural Floor

Not a product tier — a mission tier. For people who believe Alexandria should exist: family, friends, mission believers. Pay-what-you-want, no minimum, no maximum. Patrons do NOT count as active kin. Donation-style churn is structurally lower than product churn.

| | |
|---|---:|
| 20 patrons at $5/month | Break-even on company opex |
| 50 patrons at $10/month | Founder costs start getting covered |

This is the concrete mechanism behind "cannot die." Independent of whether the product achieves scale.

---

### Library Revenue (Year 2+)

**Library for People (retail):** Alexandria's cut on shadow MD access fees. Zero marginal cost — no inference, no tokens, just API access gating. Alexandria takes 50%, Stripe takes ~3%, Author earns ~47%.

**Library for Labs (institutional):** Opt-in shadow MD pool for alignment research, personalisation, product development.

| | |
|---|---:|
| Average annual contract value | $50,000 |

**Library for Everyone (horizon):** Every software company, app, and service would pay for richer personal data on their users. The shadow MD is the richest personal data artifact that exists — structured, authentic, deeply developed cognition. Recommendation engines, health apps, financial advisors, education platforms, dating services — anything that serves a person serves them better when it knows who they are. Author controls access per service, revocable at any time. Author monetises their own data. Alexandria captures value at the aggregate — the platform that connects data silos to services.

Library v1 infrastructure is live: D1 for metadata, R2 for content, Stripe for payment. Zero inference cost per Library interaction — shadow MDs are static artifacts served via API.
