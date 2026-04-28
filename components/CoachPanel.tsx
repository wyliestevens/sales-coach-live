'use client';

import { useEffect, useState, useRef } from 'react';
import { CoachingResponse } from '@/types';

interface CoachPanelProps {
  coaching: CoachingResponse | null;
  isLoading: boolean;
}

export default function CoachPanel({ coaching, isLoading }: CoachPanelProps) {
  const [displayedLine, setDisplayedLine] = useState('');
  const [displayedTactic, setDisplayedTactic] = useState('');
  const [visible, setVisible] = useState(true);
  const prevLineRef = useRef('');

  // Fade out, swap text, fade in when nextLine changes
  useEffect(() => {
    const newLine = coaching?.nextLine ?? '';
    if (newLine && newLine !== prevLineRef.current) {
      setVisible(false); // fade out
      const timer = setTimeout(() => {
        setDisplayedLine(newLine);
        setDisplayedTactic(coaching?.tactic ?? '');
        prevLineRef.current = newLine;
        setVisible(true); // fade in
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [coaching?.nextLine, coaching?.tactic]);

  if (!coaching && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600">
        <p className="text-lg">AI coaching will appear here once the call starts...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-6 py-4 gap-4">
      {/* Main suggestion - large font with fade transition */}
      <div className="flex-1 flex items-center justify-center">
        <div className={`text-center max-w-3xl transition-opacity duration-500 ease-in-out ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-2xl md:text-[28px] font-bold leading-snug">
            {displayedLine || 'Analyzing conversation...'}
          </p>
          {displayedTactic && (
            <p className="text-sm text-cyan-400 mt-3">{displayedTactic}</p>
          )}
        </div>
      </div>

      {/* Bottom info bar - current signals from this coaching cycle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
        {coaching?.buyingSignals && coaching.buyingSignals.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-500 uppercase tracking-wider">Signal:</span>
            <span className="text-sm text-green-300">{coaching.buyingSignals[0]}</span>
          </div>
        )}

        {coaching?.objections && coaching.objections.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-500 uppercase tracking-wider">Objection:</span>
            <span className="text-sm text-red-300">{coaching.objections[0]}</span>
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
