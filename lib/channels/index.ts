import { WebAdapter } from '@/lib/channels/web-adapter';
import { WebhookAdapter } from '@/lib/channels/webhook-adapter';
import type { ChannelAdapter } from '@/lib/channels/types';

const adapters: Record<string, ChannelAdapter> = {
  web: new WebAdapter(),
  webhook: new WebhookAdapter('webhook'),
  sms_bridge: new WebhookAdapter('sms_bridge')
};

export function getSupportedChannels(): string[] {
  return Object.keys(adapters);
}

export function getChannelAdapter(channel: string): ChannelAdapter {
  const adapter = adapters[channel];
  if (!adapter) throw new Error(`Unsupported channel: ${channel}`);
  return adapter;
}
