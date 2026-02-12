export default function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Methodology</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-sol-purple">3-Layer Signal Architecture</h2>
        <p className="text-sol-muted">
          SOLIS detects emerging Solana narratives by triangulating signals across three independent data layers,
          each with different lead times relative to market price action.
        </p>

        <div className="space-y-3">
          <div className="border border-sol-border rounded-lg p-4 bg-sol-card">
            <h3 className="font-semibold text-sol-purple mb-1">Layer 1: Leading (GitHub)</h3>
            <p className="text-sol-muted text-sm mb-2">
              Developer activity that precedes market movement by 2-4 weeks. When devs start building,
              the market hasn&apos;t noticed yet.
            </p>
            <ul className="text-xs text-sol-muted space-y-1">
              <li>- Star velocity on 200+ tracked Solana repos</li>
              <li>- Commit frequency surges (z-score &gt; 2.0)</li>
              <li>- New repo clusters by topic</li>
              <li>- Contributor count deltas</li>
              <li>- Fork rate anomalies</li>
            </ul>
          </div>

          <div className="border border-sol-border rounded-lg p-4 bg-sol-card">
            <h3 className="font-semibold text-sol-blue mb-1">Layer 2: Coincident (DeFi Llama + Helius)</h3>
            <p className="text-sol-muted text-sm mb-2">
              Real-time capital and onchain activity. When TVL and transaction volume align with dev signals,
              the narrative is materializing.
            </p>
            <ul className="text-xs text-sol-muted space-y-1">
              <li>- Solana chain TVL history and protocol-level changes</li>
              <li>- DEX volumes and fees</li>
              <li>- Stablecoin flows (net inflows/outflows)</li>
              <li>- Program activity (transaction volume per program)</li>
            </ul>
          </div>

          <div className="border border-sol-border rounded-lg p-4 bg-sol-card">
            <h3 className="font-semibold text-sol-green mb-1">Layer 3: Confirming (CoinGecko)</h3>
            <p className="text-sol-muted text-sm mb-2">
              Market price and volume data. When tokens in a narrative cluster start moving,
              the signal is confirmed but alpha is diminishing.
            </p>
            <ul className="text-xs text-sol-muted space-y-1">
              <li>- Solana ecosystem token prices and volumes</li>
              <li>- Category market cap movements</li>
              <li>- Trending coins</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Signal Stage Classification</h2>
        <div className="border border-sol-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sol-card border-b border-sol-border">
                <th className="text-left p-3 text-sol-muted">Stage</th>
                <th className="text-left p-3 text-sol-muted">Layers Active</th>
                <th className="text-left p-3 text-sol-muted">Alpha Potential</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-sol-border/50">
                <td className="p-3 text-blue-400 font-semibold">EARLY</td>
                <td className="p-3 text-sol-muted">Layer 1 only</td>
                <td className="p-3 text-sol-muted">Highest — devs building before market notices</td>
              </tr>
              <tr className="border-b border-sol-border/50">
                <td className="p-3 text-yellow-400 font-semibold">EMERGING</td>
                <td className="p-3 text-sol-muted">Layer 1 + 2</td>
                <td className="p-3 text-sol-muted">High — builders and capital moving together</td>
              </tr>
              <tr className="border-b border-sol-border/50">
                <td className="p-3 text-orange-400 font-semibold">GROWING</td>
                <td className="p-3 text-sol-muted">All 3 layers</td>
                <td className="p-3 text-sol-muted">Moderate — gaining mainstream traction</td>
              </tr>
              <tr>
                <td className="p-3 text-red-400 font-semibold">MAINSTREAM</td>
                <td className="p-3 text-sol-muted">All 3, high confidence</td>
                <td className="p-3 text-sol-muted">Low — likely already priced in</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Anomaly Detection</h2>
        <p className="text-sol-muted text-sm">
          SOLIS uses z-score analysis to identify statistically significant deviations from baseline activity.
          A z-score above 2.0 (2 standard deviations) flags a metric as anomalous.
          No machine learning is involved — it&apos;s pure statistical math applied to time-series data.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Two-LLM Pattern</h2>
        <p className="text-sol-muted text-sm">
          SOLIS uses two LLMs with different roles:
        </p>
        <ul className="text-sol-muted text-sm space-y-2">
          <li>
            <span className="text-white font-medium">Claude (Agent SDK)</span> — Orchestrates the pipeline,
            uses tools, handles errors. Runs the overall decision-making.
          </li>
          <li>
            <span className="text-white font-medium">GLM-4.7 (via OpenRouter)</span> — Handles bulk analysis:
            narrative clustering, idea generation, signal summarization. 10x cheaper than Claude for text analysis.
          </li>
        </ul>
        <p className="text-sol-muted text-sm">
          Total LLM cost per report: ~$2-5. Reports are generated daily.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Data Sources</h2>
        <div className="border border-sol-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sol-card border-b border-sol-border">
                <th className="text-left p-3 text-sol-muted">Source</th>
                <th className="text-left p-3 text-sol-muted">Access</th>
                <th className="text-left p-3 text-sol-muted">Rate Limit</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-sol-border/50">
                <td className="p-3">GitHub API</td>
                <td className="p-3 text-sol-muted">Free (PAT)</td>
                <td className="p-3 text-sol-muted">5,000 req/hr</td>
              </tr>
              <tr className="border-b border-sol-border/50">
                <td className="p-3">DeFi Llama</td>
                <td className="p-3 text-sol-muted">Free (no key)</td>
                <td className="p-3 text-sol-muted">No hard limit</td>
              </tr>
              <tr className="border-b border-sol-border/50">
                <td className="p-3">Helius</td>
                <td className="p-3 text-sol-muted">Free (1M credits/mo)</td>
                <td className="p-3 text-sol-muted">~1M RPC calls/mo</td>
              </tr>
              <tr>
                <td className="p-3">CoinGecko</td>
                <td className="p-3 text-sol-muted">Free (10K/mo)</td>
                <td className="p-3 text-sol-muted">~330 calls/day</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
