import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { _resetStore } from '@/lib/rate-limit';

const ORIGINAL_ENV = { ...process.env };

// Mock subscribers
vi.mock('@/lib/subscribers', () => ({
  addSubscriber: vi.fn(),
  removeSubscriber: vi.fn(),
  isValidEmail: vi.fn((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  verifyUnsubscribeToken: vi.fn(),
}));

import { addSubscriber, removeSubscriber, verifyUnsubscribeToken, isValidEmail } from '@/lib/subscribers';

function makePostRequest(body?: object): Request {
  return new Request('http://localhost/api/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '10.0.0.1',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeDeleteRequest(params?: Record<string, string>): Request {
  const url = new URL('http://localhost/api/subscribe');
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new Request(url.toString(), {
    method: 'DELETE',
    headers: { 'x-forwarded-for': '10.0.0.2' },
  });
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.ENABLE_X402;
  _resetStore();
  vi.mocked(addSubscriber).mockResolvedValue(undefined);
  vi.mocked(removeSubscriber).mockResolvedValue(undefined);
  vi.mocked(verifyUnsubscribeToken).mockReturnValue(false);
  vi.mocked(isValidEmail).mockImplementation((email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320,
  );
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

async function getHandlers() {
  const mod = await import('@/app/api/subscribe/route');
  return { POST: mod.POST, DELETE: mod.DELETE };
}

describe('/api/subscribe POST', () => {
  it('returns 400 for missing email', async () => {
    const { POST } = await getHandlers();
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('required');
  });

  it('returns 400 for invalid email format', async () => {
    vi.mocked(isValidEmail).mockReturnValue(false);
    const { POST } = await getHandlers();
    const res = await POST(makePostRequest({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid email');
  });

  it('returns 200 for valid subscribe', async () => {
    const { POST } = await getHandlers();
    const res = await POST(makePostRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(addSubscriber).toHaveBeenCalledWith('test@example.com');
  });

  it('returns 400 for invalid JSON', async () => {
    const { POST } = await getHandlers();
    const req = new Request('http://localhost/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '10.0.0.1',
      },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    const { POST } = await getHandlers();
    // 10 requests allowed for subscribe
    for (let i = 0; i < 10; i++) {
      await POST(makePostRequest({ email: `user${i}@example.com` }));
    }
    const res = await POST(makePostRequest({ email: 'final@example.com' }));
    expect(res.status).toBe(429);
  });
});

describe('/api/subscribe DELETE', () => {
  it('returns 400 for missing params', async () => {
    const { DELETE } = await getHandlers();
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('required');
  });

  it('returns 400 for missing token', async () => {
    const { DELETE } = await getHandlers();
    const res = await DELETE(makeDeleteRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid token', async () => {
    vi.mocked(verifyUnsubscribeToken).mockReturnValue(false);
    const { DELETE } = await getHandlers();
    const res = await DELETE(makeDeleteRequest({ email: 'test@example.com', token: 'bad' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Invalid');
  });

  it('returns 200 for valid unsubscribe', async () => {
    vi.mocked(verifyUnsubscribeToken).mockReturnValue(true);
    const { DELETE } = await getHandlers();
    const res = await DELETE(makeDeleteRequest({ email: 'test@example.com', token: 'valid' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(removeSubscriber).toHaveBeenCalledWith('test@example.com');
  });
});
