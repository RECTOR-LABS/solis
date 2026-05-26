import { describe, it, expect } from 'vitest';
import {
  addSubscriber,
  removeSubscriber,
  loadSubscribers,
  isValidEmail,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  SubscriptionsDisabledError,
} from '@/lib/subscribers';

describe('subscribers (disabled — maintenance mode)', () => {
  it('loadSubscribers returns empty array', async () => {
    const subs = await loadSubscribers();
    expect(subs).toEqual([]);
  });

  it('addSubscriber throws SubscriptionsDisabledError', async () => {
    await expect(addSubscriber('test@example.com')).rejects.toBeInstanceOf(
      SubscriptionsDisabledError,
    );
  });

  it('removeSubscriber throws SubscriptionsDisabledError', async () => {
    await expect(removeSubscriber('test@example.com')).rejects.toBeInstanceOf(
      SubscriptionsDisabledError,
    );
  });
});

describe('unsubscribe tokens (preserved — used by historical email links)', () => {
  it('generates and verifies tokens', () => {
    process.env.DIGEST_UNSUBSCRIBE_SECRET = 'test-secret-key-123';
    const token = generateUnsubscribeToken('test@example.com');
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64);
    expect(verifyUnsubscribeToken('test@example.com', token)).toBe(true);
  });

  it('rejects invalid tokens', () => {
    process.env.DIGEST_UNSUBSCRIBE_SECRET = 'test-secret-key-123';
    expect(verifyUnsubscribeToken('test@example.com', 'deadbeef'.repeat(8))).toBe(false);
  });

  it('rejects tokens for different email (HMAC scoped to email)', () => {
    process.env.DIGEST_UNSUBSCRIBE_SECRET = 'test-secret-key-123';
    const token = generateUnsubscribeToken('a@test.com');
    expect(verifyUnsubscribeToken('b@test.com', token)).toBe(false);
  });

  it('is case-insensitive', () => {
    process.env.DIGEST_UNSUBSCRIBE_SECRET = 'test-secret-key-123';
    const token = generateUnsubscribeToken('Test@Example.com');
    expect(verifyUnsubscribeToken('test@example.com', token)).toBe(true);
  });
});

describe('email validation', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a.b+c@sub.domain.co')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@no-user.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects overly long emails', () => {
    expect(isValidEmail(`${'a'.repeat(312)}@test.com`)).toBe(false);
  });
});
