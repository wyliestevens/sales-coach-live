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
  const [paused, setPaused] = useState(false);
  const prevLineRef = useRef('');
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueRef = useRef<QueuedSuggestion[]>([]);

  // Keep queueRef in sync
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // When new coaching arrives, queue it — but show emergent items immediately
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

    const isEmergent = !!(coaching?.warning || (coaching?.objections && coaching.objections.length > 0));

    // If nothing is displayed yet OR this is emergent, show immediately
    if (!current || isEmergent) {
      // Push current to front of queue if replacing it with an emergent suggestion
      if (current && isEmergent) {
        setQueue((prev) => [current, ...prev]);
      }
      setVisible(false);
      setTimeout(() => {
        setCurrent(suggestion);
        setVisible(true);
      }, 200);
    } else {
      // Add to queue
      setQueue((prev) => [...prev, suggestion]);
    }
  }, [coaching?.nextLine, coaching?.tactic, coaching?.warning, coaching?.buyingSignals, coaching?.objections, current]);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) return;
    setVisible(false);
    setTimeout(() => {
      setQueue((prev) => {
        const [next, ...rest] = prev;
        if (next) setCurrent(next);
        return rest;
      });
      setVisible(true);
    }, 300);
  }, []);

  // Auto-cycle every 30 seconds when not paused
  useEffect(() => {
    if (paused) {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
      return;
    }
    autoTimerRef.current = setInterval(() => {
      if (queueRef.current.length > 0) {
        showNext();
      }
    }, 30000);
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [paused, showNext]);

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

        {/* Controls: PAUSE/RESUME only */}
        <div className="flex items-center gap-2">
          {current && (
            <button
              onClick={() => setPaused((p) => !p)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                paused
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {paused ? 'RESUME' : 'PAUSE'}
            </button>
          )}
          {queue.length > 0 && (
            <span className="text-xs text-gray-600">{queue.length} queued</span>
          )}
        </div>
      </div>
    </div>
  );
}
