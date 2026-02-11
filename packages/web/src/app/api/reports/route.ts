import { NextResponse } from 'next/server';
import { getReportSummaries, getReport } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  // TODO: Epic 6 — x402 payment verification middleware

  if (date) {
    const report = await getReport(date);
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    return NextResponse.json(report);
  }

  const summaries = await getReportSummaries();
  return NextResponse.json(summaries);
}
