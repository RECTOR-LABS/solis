import { NextResponse } from 'next/server';
import { apiGuard, getGuardHeaders, checkBodySize } from '@/lib/api-guard';
import { getLatestReport, getReport } from '@/lib/reports';
import { queryLLM } from '@/lib/openrouter';
import type { QueryRequest, QueryResponse } from '@solis/shared';

const SYSTEM_PROMPT = `You are SOLIS, a Solana ecosystem intelligence analyst. You answer questions about the Solana ecosystem based on the provided report data. Be concise, data-driven, and cite specific narratives, metrics, or signals when relevant. If the data doesn't contain enough information to answer, say so clearly.`;

function buildContext(report: import('@solis/shared').FortnightlyReport): string {
  const narrativeSummary = report.narratives
    .map(n => `- ${n.name} (${n.stage}, ${n.confidence}% confidence, ${n.momentum}): ${n.description}`)
    .join('\n');

  const topRepos = report.signals.leading.repos
    .slice(0, 10)
    .map(r => `- ${r.repo}: ${r.stars} stars (+${r.starsDelta}), ${r.commits} commits`)
    .join('\n');

  const topTokens = report.signals.confirming.tokens
    .slice(0, 10)
    .map(t => `- ${t.symbol}: $${t.price.toFixed(4)}, 7d: ${t.priceDelta7d > 0 ? '+' : ''}${t.priceDelta7d.toFixed(1)}%`)
    .join('\n');

  return `Report Date: ${report.generatedAt}\nPeriod: ${report.period.start} to ${report.period.end}\n\nNarratives:\n${narrativeSummary}\n\nTop Repos:\n${topRepos}\n\nTop Tokens:\n${topTokens}\n\nMeta: ${report.meta.narrativesIdentified} narratives, ${report.meta.anomaliesDetected} anomalies, ${report.meta.totalReposAnalyzed} repos analyzed`;
}

export async function POST(request: Request) {
  const bodyCheck = await checkBodySize(request, 1024);
  if (bodyCheck) return bodyCheck;

  const guard = await apiGuard(request, {
    limit: 5,
    resource: '/api/query',
    priceCents: 5,
  });
  if (guard) return guard;

  let body: QueryRequest;
  try {
    body = (await request.json()) as QueryRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.question || typeof body.question !== 'string' || body.question.trim().length === 0) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }

  if (body.question.length > 500) {
    return NextResponse.json({ error: 'Question must be under 500 characters' }, { status: 400 });
  }

  const report = body.reportDate
    ? await getReport(body.reportDate)
    : await getLatestReport();

  if (!report) {
    return NextResponse.json(
      { error: body.reportDate ? `Report not found for ${body.reportDate}` : 'No reports available' },
      { status: 404 },
    );
  }

  const context = buildContext(report);
  const start = Date.now();

  try {
    const result = await queryLLM(SYSTEM_PROMPT, `${context}\n\nQuestion: ${body.question}`);
    const latencyMs = Date.now() - start;

    const reportDate = report.generatedAt.split('T')[0];

    const response: QueryResponse = {
      answer: result.content,
      model: result.model,
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      reportDate,
      latencyMs,
    };

    const headers = getGuardHeaders(request);
    return NextResponse.json(response, { headers });
  } catch (err) {
    const message = process.env.NODE_ENV === 'production'
      ? 'LLM query failed'
      : `LLM query failed: ${(err as Error).message}`;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
