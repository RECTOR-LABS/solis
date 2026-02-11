import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const dynamic = 'force-dynamic';

const REPORTS_DIR = join(process.cwd(), '../../reports/signals');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  // TODO: Epic 6 — x402 payment verification middleware

  if (!date) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400 });
  }

  try {
    const content = await readFile(join(REPORTS_DIR, `${date}.json`), 'utf-8');
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ error: 'Signals not found' }, { status: 404 });
  }
}
