const trustCards = [
  {
    title: '4-Layer Signal Detection',
    description: 'Cross-validates narratives across social, developer, onchain, and market data — no single-source bias.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    color: {
      text: 'text-sol-purple',
      border: 'hover:border-sol-purple/50',
      bg: 'bg-sol-purple/10',
    },
  },
  {
    title: 'Z-Score Anomaly Detection',
    description: 'Statistical rigor identifies genuine signal spikes from noise using z-score analysis across all metrics.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    color: {
      text: 'text-sol-green',
      border: 'hover:border-sol-green/50',
      bg: 'bg-sol-green/10',
    },
  },
  {
    title: 'Daily Automated Pipeline',
    description: 'Runs every day at 08:00 UTC — zero manual intervention. Consistent, repeatable intelligence generation.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: {
      text: 'text-sol-blue',
      border: 'hover:border-sol-blue/50',
      bg: 'bg-sol-blue/10',
    },
  },
  {
    title: 'Full Transparency',
    description: 'Every signal, metric, and LLM prompt is traceable. Reports show their work — raw data to narrative.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: {
      text: 'text-sol-orange',
      border: 'hover:border-sol-orange/50',
      bg: 'bg-sol-orange/10',
    },
  },
];

export function MethodologyTrust() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3">Open-Source Intelligence</h2>
        <p className="text-sol-muted max-w-lg mx-auto">
          Transparent methodology. Verifiable data. No black boxes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trustCards.map(card => (
          <div
            key={card.title}
            className={`backdrop-blur-md bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 transition-colors ${card.color.border}`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-lg ${card.color.bg} ${card.color.text} shrink-0`}>
                {card.icon}
              </div>
              <div>
                <h3 className={`font-semibold mb-1 ${card.color.text}`}>{card.title}</h3>
                <p className="text-sol-muted text-sm">{card.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
