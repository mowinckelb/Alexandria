# Channel Security Playbook

Operational guidance for securing Alexandria channel bridge endpoints.

## Secrets

- `CHANNEL_SHARED_SECRET`
  - Protects channel operational endpoints (`/api/channels/*`) and cron-triggered bridge flows.
- `CHANNEL_WEBHOOK_TOKEN`
  - Optional bearer token for outbound provider webhook calls.
- `CHANNEL_WEBHOOK_SIGNING_SECRET`
  - HMAC signing secret used for outbound webhook signatures and inbound signature verification.

## Rotation Procedure

1. Generate new secret(s) with strong random values.
2. Update provider bridge config to accept new values.
3. Deploy updated environment values to Alexandria.
4. Verify `/api/channels/security` shows expected configuration state.
5. Send a controlled test message through each active channel.
6. Remove old secret(s) from provider and environment.

## Inbound Verification

- Inbound provider requests to `/api/channels/inbound` are signature-verified when `CHANNEL_WEBHOOK_SIGNING_SECRET` is configured.
- Required headers:
  - `X-Channel-Provider`
  - `X-Channel-Timestamp`
  - `X-Channel-Signature`
- Invalid signatures are rejected with `401`.

## Operations

- Use `/channels` UI and `/api/channels/stats` to monitor:
  - retry backlog
  - dead-letter counts
  - channel-level failure rates
- Use `/api/channels/requeue` or dead-letter controls in `/channels` UI to requeue failed messages after fixing provider issues.
