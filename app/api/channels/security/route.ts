import { NextRequest, NextResponse } from 'next/server';

function authorizeChannelRequest(request: NextRequest): boolean {
  const secret = process.env.CHANNEL_SHARED_SECRET;
  if (!secret) return true;
  const direct = request.headers.get('x-channel-secret');
  const auth = request.headers.get('authorization');
  if (direct && direct === secret) return true;
  if (auth === `Bearer ${secret}`) return true;
  return false;
}

export async function GET(request: NextRequest) {
  try {
    if (!authorizeChannelRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = {
      channelSharedSecretConfigured: Boolean(process.env.CHANNEL_SHARED_SECRET),
      webhookUrlConfigured: Boolean(process.env.CHANNEL_WEBHOOK_URL),
      smsBridgeWebhookConfigured: Boolean(process.env.SMS_BRIDGE_WEBHOOK_URL || process.env.CHANNEL_WEBHOOK_URL),
      webhookBearerConfigured: Boolean(process.env.CHANNEL_WEBHOOK_TOKEN),
      signingSecretConfigured: Boolean(process.env.CHANNEL_WEBHOOK_SIGNING_SECRET),
      inboundSignatureVerificationEnabled: Boolean(process.env.CHANNEL_WEBHOOK_SIGNING_SECRET)
    };

    const score = Object.values(status).filter(Boolean).length;
    const maxScore = Object.keys(status).length;

    return NextResponse.json({
      status,
      score,
      maxScore,
      readiness: score >= 5 ? 'strong' : score >= 3 ? 'moderate' : 'basic'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
