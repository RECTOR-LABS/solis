import type { FortnightlyReport } from '@solis/shared';

interface DigestData {
  report: FortnightlyReport;
  reportDate: string;
  unsubscribeUrl: string;
}

export function buildDigestHtml({ report, reportDate, unsubscribeUrl }: DigestData): string {
  const topNarratives = report.narratives
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  const narrativeRows = topNarratives.map(n => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #1e1e2a;">
        <div style="font-weight: 600; color: #ffffff; font-size: 14px;">${escapeHtml(n.name)}</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">
          ${escapeHtml(n.stage)} · ${n.confidence}% confidence · ${escapeHtml(n.momentum)}
        </div>
        <div style="color: #9ca3af; font-size: 13px; margin-top: 6px;">${escapeHtml(n.description)}</div>
      </td>
    </tr>
  `).join('');

  let diffSection = '';
  if (report.diff) {
    const parts: string[] = [];
    if (report.diff.newNarratives.length > 0) {
      parts.push(`<strong>${report.diff.newNarratives.length}</strong> new narrative${report.diff.newNarratives.length > 1 ? 's' : ''}: ${report.diff.newNarratives.map(escapeHtml).join(', ')}`);
    }
    if (report.diff.removedNarratives.length > 0) {
      parts.push(`<strong>${report.diff.removedNarratives.length}</strong> faded: ${report.diff.removedNarratives.map(escapeHtml).join(', ')}`);
    }
    if (report.diff.stageTransitions.length > 0) {
      parts.push(`<strong>${report.diff.stageTransitions.length}</strong> stage transition${report.diff.stageTransitions.length > 1 ? 's' : ''}`);
    }
    if (parts.length > 0) {
      diffSection = `
        <div style="background: #111118; border: 1px solid #1e1e2a; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <div style="font-weight: 600; color: #ffffff; font-size: 14px; margin-bottom: 8px;">What Changed</div>
          <div style="color: #9ca3af; font-size: 13px; line-height: 1.6;">${parts.join('<br>')}</div>
        </div>
      `;
    }
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #050508; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 24px; font-weight: 700; background: linear-gradient(to right, #9945ff, #14f195); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">SOLIS</div>
      <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">Daily Intelligence Digest · ${escapeHtml(reportDate)}</div>
    </div>

    <!-- Period -->
    <div style="color: #6b7280; font-size: 12px; text-align: center; margin-bottom: 24px;">
      Report period: ${escapeHtml(report.period.start)} to ${escapeHtml(report.period.end)}
    </div>

    <!-- Top Narratives -->
    <div style="background: #0a0a0f; border: 1px solid #1e1e2a; border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
      <div style="padding: 12px 16px; background: #111118; border-bottom: 1px solid #1e1e2a;">
        <span style="font-weight: 600; color: #ffffff; font-size: 14px;">Top Narratives</span>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        ${narrativeRows}
      </table>
    </div>

    ${diffSection}

    <!-- Stats -->
    <div style="text-align: center; color: #6b7280; font-size: 12px; margin: 24px 0;">
      ${report.meta.narrativesIdentified} narratives · ${report.meta.anomaliesDetected} anomalies · ${report.meta.totalReposAnalyzed} repos analyzed
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://solis.rectorspace.com/report/${escapeHtml(reportDate)}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #9945ff, #00d4ff); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View Full Report</a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; color: #6b7280; font-size: 11px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #1e1e2a;">
      SOLIS by RECTOR LABS · Open-source Solana narrative intelligence<br>
      <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
    </div>

  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
