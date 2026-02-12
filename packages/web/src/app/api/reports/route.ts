import { NextResponse } from 'next/server';
import { getReportSummaries, getReport } from '@/lib/reports';
import { apiGuard, getGuardHeaders } from '@/lib/api-guard';

export const revalidate = 3600;

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
  return NextResponse.json(summaries, { headers });
}
