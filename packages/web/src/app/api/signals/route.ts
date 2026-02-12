import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { apiGuard, getGuardHeaders } from '@/lib/api-guard';

export const revalidate = 3600;

const REPORTS_DIR = join(process.cwd(), '../../reports/signals');

export async function GET(request: Request) {
  const guard = await apiGuard(request, { limit: 30, resource: '/api/signals' });
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const headers = getGuardHeaders(request);

  if (!date) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400, headers });
  }

  try {
    const content = await readFile(join(REPORTS_DIR, `${date}.json`), 'utf-8');
    return NextResponse.json(JSON.parse(content), { headers });
  } catch {
    return NextResponse.json({ error: 'Signals not found' }, { status: 404, headers });
  }
}
