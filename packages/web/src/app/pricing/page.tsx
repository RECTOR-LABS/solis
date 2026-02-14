import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API & Pricing — SOLIS',
  description: 'Programmatic access to Solana narrative intelligence. Free tier with pay-per-request bypass via x402 micropayments.',
};

const REPORTS_EXAMPLE = `{
  "date": "2026-02-12",
  "generatedAt": "2026-02-12T08:12:34.567Z",
  "period": { "start": "2026-01-29", "end": "2026-02-12" },
  "narrativeCount": 8,
  "topNarratives": [
    { "name": "Solana DePIN Expansion", "stage": "GROWING", "momentum": "accelerating" },
    { "name": "ZK Compression Tooling", "stage": "EARLY", "momentum": "stable" }
  ],
  "buildIdeaCount": 12
}`;

const FULL_REPORT_EXAMPLE = `{
  "version": "1.0",
  "generatedAt": "2026-02-12T08:12:34.567Z",
  "period": { "start": "2026-01-29", "end": "2026-02-12" },
  "narratives": [ ... ],
  "buildIdeas": [ ... ],
  "signals": { "leading": ..., "coincident": ..., "confirming": ... },
  "diff": { "newNarratives": [...], "stageTransitions": [...] },
  "meta": { "narrativesIdentified": 8, "anomaliesDetected": 14 }
}`;

const SIGNALS_EXAMPLE = `{
  "date": "2026-02-12",
  "signals": {
    "leading": { "repos": [...], "anomalies": [...], "newRepoClusters": [...] },
    "coincident": { "tvl": { "total": 8234000000, ... }, "onchain": [...] },
    "confirming": { "tokens": [...], "trending": [...] }
  }
}`;

const SEARCH_EXAMPLE = `[
  {
    "name": "Solana DePIN Expansion",
    "stage": "GROWING",
    "momentum": "accelerating",
    "confidence": 82,
    "date": "2026-02-12",
    "relatedTokens": ["HNT", "MOBILE", "IOT"]
  },
  ...
]`;

const INTEGRATION_EXAMPLE = `const res = await fetch('https://solis.rectorspace.com/api/reports');

if (res.status === 402) {
  // Free tier exhausted — x402 payment required
  const { accepts } = await res.json();
  const paymentDetails = accepts[0];

  // Sign USDC transfer using your Solana wallet
  // See x402.org for full client implementation
  const proof = await signPayment(paymentDetails);

  // Retry with payment proof
  const paid = await fetch('https://solis.rectorspace.com/api/reports', {
    headers: { 'x-payment': btoa(JSON.stringify(proof)) }
  });
  const data = await paid.json();
}`;

export default function PricingPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <section>
        <h1 className="text-2xl font-bold">API & Pricing</h1>
        <p className="text-sol-muted mt-2">
          Programmatic access to Solana narrative intelligence. No API keys, no signup —
          just fetch the endpoints. Pay-per-request bypass when you hit rate limits.
        </p>
      </section>

      {/* Tier Comparison */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pricing Tiers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-sol-border rounded-lg p-5 bg-sol-card">
            <h3 className="font-semibold text-sol-green text-lg mb-2">Free Tier</h3>
            <p className="text-2xl font-bold mb-3">$0</p>
            <ul className="text-sm text-sol-muted space-y-2">
              <li>- 30 requests/hr — reports & signals</li>
              <li>- 60 requests/hr — search</li>
              <li>- Per-IP rate limiting</li>
              <li>- No signup required</li>
              <li>- Full response data</li>
            </ul>
          </div>
          <div className="border border-sol-border rounded-lg p-5 bg-sol-card">
            <h3 className="font-semibold text-sol-purple text-lg mb-2">Pay-per-Request</h3>
            <p className="text-2xl font-bold mb-3">$0.01 <span className="text-sm font-normal text-sol-muted">USDC / request</span></p>
            <ul className="text-sm text-sol-muted space-y-2">
              <li>- Unlimited when rate-limited</li>
              <li>- Solana USDC micropayments</li>
              <li>- No API keys needed</li>
              <li>- x402 protocol</li>
              <li>- Only triggers when free tier exhausted</li>
            </ul>
          </div>
        </div>
      </section>

      {/* API Endpoints */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">API Endpoints</h2>
        <p className="text-sol-muted text-sm">
          Base URL: <code className="text-sol-purple">https://solis.rectorspace.com</code>
        </p>
        <div className="border border-sol-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sol-card border-b border-sol-border">
                <th className="text-left p-3 text-sol-muted">Endpoint</th>
                <th className="text-left p-3 text-sol-muted">Method</th>
                <th className="text-left p-3 text-sol-muted">Rate Limit</th>
                <th className="text-left p-3 text-sol-muted">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-sol-border/50">
                <td className="p-3 font-mono text-xs">/api/reports</td>
                <td className="p-3 text-sol-muted">GET</td>
                <td className="p-3 text-sol-muted">30/hr</td>
                <td className="p-3 text-sol-muted">All report summaries</td>
              </tr>
              <tr className="border-b border-sol-border/50">
                <td className="p-3 font-mono text-xs">/api/reports?date=YYYY-MM-DD</td>
                <td className="p-3 text-sol-muted">GET</td>
                <td className="p-3 text-sol-muted">30/hr</td>
                <td className="p-3 text-sol-muted">Full report by date</td>
              </tr>
              <tr className="border-b border-sol-border/50">
                <td className="p-3 font-mono text-xs">/api/signals?date=YYYY-MM-DD</td>
                <td className="p-3 text-sol-muted">GET</td>
                <td className="p-3 text-sol-muted">30/hr</td>
                <td className="p-3 text-sol-muted">Raw signal data by date</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-xs">/api/search</td>
                <td className="p-3 text-sol-muted">GET</td>
                <td className="p-3 text-sol-muted">60/hr</td>
                <td className="p-3 text-sol-muted">All narratives (flat list)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Response Examples */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Response Examples</h2>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-sol-muted mb-2">GET /api/reports — Report Summaries</h3>
            <pre className="bg-sol-dark rounded-lg p-4 overflow-x-auto text-sm font-mono text-sol-muted border border-sol-border">
              {REPORTS_EXAMPLE}
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-medium text-sol-muted mb-2">GET /api/reports?date=2026-02-12 — Full Report</h3>
            <pre className="bg-sol-dark rounded-lg p-4 overflow-x-auto text-sm font-mono text-sol-muted border border-sol-border">
              {FULL_REPORT_EXAMPLE}
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-medium text-sol-muted mb-2">GET /api/signals?date=2026-02-12 — Raw Signals</h3>
            <pre className="bg-sol-dark rounded-lg p-4 overflow-x-auto text-sm font-mono text-sol-muted border border-sol-border">
              {SIGNALS_EXAMPLE}
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-medium text-sol-muted mb-2">GET /api/search — All Narratives</h3>
            <pre className="bg-sol-dark rounded-lg p-4 overflow-x-auto text-sm font-mono text-sol-muted border border-sol-border">
              {SEARCH_EXAMPLE}
            </pre>
          </div>
        </div>
      </section>

      {/* Rate Limit Headers */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Rate Limit Headers</h2>
        <p className="text-sol-muted text-sm">
          Every response includes rate limit headers so you can track your usage:
        </p>
        <div className="border border-sol-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sol-card border-b border-sol-border">
                <th className="text-left p-3 text-sol-muted">Header</th>
                <th className="text-left p-3 text-sol-muted">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-sol-border/50">
                <td className="p-3 font-mono text-xs">X-RateLimit-Limit</td>
                <td className="p-3 text-sol-muted">Maximum requests per window</td>
              </tr>
              <tr className="border-b border-sol-border/50">
                <td className="p-3 font-mono text-xs">X-RateLimit-Remaining</td>
                <td className="p-3 text-sol-muted">Requests remaining in current window</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-xs">X-RateLimit-Reset</td>
                <td className="p-3 text-sol-muted">Unix timestamp (seconds) when window resets</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* x402 Payment Flow */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">x402 Payment Flow</h2>
        <p className="text-sol-muted text-sm">
          When your free tier is exhausted, the API returns a <code className="text-sol-purple">402 Payment Required</code> response
          with payment details. The{' '}
          <a href="https://x402.org" target="_blank" rel="noopener noreferrer" className="text-sol-purple hover:underline">x402 protocol</a>{' '}
          enables trustless micropayments — no accounts, no subscriptions.
        </p>

        <div className="space-y-3">
          <div className="border border-sol-border rounded-lg p-4 bg-sol-card">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold bg-sol-purple/20 text-sol-purple px-2 py-0.5 rounded">1</span>
              <h3 className="font-medium text-sm">Normal Request</h3>
            </div>
            <p className="text-sol-muted text-sm ml-8">
              Send a GET request to any API endpoint. If within rate limits, you get the response immediately.
            </p>
          </div>

          <div className="border border-sol-border rounded-lg p-4 bg-sol-card">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold bg-sol-purple/20 text-sol-purple px-2 py-0.5 rounded">2</span>
              <h3 className="font-medium text-sm">402 Response</h3>
            </div>
            <p className="text-sol-muted text-sm ml-8">
              Rate limit exceeded. Response body contains payment details: amount (USDC), recipient address,
              network (solana-mainnet), and USDC mint address.
            </p>
          </div>

          <div className="border border-sol-border rounded-lg p-4 bg-sol-card">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold bg-sol-purple/20 text-sol-purple px-2 py-0.5 rounded">3</span>
              <h3 className="font-medium text-sm">Sign USDC Transfer</h3>
            </div>
            <p className="text-sol-muted text-sm ml-8">
              Client signs a Solana USDC transfer for the specified amount using their wallet.
            </p>
          </div>

          <div className="border border-sol-border rounded-lg p-4 bg-sol-card">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold bg-sol-purple/20 text-sol-purple px-2 py-0.5 rounded">4</span>
              <h3 className="font-medium text-sm">Retry with Payment</h3>
            </div>
            <p className="text-sol-muted text-sm ml-8">
              Retry the original request with the payment proof in the <code className="text-sol-purple text-xs">x-payment</code> header
              (base64-encoded JSON).
            </p>
          </div>

          <div className="border border-sol-border rounded-lg p-4 bg-sol-card">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold bg-sol-purple/20 text-sol-purple px-2 py-0.5 rounded">5</span>
              <h3 className="font-medium text-sm">Verified Access</h3>
            </div>
            <p className="text-sol-muted text-sm ml-8">
              Server verifies payment via the x402 facilitator. If valid, the rate limit is bypassed and data is returned.
            </p>
          </div>
        </div>
      </section>

      {/* Integration Example */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Integration Example</h2>
        <p className="text-sol-muted text-sm">
          Illustrative TypeScript example. See{' '}
          <a href="https://x402.org" target="_blank" rel="noopener noreferrer" className="text-sol-purple hover:underline">x402.org</a>{' '}
          for full client SDK implementation.
        </p>
        <pre className="bg-sol-dark rounded-lg p-4 overflow-x-auto text-sm font-mono text-sol-muted border border-sol-border">
          {INTEGRATION_EXAMPLE}
        </pre>
      </section>

      {/* Notes */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Notes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="border border-sol-border rounded-lg p-4 bg-sol-card">
            <h3 className="font-semibold text-sol-green text-sm mb-1">No API Keys</h3>
            <p className="text-sol-muted text-xs">
              Zero signup, zero configuration. Just fetch the endpoints.
            </p>
          </div>
          <div className="border border-sol-border rounded-lg p-4 bg-sol-card">
            <h3 className="font-semibold text-sol-purple text-sm mb-1">Per-Request Pricing</h3>
            <p className="text-sol-muted text-xs">
              No subscriptions, no commitments. Pay only when you exceed the free tier.
            </p>
          </div>
          <div className="border border-sol-border rounded-lg p-4 bg-sol-card">
            <h3 className="font-semibold text-sol-blue text-sm mb-1">Solana USDC Only</h3>
            <p className="text-sol-muted text-xs">
              Payments on Solana mainnet using USDC (SPL token). Sub-cent transaction fees.
            </p>
          </div>
          <div className="border border-sol-border rounded-lg p-4 bg-sol-card">
            <h3 className="font-semibold text-white text-sm mb-1">Open Source</h3>
            <p className="text-sol-muted text-xs">
              Full source on{' '}
              <a href="https://github.com/RECTOR-LABS/solis" target="_blank" rel="noopener noreferrer" className="text-sol-purple hover:underline">
                GitHub
              </a>. Self-host your own instance if you prefer.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
