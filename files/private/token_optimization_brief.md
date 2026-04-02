# Token Optimization: Off-Hours Automation Brief

## Problem
Two independent Claude Code limits: 5-hour rolling session window + weekly aggregate. Benjamin hits session ceilings but only uses ~60% of weekly pool. Tokens left on the table every week.

Peak hours (Mon-Fri 5am-11am PT / 1pm-7pm CET) burn session quota faster — most interactive work happens during peak, compounding the waste.

## Solution: Scheduled Off-Hours Work via `/schedule`

Cloud scheduled tasks (`/schedule`) consume from the **same weekly token pool** as interactive sessions. They run on Anthropic infrastructure — machine can be off. This is how to burn the remaining ~40% weekly tokens.

### Off-peak timing advantage
- Off-peak hours give ~2-3x more token efficiency per 5-hour window
- 11pm-5am PT = 7am-1pm CET (Benjamin's morning, their off-peak) — interactive sessions here are already efficient
- 1am-5am CET (Benjamin's sleep) = prime window for automated work

### High-value automated work candidates
1. **Accretion loops** — vault reprocessing against current constitution, surface new signal
2. **Factory work** — Blueprint refinement, signal processing
3. **Research** — deep web research on topics parked in a0, competitive analysis
4. **Code maintenance** — test runs, dependency audits, smoke tests
5. **Constitution enrichment** — multi-pass extraction from vault

### Architecture
1. **Daily ~2am CET**: accretion loop — reprocess vault against current constitution
2. **Daily ~4am CET**: research loop — pick one parked question from a0, do deep research, write findings
3. **Pre-flight check**: each trigger starts by estimating tokens remaining, skips if quota is thin (protect interactive sessions)

### Monitoring tools
- **`ccusage`** (github.com/ryoppippi/ccusage) — analyzes local JSONL logs, shows usage patterns
- **`/cost`** — check token consumption within a session
- **Claude-Code-Usage-Monitor** (GitHub) — real-time terminal UI with burn rate predictions

### Key constraints
- `/schedule` minimum interval: 1 hour
- Cloud tasks run full sessions — each run = full token consumption
- No native quota-awareness — pre-flight check must be built into the trigger prompt
- No separate automation token bucket — all draws from one weekly pool

### The `/a excess` product idea
Works as a personal solution (scheduled triggers during sleep), but can't be shipped as a product feature — we can't control users' Claude Code quotas. However, the *pattern* (schedule meaningful cognitive work during off-hours) is something Alexandria could recommend to Authors in Blueprint methodology.

## Source
Researched in CC session 2026-04-02. Two research agents ran: one on token limits/management/community tools, one on scheduled triggers and quota mechanics.
