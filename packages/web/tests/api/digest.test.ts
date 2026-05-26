import { describe, it, expect } from 'vitest';

async function getHandler() {
  const mod = await import('@/app/api/digest/route');
  return mod.POST;
}

function makeRequest(headers?: Record<string, string>): Request {
  return new Request('http://localhost/api/digest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ date: '2026-02-14' }),
  });
}

describe('/api/digest (disabled — maintenance mode)', () => {
  it('returns 503 regardless of secret header', async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ 'x-digest-secret': 'any-secret' }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/paused|disabled|maintenance/i);
  });

  it('returns 503 with no auth header', async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest());
    expect(res.status).toBe(503);
  });

  it('returns 503 with no body', async () => {
    const POST = await getHandler();
    const res = await POST(new Request('http://localhost/api/digest', { method: 'POST' }));
    expect(res.status).toBe(503);
  });

  it('returns json with error field', async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest());
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  it('returns 503 regardless of date value', async () => {
    const POST = await getHandler();
    const req = new Request('http://localhost/api/digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2099-01-01' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it('error message mentions maintenance or paused', async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest());
    const body = await res.json();
    expect(body.error).toMatch(/paused|maintenance/i);
  });
});
