'use client';

import { useEffect, useRef } from 'react';
import { TranscriptEntry } from '@/types';
import SentimentBadge from './SentimentBadge';

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
  sentiment: string | null;
  flash: 'red' | 'green' | null;
}

export default function TranscriptPanel({ entries, sentiment, flash }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const flashBg = flash === 'red'
    ? 'bg-red-900/20'
    : flash === 'green'
      ? 'bg-green-900/20'
      : '';

  return (
    <div className={`relative flex flex-col h-full transition-colors duration-300 ${flashBg}`}>
      {/* Sentiment badge - top right */}
      <div className="absolute top-3 right-3 z-10">
        <SentimentBadge sentiment={sentiment} />
      </div>

      {/* Transcript content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {entries.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Waiting for speech...
          </div>
        )}
        {entries.map((entry) => {
          const time = new Date(entry.timestamp);
          const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const isProspect = entry.speaker === 'prospect';

          return (
            <div key={entry.id} className={`flex gap-3 ${!entry.isFinal ? 'opacity-60' : ''}`}>
              <span className="text-xs text-gray-600 font-mono mt-0.5 shrink-0 w-20">
                {timeStr}
              </span>
              <span className={`text-sm leading-relaxed ${isProspect ? 'text-white font-medium' : 'text-gray-400'}`}>
                {entry.text}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
