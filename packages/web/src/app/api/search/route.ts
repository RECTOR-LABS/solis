import { NextResponse } from 'next/server';
import { getAllNarrativesFlat } from '@/lib/reports';
import { apiGuard, getGuardHeaders, handleCorsOptions } from '@/lib/api-guard';

export const revalidate = 3600;

export function OPTIONS(request: Request) {
  return handleCorsOptions(request) ?? new Response(null, { status: 204 });
}

export async function GET(request: Request) {
  const guard = await apiGuard(request, { limit: 60, resource: '/api/search' });
  if (guard) return guard;

  const headers = getGuardHeaders(request);
  const items = await getAllNarrativesFlat();

  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page');
  if (page) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const start = (pageNum - 1) * limit;
    const data = items.slice(start, start + limit);
    return NextResponse.json({
      data,
      pagination: { page: pageNum, limit, total: items.length, pages: Math.ceil(items.length / limit) },
    }, { headers });
  }

  return NextResponse.json(items, { headers });
}
