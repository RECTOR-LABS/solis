import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { _resetStore } from '@/lib/rate-limit';

const ORIGINAL_ENV = { ...process.env };

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
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

async function getHandlers() {
  const mod = await import('@/app/api/subscribe/route');
  return { POST: mod.POST, DELETE: mod.DELETE };
}

describe('/api/subscribe POST (disabled — maintenance mode)', () => {
  it('returns 503 with explanatory message regardless of body', async () => {
    const { POST } = await getHandlers();
    const res = await POST(makePostRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/paused|disabled|maintenance/i);
  });

  it('returns 503 even with no body', async () => {
    const { POST } = await getHandlers();
    const res = await POST(makePostRequest());
    expect(res.status).toBe(503);
  });
});

describe('/api/subscribe DELETE (disabled — maintenance mode)', () => {
  it('returns 503 regardless of params', async () => {
    const { DELETE } = await getHandlers();
    const res = await DELETE(makeDeleteRequest({ email: 'test@example.com', token: 'whatever' }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/paused|disabled|maintenance/i);
  });
});
