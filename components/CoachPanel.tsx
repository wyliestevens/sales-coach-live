'use client';

import { CoachingResponse } from '@/types';

interface CoachPanelProps {
  coaching: CoachingResponse | null;
  isLoading: boolean;
}

export default function CoachPanel({ coaching, isLoading }: CoachPanelProps) {
  if (!coaching && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600">
        <p className="text-lg">AI coaching will appear here once the call starts...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-6 py-4 gap-4">
      {/* Main suggestion - large font */}
      <div className="flex-1 flex items-center justify-center">
        <p className={`text-2xl md:text-[28px] font-bold leading-snug text-center max-w-3xl transition-opacity duration-300 ${isLoading && !coaching ? 'opacity-50' : ''}`}>
          {coaching?.nextLine ?? 'Analyzing conversation...'}
        </p>
      </div>

      {/* Bottom info bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
        {/* Tactic */}
        {coaching?.tactic && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Tactic:</span>
            <span className="text-sm text-cyan-400 font-medium">{coaching.tactic}</span>
          </div>
        )}

        {/* Buying signals */}
        {coaching?.buyingSignals && coaching.buyingSignals.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-500 uppercase tracking-wider">Buying Signals:</span>
            <span className="text-sm text-green-300">{coaching.buyingSignals.join(' | ')}</span>
          </div>
        )}

        {/* Objections */}
        {coaching?.objections && coaching.objections.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-500 uppercase tracking-wider">Objections:</span>
            <span className="text-sm text-red-300">{coaching.objections.join(' | ')}</span>
          </div>
        )}
      </div>

      {/* Warning */}
      {coaching?.warning && (
        <div className="bg-yellow-900/40 border border-yellow-600/50 rounded-lg px-4 py-3 text-center">
          <p className="text-yellow-300 font-bold text-lg uppercase tracking-wide">
            {coaching.warning}
          </p>
        </div>
      )}
    </div>
  );
}
