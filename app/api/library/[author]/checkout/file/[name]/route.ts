import { NextRequest } from 'next/server';
import { SERVER_URL } from '../../../../../../lib/config';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ author: string; name: string }> },
): Promise<Response> {
  const { author, name } = await ctx.params;
  const contentType = req.headers.get('content-type') || 'application/json';
  const cookie = req.headers.get('cookie');
  const auth = req.headers.get('authorization');
  const body = await req.text();

  const headers: Record<string, string> = { 'Content-Type': contentType };
  if (cookie) headers.Cookie = cookie;
  if (auth) headers.Authorization = auth;

  const upstream = await fetch(
    `${SERVER_URL}/library/${encodeURIComponent(author)}/checkout/file/${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers,
      body,
    },
  );

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
