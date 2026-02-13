const steps = [
  {
    layer: 0,
    title: 'Social Signals',
    description: 'Track crypto sentiment, KOL discourse, and social momentum across X and LunarCrush.',
    badges: ['Sentiment Analysis', 'KOL Tracking', 'Social Dominance'],
    color: {
      ring: 'border-sol-orange bg-sol-orange/10 text-sol-orange',
      badge: 'bg-sol-orange/10 text-sol-orange',
    },
  },
  {
    layer: 1,
    title: 'Leading Signals',
    description: 'GitHub activity reveals builder conviction — star velocity, commit surges, new repo clusters.',
    badges: ['Star Velocity', 'Commit Surges', 'New Repo Clusters'],
    color: {
      ring: 'border-sol-purple bg-sol-purple/10 text-sol-purple',
      badge: 'bg-sol-purple/10 text-sol-purple',
    },
  },
  {
    layer: 2,
    title: 'Coincident Signals',
    description: 'Onchain capital movement — TVL shifts, DEX volumes, and program activity from DeFi Llama + Helius.',
    badges: ['TVL Tracking', 'DEX Volumes', 'Program Activity'],
    color: {
      ring: 'border-sol-blue bg-sol-blue/10 text-sol-blue',
      badge: 'bg-sol-blue/10 text-sol-blue',
    },
  },
  {
    layer: 3,
    title: 'Confirming Signals',
    description: 'Market validation layer — token price/volume trends, category performance via CoinGecko.',
    badges: ['Price Trends', 'Volume Analysis', 'Category Performance'],
    color: {
      ring: 'border-sol-green bg-sol-green/10 text-sol-green',
      badge: 'bg-sol-green/10 text-sol-green',
    },
  },
];

export function SignalPipeline() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-3">
          <span className="bg-gradient-to-r from-sol-purple to-sol-green bg-clip-text text-transparent">
            4-Layer Signal Detection
          </span>
        </h2>
        <p className="text-sol-muted max-w-xl mx-auto">
          Each narrative is cross-validated across multiple independent data layers —
          from early builder signals to market confirmation.
        </p>
      </div>

      {/* Desktop: horizontal timeline */}
      <div className="hidden md:block relative">
        {/* Connector gradient line */}
        <div className="absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-sol-orange via-sol-purple via-50% via-sol-blue to-sol-green" />

        <div className="grid grid-cols-4 gap-6">
          {steps.map(step => (
            <div key={step.layer} className="relative flex flex-col items-center text-center">
              {/* Numbered circle */}
              <div className={`relative z-10 w-16 h-16 rounded-full border-2 ${step.color.ring} flex items-center justify-center text-xl font-bold mb-4 bg-sol-darker`}>
                {step.layer}
              </div>
              <h3 className="font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-sol-muted text-sm mb-3">{step.description}</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {step.badges.map(badge => (
                  <span key={badge} className={`text-[10px] px-2 py-0.5 rounded-full ${step.color.badge}`}>
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: vertical timeline */}
      <div className="md:hidden relative pl-8">
        {/* Vertical connector */}
        <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-sol-orange via-sol-purple via-50% via-sol-blue to-sol-green" />

        <div className="space-y-8">
          {steps.map(step => (
            <div key={step.layer} className="relative flex gap-4">
              {/* Numbered circle */}
              <div className={`relative z-10 w-10 h-10 rounded-full border-2 ${step.color.ring} flex items-center justify-center text-sm font-bold shrink-0 bg-sol-darker`}>
                {step.layer}
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{step.title}</h3>
                <p className="text-sol-muted text-sm mb-2">{step.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {step.badges.map(badge => (
                    <span key={badge} className={`text-[10px] px-2 py-0.5 rounded-full ${step.color.badge}`}>
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
