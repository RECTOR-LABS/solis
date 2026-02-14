import { NextResponse } from 'next/server';
import { apiGuard, getGuardHeaders } from '@/lib/api-guard';
import {
  addSubscriber,
  removeSubscriber,
  isValidEmail,
  verifyUnsubscribeToken,
} from '@/lib/subscribers';

export async function POST(request: Request) {
  const guard = await apiGuard(request, { limit: 10, resource: '/api/subscribe' });
  if (guard) return guard;

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.email || typeof body.email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  if (!isValidEmail(body.email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  await addSubscriber(body.email);

  const headers = getGuardHeaders(request);
  return NextResponse.json({ ok: true }, { headers });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  if (!email || !token) {
    return NextResponse.json({ error: 'Email and token required' }, { status: 400 });
  }

  if (!verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 401 });
  }

  await removeSubscriber(email);
  return NextResponse.json({ ok: true });
}
