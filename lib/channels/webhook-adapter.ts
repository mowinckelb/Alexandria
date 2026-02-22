import type {
  ChannelAdapter,
  ChannelDeliveryResult,
  OutboundChannelMessage
} from '@/lib/channels/types';
import { createHmac } from 'crypto';

function resolveWebhookUrl(channel: string): string | null {
  if (channel === 'webhook') {
    return process.env.CHANNEL_WEBHOOK_URL || null;
  }
  if (channel === 'sms_bridge') {
    return process.env.SMS_BRIDGE_WEBHOOK_URL || process.env.CHANNEL_WEBHOOK_URL || null;
  }
  return null;
}

export class WebhookAdapter implements ChannelAdapter {
  channel: string;

  constructor(channel: string) {
    this.channel = channel;
  }

  async send(message: OutboundChannelMessage): Promise<ChannelDeliveryResult> {
    const webhookUrl = resolveWebhookUrl(this.channel);
    if (!webhookUrl) {
      return {
        success: false,
        error: `${this.channel} adapter not configured`,
        diagnostics: {
          provider: `${this.channel}-webhook`
        }
      };
    }

    try {
      const started = Date.now();
      const timestamp = new Date().toISOString();
      const payload = {
        version: 'v1',
        channel: this.channel,
        externalContactId: message.externalContactId,
        userId: message.userId,
        audience: message.audience,
        message: {
          text: message.text,
          sentAt: timestamp
        },
        trace: {
          messageId: `${this.channel}-${Date.now()}`,
          source: 'alexandria-channel-adapter'
        }
      };
      const payloadString = JSON.stringify(payload);
      const signingSecret = process.env.CHANNEL_WEBHOOK_SIGNING_SECRET;
      const signature = signingSecret
        ? createHmac('sha256', signingSecret).update(`${timestamp}.${payloadString}`).digest('hex')
        : null;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Channel-Provider': this.channel,
          'X-Channel-Timestamp': timestamp,
          ...(signature ? { 'X-Channel-Signature': signature } : {}),
          ...(process.env.CHANNEL_WEBHOOK_TOKEN
            ? { Authorization: `Bearer ${process.env.CHANNEL_WEBHOOK_TOKEN}` }
            : {})
        },
        body: payloadString
      });

      const latencyMs = Date.now() - started;
      const rawText = await response.text();
      const responsePreview = rawText.slice(0, 220);
      let parsedPayload: { providerMessageId?: string; id?: string; messageId?: string } | null = null;
      try {
        parsedPayload = rawText ? JSON.parse(rawText) as { providerMessageId?: string; id?: string; messageId?: string } : null;
      } catch {
        parsedPayload = null;
      }

      if (!response.ok) {
        return {
          success: false,
          error: `${this.channel} webhook failed (${response.status})`,
          diagnostics: {
            provider: `${this.channel}-webhook`,
            statusCode: response.status,
            latencyMs,
            responsePreview
          }
        };
      }

      const providerMessageId = parsedPayload?.providerMessageId || parsedPayload?.messageId || parsedPayload?.id;

      return {
        success: true,
        providerMessageId: providerMessageId || `${this.channel}-${Date.now()}`,
        deliveredAt: new Date().toISOString(),
        diagnostics: {
          provider: `${this.channel}-webhook`,
          statusCode: response.status,
          latencyMs,
          responsePreview
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `${this.channel} webhook request failed`,
        diagnostics: {
          provider: `${this.channel}-webhook`
        }
      };
    }
  }
}
