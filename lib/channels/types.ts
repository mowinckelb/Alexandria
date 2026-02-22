export type ChannelAudience = 'author' | 'external';

export interface InboundChannelMessage {
  channel: string;
  externalContactId: string;
  userId: string;
  messageId: string;
  text: string;
  receivedAt: string;
  audience: ChannelAudience;
}

export interface OutboundChannelMessage {
  channel: string;
  externalContactId: string;
  userId: string;
  text: string;
  audience: ChannelAudience;
}

export interface ChannelDeliveryResult {
  success: boolean;
  providerMessageId?: string;
  deliveredAt?: string;
  error?: string;
  diagnostics?: {
    provider: string;
    statusCode?: number;
    latencyMs?: number;
    responsePreview?: string;
  };
}

export interface ChannelAdapter {
  channel: string;
  send(message: OutboundChannelMessage): Promise<ChannelDeliveryResult>;
}
