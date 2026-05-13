import { NextRequest } from 'next/server';
import { SERVER_URL } from '../../../../lib/config';

// Proxy POST /api/library/account/cancel → ${SERVER_URL}/account/cancel.
// Forwards the session cookie + auth header so the Worker can resolve
// the calling Author. Stateless on the Next side — same shape as
// /api/library/session/route.ts and the checkout proxy.
export async function POST(req: NextRequest): Promise<Response> {
  const cookie = req.headers.get('cookie');
  const auth = req.headers.get('authorization');
  const contentType = req.headers.get('content-type') || 'application/json';
  const body = await req.text();

  const headers: Record<string, string> = { 'Content-Type': contentType };
  if (cookie) headers.Cookie = cookie;
  if (auth) headers.Authorization = auth;

  const upstream = await fetch(`${SERVER_URL}/account/cancel`, {
    method: 'POST',
    headers,
    body: body || undefined,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
