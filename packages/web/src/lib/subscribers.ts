import { readFile, writeFile, rename, mkdir, open, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Subscriber } from '@solis/shared';

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const SUBS_FILE = 'subscribers.json';
const LOCK_TIMEOUT_MS = 5_000;
const LOCK_RETRY_MS = 50;

function getSubsPath(): string {
  return join(DATA_DIR, SUBS_FILE);
}

function getLockPath(): string {
  return `${getSubsPath()}.lock`;
}

async function withFileLock<T>(fn: () => Promise<T>): Promise<T> {
  const lockPath = getLockPath();
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const fh = await open(lockPath, 'wx');
      await fh.writeFile(String(process.pid));
      await fh.close();
      try {
        return await fn();
      } finally {
        await unlink(lockPath).catch(() => {});
      }
    } catch (err: any) {
      if (err.code !== 'EEXIST') throw err;
      await new Promise(r => setTimeout(r, LOCK_RETRY_MS));
    }
  }

  // Stale lock recovery — remove and retry once
  await unlink(lockPath).catch(() => {});
  const fh = await open(lockPath, 'wx');
  await fh.writeFile(String(process.pid));
  await fh.close();
  try {
    return await fn();
  } finally {
    await unlink(lockPath).catch(() => {});
  }
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
  await withFileLock(async () => {
    const subscribers = await loadSubscribers();
    const existing = subscribers.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (existing) return;

    subscribers.push({
      email: email.toLowerCase().trim(),
      subscribedAt: new Date().toISOString(),
      verified: true, // no email verification flow yet
    });

    await saveSubscribers(subscribers);
  });
}

export async function removeSubscriber(email: string): Promise<void> {
  await withFileLock(async () => {
    const subscribers = await loadSubscribers();
    const filtered = subscribers.filter(s => s.email.toLowerCase() !== email.toLowerCase());
    if (filtered.length === subscribers.length) return;
    await saveSubscribers(filtered);
  });
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
