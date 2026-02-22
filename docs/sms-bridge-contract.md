# SMS Bridge Payload Contract (v1)

This defines the outbound payload Alexandria sends to `sms_bridge` / `webhook` provider endpoints.

## Request

- Method: `POST`
- Content-Type: `application/json`
- Headers:
  - `X-Channel-Provider`: adapter channel (`sms_bridge` or `webhook`)
  - `X-Channel-Timestamp`: ISO timestamp
  - `X-Channel-Signature`: optional HMAC SHA-256 over `<timestamp>.<rawBody>` when `CHANNEL_WEBHOOK_SIGNING_SECRET` is configured
  - `Authorization: Bearer <CHANNEL_WEBHOOK_TOKEN>` when configured

## Body

```json
{
  "version": "v1",
  "channel": "sms_bridge",
  "externalContactId": "recipient-id",
  "userId": "uuid",
  "audience": "external",
  "message": {
    "text": "outbound text",
    "sentAt": "2026-02-22T12:00:00.000Z"
  },
  "trace": {
    "messageId": "sms_bridge-1234567890",
    "source": "alexandria-channel-adapter"
  }
}
```

## Expected Response

- Success status: any 2xx
- Optional JSON response fields consumed by Alexandria:
  - `providerMessageId` (preferred)
  - `messageId` or `id` (fallbacks)

If response is non-2xx or network fails, message is marked failed and retried by channel retry worker.

## Inbound Security

When `CHANNEL_WEBHOOK_SIGNING_SECRET` is configured, inbound provider calls to `/api/channels/inbound` are signature-verified for `webhook` and `sms_bridge` providers:

- Required headers:
  - `X-Channel-Provider`: `webhook` or `sms_bridge`
  - `X-Channel-Timestamp`
  - `X-Channel-Signature`
- Verification formula:
  - `hex(hmac_sha256(signingSecret, "<timestamp>.<rawRequestBody>"))`
