import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const ORIGINAL_ENV = { ...process.env };

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'solis-subs-'));
  process.env = { ...ORIGINAL_ENV };
  process.env.DATA_DIR = tmpDir;
  process.env.DIGEST_UNSUBSCRIBE_SECRET = 'test-secret-key-123';
  // Reset module cache to pick up new DATA_DIR
  vi.resetModules();
});

afterEach(async () => {
  process.env = ORIGINAL_ENV;
  await rm(tmpDir, { recursive: true, force: true });
});

async function getSubs() {
  return import('@/lib/subscribers');
}

describe('subscribers', () => {
  it('returns empty array when no file exists', async () => {
    const { loadSubscribers } = await getSubs();
    const subs = await loadSubscribers();
    expect(subs).toEqual([]);
  });

  it('adds a subscriber', async () => {
    const { addSubscriber, loadSubscribers } = await getSubs();
    await addSubscriber('test@example.com');
    const subs = await loadSubscribers();
    expect(subs).toHaveLength(1);
    expect(subs[0].email).toBe('test@example.com');
    expect(subs[0].verified).toBe(true);
    expect(subs[0].subscribedAt).toBeTruthy();
  });

  it('deduplicates subscribers (case-insensitive)', async () => {
    const { addSubscriber, loadSubscribers } = await getSubs();
    await addSubscriber('Test@Example.com');
    await addSubscriber('test@example.com');
    const subs = await loadSubscribers();
    expect(subs).toHaveLength(1);
  });

  it('removes a subscriber', async () => {
    const { addSubscriber, removeSubscriber, loadSubscribers } = await getSubs();
    await addSubscriber('a@test.com');
    await addSubscriber('b@test.com');
    await removeSubscriber('a@test.com');
    const subs = await loadSubscribers();
    expect(subs).toHaveLength(1);
    expect(subs[0].email).toBe('b@test.com');
  });

  it('removing nonexistent subscriber is a no-op', async () => {
    const { addSubscriber, removeSubscriber, loadSubscribers } = await getSubs();
    await addSubscriber('a@test.com');
    await removeSubscriber('z@test.com');
    const subs = await loadSubscribers();
    expect(subs).toHaveLength(1);
  });

  it('writes atomic file (tmp + rename)', async () => {
    const { addSubscriber } = await getSubs();
    await addSubscriber('test@example.com');
    const content = await readFile(join(tmpDir, 'subscribers.json'), 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toHaveLength(1);
  });
});

describe('unsubscribe tokens', () => {
  it('generates and verifies tokens', async () => {
    const { generateUnsubscribeToken, verifyUnsubscribeToken } = await getSubs();
    const token = generateUnsubscribeToken('test@example.com');
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64); // sha256 hex
    expect(verifyUnsubscribeToken('test@example.com', token)).toBe(true);
  });

  it('rejects invalid tokens', async () => {
    const { verifyUnsubscribeToken } = await getSubs();
    expect(verifyUnsubscribeToken('test@example.com', 'deadbeef'.repeat(8))).toBe(false);
  });

  it('rejects tokens for different email', async () => {
    const { generateUnsubscribeToken, verifyUnsubscribeToken } = await getSubs();
    const token = generateUnsubscribeToken('a@test.com');
    expect(verifyUnsubscribeToken('b@test.com', token)).toBe(false);
  });

  it('is case-insensitive', async () => {
    const { generateUnsubscribeToken, verifyUnsubscribeToken } = await getSubs();
    const token = generateUnsubscribeToken('Test@Example.com');
    expect(verifyUnsubscribeToken('test@example.com', token)).toBe(true);
  });
});

describe('email validation', () => {
  it('accepts valid emails', async () => {
    const { isValidEmail } = await getSubs();
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a.b+c@sub.domain.co')).toBe(true);
  });

  it('rejects invalid emails', async () => {
    const { isValidEmail } = await getSubs();
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@no-user.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects overly long emails', async () => {
    const { isValidEmail } = await getSubs();
    expect(isValidEmail(`${'a'.repeat(312)}@test.com`)).toBe(false);
  });
});
