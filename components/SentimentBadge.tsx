'use client';

const SENTIMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  interested: { label: 'Interested', color: 'text-green-400', bg: 'bg-green-900/50' },
  skeptical: { label: 'Skeptical', color: 'text-yellow-400', bg: 'bg-yellow-900/50' },
  defensive: { label: 'Defensive', color: 'text-orange-400', bg: 'bg-orange-900/50' },
  excited: { label: 'Excited', color: 'text-emerald-400', bg: 'bg-emerald-900/50' },
  objecting: { label: 'Objecting', color: 'text-red-400', bg: 'bg-red-900/50' },
  'ready-to-close': { label: 'Ready to Close', color: 'text-blue-400', bg: 'bg-blue-900/50' },
  neutral: { label: 'Neutral', color: 'text-gray-400', bg: 'bg-gray-800/50' },
};

export default function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  const config = SENTIMENT_CONFIG[sentiment ?? 'neutral'] ?? SENTIMENT_CONFIG.neutral;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} border border-white/10`}>
      <span className={`w-2 h-2 rounded-full ${config.color} bg-current`} />
      <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
    </div>
  );
}
