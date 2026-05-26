import { NextResponse } from 'next/server';

export async function POST(_request: Request) {
  return NextResponse.json(
    { error: 'Digest delivery is paused (maintenance mode).' },
    { status: 503 },
  );
}
