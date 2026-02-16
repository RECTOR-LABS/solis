import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { sendDigest } from '@/lib/digest';
import { checkBodySize } from '@/lib/api-guard';
import { webEnv } from '@/lib/env';

function isAuthorized(secret: string | null): boolean {
  const expected = webEnv.DIGEST_API_SECRET;
  if (!expected || !secret) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const bodyCheck = await checkBodySize(request, 1024);
  if (bodyCheck) return bodyCheck;

  const secret = request.headers.get('x-digest-secret');
  if (!isAuthorized(secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { date?: string };
  try {
    body = (await request.json()) as { date?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.date || typeof body.date !== 'string') {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }

  try {
    const result = await sendDigest(body.date);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: `Digest failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
