import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const ORIGINAL_ENV = { ...process.env };
const TEST_SECRET = 'test-digest-secret-123';

// Mock digest sender
vi.mock('@/lib/digest', () => ({
  sendDigest: vi.fn(),
}));

// Mock env module — webEnv reads at import time, so provide defaults
vi.mock('@/lib/env', () => ({
  webEnv: {
    DIGEST_API_SECRET: TEST_SECRET,
    NODE_ENV: 'test',
  },
}));

import { sendDigest } from '@/lib/digest';

function makeRequest(body?: string | object, headers?: Record<string, string>): Request {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-forwarded-for': '10.0.0.1',
  };
  return new Request('http://localhost/api/digest', {
    method: 'POST',
    headers: { ...defaultHeaders, ...headers },
    body: typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.mocked(sendDigest).mockResolvedValue({ sent: 5, errors: 0 });
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

async function getHandler() {
  const mod = await import('@/app/api/digest/route');
  return mod.POST;
}

describe('/api/digest', () => {
  it('returns 401 when no secret header provided', async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ date: '2026-02-14' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Unauthorized');
  });

  it('returns 401 for wrong secret', async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ date: '2026-02-14' }, { 'x-digest-secret': 'wrong-secret' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON body', async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest('not-json{', { 'x-digest-secret': TEST_SECRET }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid JSON');
  });

  it('returns 400 for missing date', async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({}, { 'x-digest-secret': TEST_SECRET }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Date');
  });

  it('returns 200 for valid request', async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ date: '2026-02-14' }, { 'x-digest-secret': TEST_SECRET }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(5);
    expect(body.errors).toBe(0);
    expect(sendDigest).toHaveBeenCalledWith('2026-02-14');
  });

  it('returns 500 when sendDigest throws', async () => {
    vi.mocked(sendDigest).mockRejectedValue(new Error('Resend API down'));
    const POST = await getHandler();
    const res = await POST(makeRequest({ date: '2026-02-14' }, { 'x-digest-secret': TEST_SECRET }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Digest failed');
  });
});
