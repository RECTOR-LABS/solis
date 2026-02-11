import { getLatestReport } from '@/lib/reports';
import { NarrativeCard } from '@/components/narrative-card';
import { BuildIdeaCard } from '@/components/build-ideas';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const report = await getLatestReport();

  return (
    <div className="space-y-8">
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-sol-purple via-sol-blue to-sol-green bg-clip-text text-transparent">
            Solana Narrative Intelligence
          </span>
        </h1>
        <p className="text-sol-muted text-lg max-w-2xl mx-auto">
          Fortnightly reports detecting emerging Solana ecosystem narratives
          through developer activity, onchain metrics, and market signals.
        </p>
      </section>

      {!report ? (
        <section className="border border-sol-border rounded-lg p-8 bg-sol-card text-center">
          <p className="text-sol-muted">
            First report generating soon. Check back after the next pipeline run.
          </p>
        </section>
      ) : (
        <>
          <section className="border border-sol-border rounded-lg p-6 bg-sol-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Latest Report</h2>
              <span className="text-sol-muted text-sm">
                {new Date(report.period.start).toLocaleDateString()} — {new Date(report.period.end).toLocaleDateString()}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-sol-purple">{report.meta.narrativesIdentified}</div>
                <div className="text-xs text-sol-muted">Narratives</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-sol-green">{report.meta.anomaliesDetected}</div>
                <div className="text-xs text-sol-muted">Anomalies</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-sol-blue">{report.meta.totalReposAnalyzed}</div>
                <div className="text-xs text-sol-muted">Repos Tracked</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-sol-orange">{report.meta.buildIdeasGenerated}</div>
                <div className="text-xs text-sol-muted">Build Ideas</div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Detected Narratives</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.narratives.map(narrative => (
                <NarrativeCard key={narrative.id} narrative={narrative} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Build Ideas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.buildIdeas.map(idea => (
                <BuildIdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          </section>
        </>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-sol-border rounded-lg p-6 bg-sol-card">
          <h3 className="text-sol-purple font-semibold mb-2">Leading Signals</h3>
          <p className="text-sol-muted text-sm">
            GitHub activity — star velocity, commit surges, new repo clusters.
            2-4 weeks ahead of market.
          </p>
        </div>
        <div className="border border-sol-border rounded-lg p-6 bg-sol-card">
          <h3 className="text-sol-blue font-semibold mb-2">Coincident Signals</h3>
          <p className="text-sol-muted text-sm">
            Onchain data — TVL shifts, DEX volumes, program activity.
            Real-time capital movement.
          </p>
        </div>
        <div className="border border-sol-border rounded-lg p-6 bg-sol-card">
          <h3 className="text-sol-green font-semibold mb-2">Confirming Signals</h3>
          <p className="text-sol-muted text-sm">
            Market data — token price/volume, category market caps.
            Validation layer.
          </p>
        </div>
      </section>
    </div>
  );
}
