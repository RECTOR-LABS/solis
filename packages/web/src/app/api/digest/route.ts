import { NextResponse } from 'next/server';
import { sendDigest } from '@/lib/digest';

export async function POST(request: Request) {
  const secret = request.headers.get('x-digest-secret');
  if (!process.env.DIGEST_API_SECRET || secret !== process.env.DIGEST_API_SECRET) {
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
