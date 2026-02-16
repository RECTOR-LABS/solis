import { checkRateLimit, getClientIp, getRateLimitHeaders } from './rate-limit';
import { isX402Enabled, buildPaymentRequired, verifyPayment } from './x402';

export interface GuardConfig {
  limit: number;
  windowMs?: number;
  resource: string;
  priceCents?: number; // override X402_PRICE_CENTS for this route
}

const DEFAULT_WINDOW_MS = 3_600_000; // 1 hour

const ALLOWED_ORIGINS = new Set([
  'https://solis.rectorspace.com',
  'http://localhost:3001',
]);

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-payment, x-digest-secret',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCorsOptions(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null;
  const cors = getCorsHeaders(request);
  if (!cors['Access-Control-Allow-Origin']) {
    return new Response(null, { status: 204 });
  }
  return new Response(null, { status: 204, headers: cors });
}

/**
 * API guard — rate limiting + optional x402 micropayments.
 * Returns null to proceed, or a Response to reject (402/429/401).
 */
export async function apiGuard(
  request: Request,
  config: GuardConfig,
): Promise<Response | null> {
  const limit = Number(process.env.API_RATE_LIMIT) || config.limit;
  const windowMs = Number(process.env.API_RATE_WINDOW_MS) || config.windowMs || DEFAULT_WINDOW_MS;

  // Check for x402 payment proof — bypass rate limit if valid
  const paymentHeader = request.headers.get('x-payment');
  if (paymentHeader && isX402Enabled()) {
    const result = await verifyPayment(paymentHeader);
    if (result.valid) return null; // paid — skip rate limit
    return new Response(JSON.stringify({ error: result.error || 'Invalid payment' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limit check
  const ip = getClientIp(request);
  const rateLimitResult = checkRateLimit(ip, { limit, windowMs });
  const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

  if (rateLimitResult.allowed) {
    // Attach headers to the request for the route to pick up
    // Since we can't modify the response from here, we stash headers
    (request as Request & { _rateLimitHeaders?: Record<string, string> })._rateLimitHeaders =
      rateLimitHeaders;
    return null;
  }

  // Over limit — return 402 or 429
  if (isX402Enabled()) {
    const res = buildPaymentRequired(config.resource, config.priceCents);
    // Add rate limit headers to 402 response
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(rateLimitHeaders)) headers.set(k, v);
    return new Response(res.body, { status: 402, headers });
  }

  return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', ...rateLimitHeaders },
  });
}

/** Extract stashed rate limit headers + CORS from the request (set by apiGuard). */
export function getGuardHeaders(request: Request): Record<string, string> {
  const rateLimit = (request as Request & { _rateLimitHeaders?: Record<string, string> })._rateLimitHeaders || {};
  return { ...rateLimit, ...getCorsHeaders(request) };
}
