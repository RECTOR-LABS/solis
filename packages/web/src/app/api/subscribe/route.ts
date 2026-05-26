import { NextResponse } from 'next/server';
import { handleCorsOptions } from '@/lib/api-guard';

const DISABLED_BODY = {
  error: 'Subscriptions are paused (maintenance mode). Follow updates via RSS or the GitHub repo.',
};

export function OPTIONS(request: Request) {
  return handleCorsOptions(request) ?? new Response(null, { status: 204 });
}

export async function POST(_request: Request) {
  return NextResponse.json(DISABLED_BODY, { status: 503 });
}

export async function DELETE(_request: Request) {
  return NextResponse.json(DISABLED_BODY, { status: 503 });
}
