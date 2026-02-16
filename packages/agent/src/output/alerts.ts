import { fetchWithTimeout } from '@solis/shared/fetch';
import { env } from '../config.js';
import { logger } from '../logger.js';
import type { FortnightlyReport } from '@solis/shared';

interface Alert {
  severity: 'high' | 'medium' | 'low';
  emoji: string;
  message: string;
}

/**
 * Detect alert-worthy events from the report and diff.
 */
export function detectAlerts(report: FortnightlyReport): Alert[] {
  const alerts: Alert[] = [];
  const diff = report.diff;

  if (diff) {
    // Stage transitions (up = high severity)
    for (const t of diff.stageTransitions) {
      alerts.push({
        severity: 'high',
        emoji: '📈',
        message: `${t.name}: ${t.from} → ${t.to}`,
      });
    }

    // New narratives
    for (const name of diff.newNarratives) {
      const narrative = report.narratives.find(n => n.name === name);
      const detail = narrative ? ` (${narrative.stage}, ${narrative.confidence}%)` : '';
      alerts.push({
        severity: 'medium',
        emoji: '🆕',
        message: `${name}${detail}`,
      });
    }

    // Removed narratives
    for (const name of diff.removedNarratives) {
      alerts.push({
        severity: 'low',
        emoji: '👻',
        message: `${name} — no longer detected`,
      });
    }
  }

  // Anomaly spikes (z-score above alert threshold)
  const threshold = env.ALERT_ANOMALY_THRESHOLD;

  for (const repo of report.signals.leading.anomalies) {
    if (Math.abs(repo.starsZScore) >= threshold) {
      alerts.push({
        severity: 'medium',
        emoji: '⚡',
        message: `${repo.repo} stars z-score: ${repo.starsZScore.toFixed(2)}`,
      });
    }
    if (Math.abs(repo.commitsZScore) >= threshold) {
      alerts.push({
        severity: 'medium',
        emoji: '⚡',
        message: `${repo.repo} commits z-score: ${repo.commitsZScore.toFixed(2)}`,
      });
    }
  }

  for (const signal of report.signals.coincident.onchain) {
    if (Math.abs(signal.txZScore) >= threshold) {
      alerts.push({
        severity: 'medium',
        emoji: '⚡',
        message: `${signal.programName} tx z-score: ${signal.txZScore.toFixed(2)}`,
      });
    }
  }

  for (const token of report.signals.confirming.tokens) {
    if (Math.abs(token.volumeZScore) >= threshold) {
      alerts.push({
        severity: 'medium',
        emoji: '⚡',
        message: `$${token.symbol} volume z-score: ${token.volumeZScore.toFixed(2)}`,
      });
    }
  }

  return alerts;
}

/**
 * Format alerts into a human-readable message.
 */
function formatAlertMessage(report: FortnightlyReport, alerts: Alert[]): string {
  const date = new Date(report.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const lines = [`🚨 SOLIS Report — ${date}`, ''];

  const transitions = alerts.filter(a => a.emoji === '📈');
  const newNarratives = alerts.filter(a => a.emoji === '🆕');
  const anomalies = alerts.filter(a => a.emoji === '⚡');
  const removed = alerts.filter(a => a.emoji === '👻');

  if (transitions.length > 0) {
    lines.push('📈 Stage Transitions:');
    for (const a of transitions) lines.push(`  • ${a.message}`);
    lines.push('');
  }

  if (newNarratives.length > 0) {
    lines.push('🆕 New Narratives:');
    for (const a of newNarratives) lines.push(`  • ${a.message}`);
    lines.push('');
  }

  if (anomalies.length > 0) {
    lines.push(`⚡ Anomaly Spikes (z > ${env.ALERT_ANOMALY_THRESHOLD}):`);
    for (const a of anomalies.slice(0, 10)) lines.push(`  • ${a.message}`);
    if (anomalies.length > 10) lines.push(`  ... and ${anomalies.length - 10} more`);
    lines.push('');
  }

  if (removed.length > 0) {
    lines.push('👻 Faded Signals:');
    for (const a of removed) lines.push(`  • ${a.message}`);
    lines.push('');
  }

  lines.push(`📊 ${report.meta.narrativesIdentified} narratives | ${report.meta.anomaliesDetected} anomalies | $${report.meta.llmCostUsd.toFixed(2)} LLM cost`);
  lines.push(`🔗 https://solis.rectorspace.com`);

  return lines.join('\n');
}

/**
 * Format a pipeline failure alert.
 */
export function formatFailureMessage(error: string): string {
  return [
    '🔴 SOLIS Pipeline Failed',
    '',
    `Error: ${error}`,
    '',
    'Check workflow logs for details.',
  ].join('\n');
}

/**
 * Send a message via Telegram Bot API.
 */
async function sendTelegram(text: string): Promise<void> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = env;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required');
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${body}`);
  }
}

/**
 * Send a message via Discord webhook.
 */
async function sendDiscord(text: string): Promise<void> {
  const { DISCORD_WEBHOOK_URL } = env;
  if (!DISCORD_WEBHOOK_URL) {
    throw new Error('DISCORD_WEBHOOK_URL is required');
  }

  const res = await fetchWithTimeout(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord webhook error ${res.status}: ${body}`);
  }
}

/**
 * Send a message through the configured alert channel.
 */
async function send(text: string): Promise<void> {
  switch (env.ALERT_CHANNEL) {
    case 'telegram':
      return sendTelegram(text);
    case 'discord':
      return sendDiscord(text);
    default:
      throw new Error(`Unknown alert channel: ${env.ALERT_CHANNEL}`);
  }
}

/**
 * Send post-pipeline alerts for significant events.
 * Gracefully handles failures — alert errors never crash the pipeline.
 */
export async function sendReportAlerts(report: FortnightlyReport): Promise<void> {
  if (!env.ALERTS_ENABLED) return;

  const log = logger.child({ component: 'alerts' });

  try {
    const alerts = detectAlerts(report);

    if (alerts.length === 0) {
      log.info('No alert-worthy events detected');
      return;
    }

    const message = formatAlertMessage(report, alerts);
    log.info({ alertCount: alerts.length, channel: env.ALERT_CHANNEL }, 'Sending alerts');

    await send(message);
    log.info({ alertCount: alerts.length }, 'Alerts sent successfully');
  } catch (err) {
    log.error({ error: err instanceof Error ? err.message : err }, 'Failed to send alerts — pipeline continues');
  }
}

/**
 * Send a pipeline failure alert.
 * Gracefully handles failures — double fault won't crash.
 */
export async function sendFailureAlert(error: string): Promise<void> {
  if (!env.ALERTS_ENABLED) return;

  const log = logger.child({ component: 'alerts' });

  try {
    const message = formatFailureMessage(error);
    await send(message);
    log.info('Failure alert sent');
  } catch (err) {
    log.error({ error: err instanceof Error ? err.message : err }, 'Failed to send failure alert');
  }
}
