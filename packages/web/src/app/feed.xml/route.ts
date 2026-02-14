import { getReportSummaries, getReport } from '@/lib/reports';

export const revalidate = 3600;

const SITE_URL = 'https://solis.rectorspace.com';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc2822(iso: string): string {
  return new Date(iso).toUTCString();
}

export async function GET() {
  const summaries = await getReportSummaries();

  let lastBuildDate = new Date().toUTCString();
  if (summaries.length > 0) {
    const latest = await getReport(summaries[0].date);
    if (latest) {
      lastBuildDate = toRfc2822(latest.generatedAt);
    }
  }

  const items: string[] = [];

  for (const summary of summaries) {
    const report = await getReport(summary.date);
    const pubDate = report ? toRfc2822(report.generatedAt) : toRfc2822(`${summary.date}T08:00:00Z`);
    const link = `${SITE_URL}/report/${summary.date}`;

    const topNarratives = summary.topNarratives
      .map(n => `${escapeXml(n.name)} (${n.stage})`)
      .join(', ');

    const anomalyCount = report?.meta.anomaliesDetected ?? 0;

    const description = [
      `${summary.narrativeCount} narratives detected`,
      topNarratives ? `Top signals: ${topNarratives}` : null,
      `${anomalyCount} anomalies`,
      `${summary.buildIdeaCount} build ideas`,
    ].filter(Boolean).join(' · ');

    items.push(`    <item>
      <title>${escapeXml(`SOLIS Report — ${summary.date}`)}</title>
      <link>${link}</link>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}</description>
      <guid isPermaLink="true">${link}</guid>
    </item>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>SOLIS — Solana Intelligence Signal</title>
    <link>${SITE_URL}</link>
    <description>Daily intelligence reports detecting emerging Solana ecosystem narratives through developer activity, onchain metrics, and market signals.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items.join('\n')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
