# iMessage Bridge Decision

## Goal

Enable Alexandria's iMessage-first interface with the least operational risk, while preserving the core architecture (Constitution + PLM + Vault) and privacy controls.

## Options

### Option A: Apple Messages for Business (official)

- **Pros:** Native, policy-aligned, scalable, lower long-term risk.
- **Cons:** Access/approval path, integration complexity, business constraints.
- **Fit:** Best long-term production path.

### Option B: SMS/Phone bridge with iMessage-like UX (interim)

- **Pros:** Fast to ship, predictable APIs, immediate founder testing.
- **Cons:** Not true iMessage, potential UX mismatch, carrier limits.
- **Fit:** Strong near-term bootstrap path.

### Option C: Mac-hosted automation bridge (unofficial)

- **Pros:** Closest to true iMessage behavior quickly for single-user testing.
- **Cons:** Fragile, policy/compliance risk, hard to harden/scale.
- **Fit:** Prototype-only, not production-safe.

## Recommendation

Use **B now**, design for **A later**:

1. Build a channel-agnostic messaging abstraction in backend (`input` and `output` adapters).
2. Run founder loop through SMS/phone bridge for fast iteration and learning.
3. Keep message/event schema stable so channel swap does not affect Editor/Orchestrator logic.
4. Plan migration to official Apple path when onboarding/compliance requirements are satisfied.

## Architecture Requirements

- Message adapter interface (`receive`, `send`, `ack`, `typing`, `attachments`).
- Durable message/event log with idempotency keys.
- Contact binding (`external_contact_id -> user_id + privacy mode`).
- Replay-safe processing (at-least-once delivery tolerance).
- Redaction/privacy gate before outbound delivery.

## Risks

- **Channel lock-in:** mitigate via adapter interface and stable event schema.
- **Privacy leaks across channels:** enforce privacy mode + sensitive-section filters centrally.
- **Delivery duplication:** require idempotency and deterministic dedupe.
- **Latency spikes:** keep queue + retries + dead-letter handling.

## Rollout Plan

1. **Stage 1:** internal adapter + test harness with simulated channel.
2. **Stage 2:** founder traffic on interim channel (Option B).
3. **Stage 3:** production hardening (monitoring, retries, replay tools).
4. **Stage 4:** migrate adapter backend to official Apple path (Option A).

## Current Implementation Status (2026-02-22)

Stage 1 foundations are now in place:

- Adapter abstraction:
  - `lib/channels/types.ts`
  - `lib/channels/web-adapter.ts`
  - `lib/channels/index.ts`
- Bridge endpoints:
  - `GET /api/channels/debug` (supported adapters)
  - `POST /api/channels/dispatch` (outbound dispatch)
  - `POST /api/channels/inbound` (normalized inbound ingest, optional auto-reply for `audience: external`)
  - `GET /api/channels/messages` (durable message inspection)
  - `POST /api/channels/flush-editor` (flush pending editor queue through channel adapter)
- Durability + retry:
  - `channel_messages` table via `supabase/migrations/00029_channel_messages.sql`
  - retry worker `POST /api/cron/channel-retry` (scheduled every 5 min in `vercel.json`)
- Optional bridge auth guard:
  - `CHANNEL_SHARED_SECRET` enables shared-secret auth on channel endpoints
  - supported headers: `x-channel-secret: <secret>` or `Authorization: Bearer <secret>`
- Security runbook:
  - `docs/channel-security-playbook.md`
