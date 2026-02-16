import { NextResponse } from 'next/server';
import { getReportSummaries, getReport } from '@/lib/reports';
import { apiGuard, getGuardHeaders, handleCorsOptions } from '@/lib/api-guard';

export const revalidate = 3600;

export function OPTIONS(request: Request) {
  return handleCorsOptions(request) ?? new Response(null, { status: 204 });
}

export async function GET(request: Request) {
  const guard = await apiGuard(request, { limit: 30, resource: '/api/reports' });
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const headers = getGuardHeaders(request);

  if (date) {
    const report = await getReport(date);
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404, headers });
    }
    return NextResponse.json(report, { headers });
  }

  const summaries = await getReportSummaries();

  const page = searchParams.get('page');
  if (page) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const start = (pageNum - 1) * limit;
    const data = summaries.slice(start, start + limit);
    return NextResponse.json({
      data,
      pagination: { page: pageNum, limit, total: summaries.length, pages: Math.ceil(summaries.length / limit) },
    }, { headers });
  }

  return NextResponse.json(summaries, { headers });
}
