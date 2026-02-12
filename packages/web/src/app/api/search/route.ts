import { NextResponse } from 'next/server';
import { getAllNarrativesFlat } from '@/lib/reports';
import { apiGuard, getGuardHeaders } from '@/lib/api-guard';

export const revalidate = 3600;

export async function GET(request: Request) {
  const guard = await apiGuard(request, { limit: 60, resource: '/api/search' });
  if (guard) return guard;

  const headers = getGuardHeaders(request);
  const items = await getAllNarrativesFlat();
  return NextResponse.json(items, { headers });
}
