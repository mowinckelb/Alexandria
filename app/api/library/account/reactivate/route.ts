import { NextRequest } from 'next/server';
import { SERVER_URL } from '../../../../lib/config';

// Proxy POST /api/library/account/reactivate → ${SERVER_URL}/account/reactivate.
// Mirrors the cancel proxy — forwards cookie/auth, no Next-side state.
export async function POST(req: NextRequest): Promise<Response> {
  const cookie = req.headers.get('cookie');
  const auth = req.headers.get('authorization');
  const contentType = req.headers.get('content-type') || 'application/json';
  const body = await req.text();

  const headers: Record<string, string> = { 'Content-Type': contentType };
  if (cookie) headers.Cookie = cookie;
  if (auth) headers.Authorization = auth;

  const upstream = await fetch(`${SERVER_URL}/account/reactivate`, {
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
