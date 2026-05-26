import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Subscriber } from '@solis/shared';

export class SubscriptionsDisabledError extends Error {
  constructor() {
    super('Subscriptions are paused (maintenance mode)');
    this.name = 'SubscriptionsDisabledError';
  }
}

export async function loadSubscribers(): Promise<Subscriber[]> {
  return [];
}

export async function addSubscriber(_email: string): Promise<void> {
  throw new SubscriptionsDisabledError();
}

export async function removeSubscriber(_email: string): Promise<void> {
  throw new SubscriptionsDisabledError();
}

function getHmacSecret(): string {
  const secret = process.env.DIGEST_UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error('DIGEST_UNSUBSCRIBE_SECRET not configured');
  return secret;
}

export function generateUnsubscribeToken(email: string): string {
  const hmac = createHmac('sha256', getHmacSecret());
  hmac.update(email.toLowerCase().trim());
  return hmac.digest('hex');
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  try {
    const expected = generateUnsubscribeToken(email);
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(token, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 320;
}
