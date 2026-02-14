import { Resend } from 'resend';
import { getReport } from './reports';
import { loadSubscribers, generateUnsubscribeToken } from './subscribers';
import { buildDigestHtml } from './digest-template';

const BASE_URL = 'https://solis.rectorspace.com';

export async function sendDigest(reportDate: string): Promise<{ sent: number; errors: number }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');

  const fromEmail = process.env.DIGEST_FROM_EMAIL || 'digest@solis.rectorspace.com';

  const report = await getReport(reportDate);
  if (!report) throw new Error(`Report not found for ${reportDate}`);

  const subscribers = await loadSubscribers();
  if (subscribers.length === 0) return { sent: 0, errors: 0 };

  const resend = new Resend(apiKey);

  let sent = 0;
  let errors = 0;

  for (const subscriber of subscribers) {
    const token = generateUnsubscribeToken(subscriber.email);
    const unsubscribeUrl = `${BASE_URL}/api/subscribe?email=${encodeURIComponent(subscriber.email)}&token=${token}`;

    const html = buildDigestHtml({
      report,
      reportDate,
      unsubscribeUrl,
    });

    try {
      await resend.emails.send({
        from: `SOLIS Digest <${fromEmail}>`,
        to: subscriber.email,
        subject: `SOLIS Intelligence · ${reportDate}`,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send digest to ${subscriber.email}:`, err);
      errors++;
    }
  }

  return { sent, errors };
}
