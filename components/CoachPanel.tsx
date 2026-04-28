'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { CoachingResponse } from '@/types';

interface CoachPanelProps {
  coaching: CoachingResponse | null;
  isLoading: boolean;
}

interface QueuedSuggestion {
  line: string;
  tactic: string;
  warning?: string;
  buyingSignal?: string;
  objection?: string;
}

export default function CoachPanel({ coaching, isLoading }: CoachPanelProps) {
  const [current, setCurrent] = useState<QueuedSuggestion | null>(null);
  const [queue, setQueue] = useState<QueuedSuggestion[]>([]);
  const [visible, setVisible] = useState(true);
  const prevLineRef = useRef('');

  // When new coaching arrives, queue it instead of auto-displaying
  useEffect(() => {
    const newLine = coaching?.nextLine ?? '';
    if (!newLine || newLine === prevLineRef.current) return;
    prevLineRef.current = newLine;

    const suggestion: QueuedSuggestion = {
      line: newLine,
      tactic: coaching?.tactic ?? '',
      warning: coaching?.warning,
      buyingSignal: coaching?.buyingSignals?.[0],
      objection: coaching?.objections?.[0],
    };

    // If nothing is displayed yet, show it immediately
    if (!current) {
      setCurrent(suggestion);
    } else {
      // Add to queue
      setQueue((prev) => [...prev, suggestion]);
    }
  }, [coaching?.nextLine, coaching?.tactic, coaching?.warning, coaching?.buyingSignals, coaching?.objections, current]);

  const showNext = useCallback(() => {
    if (queue.length === 0) return;
    setVisible(false);
    setTimeout(() => {
      const [next, ...rest] = queue;
      setCurrent(next);
      setQueue(rest);
      setVisible(true);
    }, 300);
  }, [queue]);

  if (!coaching && !isLoading && !current) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600">
        <p className="text-lg">AI coaching will appear here once the call starts...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-6 py-4 gap-3">
      {/* Main suggestion */}
      <div className="flex-1 flex items-center justify-center">
        <div className={`text-center max-w-3xl transition-opacity duration-300 ease-in-out ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-2xl md:text-[28px] font-bold leading-snug">
            {current?.line || 'Analyzing conversation...'}
          </p>
          {current?.tactic && (
            <p className="text-sm text-cyan-400 mt-3">{current.tactic}</p>
          )}
        </div>
      </div>

      {/* Warning */}
      {current?.warning && (
        <div className="bg-yellow-900/40 border border-yellow-600/50 rounded-lg px-4 py-2 text-center">
          <p className="text-yellow-300 font-bold text-base uppercase tracking-wide">
            {current.warning}
          </p>
        </div>
      )}

      {/* Bottom bar: signals + NEXT button */}
      <div className="flex items-center justify-between border-t border-white/10 pt-3">
        <div className="flex flex-wrap gap-4">
          {current?.buyingSignal && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-500 uppercase tracking-wider">Signal:</span>
              <span className="text-sm text-green-300">{current.buyingSignal}</span>
            </div>
          )}
          {current?.objection && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500 uppercase tracking-wider">Objection:</span>
              <span className="text-sm text-red-300">{current.objection}</span>
            </div>
          )}
        </div>

        {/* NEXT button with queue count */}
        {queue.length > 0 && (
          <button
            onClick={showNext}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-lg transition-colors animate-pulse"
          >
            NEXT
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{queue.length}</span>
          </button>
        )}
      </div>
    </div>
  );
}
