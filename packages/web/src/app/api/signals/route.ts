import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { apiGuard, getGuardHeaders, handleCorsOptions } from '@/lib/api-guard';

export const revalidate = 3600;

const REPORTS_DIR = join(process.cwd(), '../../reports/signals');

export function OPTIONS(request: Request) {
  return handleCorsOptions(request) ?? new Response(null, { status: 204 });
}

export async function GET(request: Request) {
  const guard = await apiGuard(request, { limit: 30, resource: '/api/signals' });
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const headers = getGuardHeaders(request);

  if (!date) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400, headers });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400, headers });
  }

  try {
    const content = await readFile(join(REPORTS_DIR, `${date}.json`), 'utf-8');
    return NextResponse.json(JSON.parse(content), { headers });
  } catch {
    return NextResponse.json({ error: 'Signals not found' }, { status: 404, headers });
  }
}
