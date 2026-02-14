import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Subscriber } from '@solis/shared';

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const SUBS_FILE = 'subscribers.json';

function getSubsPath(): string {
  return join(DATA_DIR, SUBS_FILE);
}

export async function loadSubscribers(): Promise<Subscriber[]> {
  try {
    const content = await readFile(getSubsPath(), 'utf-8');
    return JSON.parse(content) as Subscriber[];
  } catch {
    return [];
  }
}

async function saveSubscribers(subscribers: Subscriber[]): Promise<void> {
  const path = getSubsPath();
  const tmpPath = `${path}.tmp.${Date.now()}`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(tmpPath, JSON.stringify(subscribers, null, 2), 'utf-8');
  await rename(tmpPath, path);
}

export async function addSubscriber(email: string): Promise<void> {
  const subscribers = await loadSubscribers();
  const existing = subscribers.find(s => s.email.toLowerCase() === email.toLowerCase());
  if (existing) return; // already subscribed

  subscribers.push({
    email: email.toLowerCase().trim(),
    subscribedAt: new Date().toISOString(),
    verified: true, // no email verification flow yet
  });

  await saveSubscribers(subscribers);
}

export async function removeSubscriber(email: string): Promise<void> {
  const subscribers = await loadSubscribers();
  const filtered = subscribers.filter(s => s.email.toLowerCase() !== email.toLowerCase());
  if (filtered.length === subscribers.length) return; // not found
  await saveSubscribers(filtered);
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
