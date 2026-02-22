import type {
  ChannelAdapter,
  ChannelDeliveryResult,
  OutboundChannelMessage
} from '@/lib/channels/types';

export class WebAdapter implements ChannelAdapter {
  channel = 'web';

  async send(message: OutboundChannelMessage): Promise<ChannelDeliveryResult> {
    // Web delivery is handled by client polling/SSE; this adapter simply acknowledges routing.
    return {
      success: true,
      providerMessageId: `web-${Date.now()}`,
      deliveredAt: new Date().toISOString(),
      error: message.text.trim() ? undefined : 'Empty message payload'
    };
  }
}
