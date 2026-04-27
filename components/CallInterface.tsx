'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TranscriptEntry, CoachingResponse, CallSummary } from '@/types';
import { AudioCapture } from '@/lib/audio-capture';
import { GladiaClient } from '@/lib/gladia-client';
import TranscriptPanel from './TranscriptPanel';
import CoachPanel from './CoachPanel';
import TalkRatioMeter from './TalkRatioMeter';

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'right'];
const COACHING_INTERVAL = 3000;

export default function CallInterface() {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [coaching, setCoaching] = useState<CoachingResponse | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [micStatus, setMicStatus] = useState<'inactive' | 'active' | 'error' | 'denied'>('inactive');
  const [flash, setFlash] = useState<'red' | 'green' | null>(null);
  const [summary, setSummary] = useState<CallSummary | null>(null);
  const [youWordCount, setYouWordCount] = useState(0);
  const [prospectWordCount, setProspectWordCount] = useState(0);
  const [fillerCount, setFillerCount] = useState(0);
  const [sentimentJourney, setSentimentJourney] = useState<string[]>([]);
  const [allObjections, setAllObjections] = useState<string[]>([]);
  const [allBuyingSignals, setAllBuyingSignals] = useState<string[]>([]);

  const audioRef = useRef<AudioCapture | null>(null);
  const gladiaRef = useRef<GladiaClient | null>(null);
  const coachTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCoachRef = useRef<string>('');
  const transcriptRef = useRef<TranscriptEntry[]>([]);

  // Keep transcriptRef in sync
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Duration timer
  useEffect(() => {
    if (!isActive || !startTime) return;
    const timer = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, startTime]);

  const handleTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscript((prev) => {
      // Replace partial with final for same speaker
      if (entry.isFinal) {
        const filtered = prev.filter(
          (e) => e.isFinal || e.speaker !== entry.speaker
        );
        return [...filtered, entry];
      }
      // Replace existing partial
      const filtered = prev.filter(
        (e) => e.isFinal || e.speaker !== entry.speaker
      );
      return [...filtered, entry];
    });

    if (entry.isFinal) {
      const words = entry.text.split(/\s+/).length;
      if (entry.speaker === 'you') {
        setYouWordCount((c) => c + words);
      } else {
        setProspectWordCount((c) => c + words);
      }
      // Count filler words
      const lower = entry.text.toLowerCase();
      const fillers = FILLER_WORDS.reduce((count, fw) => {
        const regex = new RegExp(`\\b${fw}\\b`, 'gi');
        const matches = lower.match(regex);
        return count + (matches?.length ?? 0);
      }, 0);
      if (fillers > 0) setFillerCount((c) => c + fillers);
    }
  }, []);

  const fetchCoaching = useCallback(async () => {
    const entries = transcriptRef.current;
    const recent = entries
      .filter((e) => e.isFinal && Date.now() - e.timestamp < 60000)
      .map((e) => `[${e.speaker === 'you' ? 'Closer' : 'Prospect'}]: ${e.text}`)
      .join('\n');

    if (!recent || recent === lastCoachRef.current) return;
    lastCoachRef.current = recent;

    setCoachLoading(true);
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: recent }),
      });
      if (res.ok) {
        const data: CoachingResponse = await res.json();
        setCoaching(data);

        // Track sentiment journey
        setSentimentJourney((prev) => {
          if (prev[prev.length - 1] !== data.sentiment) {
            return [...prev, data.sentiment];
          }
          return prev;
        });

        // Track objections and buying signals
        if (data.objections?.length > 0) {
          setAllObjections((prev) => [...new Set([...prev, ...data.objections])]);
          triggerFlash('red');
        }
        if (data.buyingSignals?.length > 0) {
          setAllBuyingSignals((prev) => [...new Set([...prev, ...data.buyingSignals])]);
          triggerFlash('green');
        }
      }
    } catch (err) {
      console.error('Coach fetch error:', err);
    } finally {
      setCoachLoading(false);
    }
  }, []);

  const triggerFlash = (color: 'red' | 'green') => {
    setFlash(color);
    setTimeout(() => setFlash(null), 800);
  };

  const startCall = async () => {
    try {
      const audio = new AudioCapture();
      const gladia = new GladiaClient(handleTranscript, (status) => {
        if (status === 'connected') setMicStatus('active');
        else if (status === 'error') setMicStatus('error');
      });

      await gladia.connect();
      await audio.start((data) => gladia.sendAudio(data));

      audioRef.current = audio;
      gladiaRef.current = gladia;

      setIsActive(true);
      setStartTime(Date.now());
      setMicStatus('active');
      setTranscript([]);
      setCoaching(null);
      setYouWordCount(0);
      setProspectWordCount(0);
      setFillerCount(0);
      setSentimentJourney([]);
      setAllObjections([]);
      setAllBuyingSignals([]);
      setSummary(null);

      // Start coaching loop
      coachTimerRef.current = setInterval(fetchCoaching, COACHING_INTERVAL);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'MICROPHONE_DENIED') {
        setMicStatus('denied');
      } else {
        setMicStatus('error');
      }
      console.error('Failed to start call:', err);
    }
  };

  const stopCall = () => {
    audioRef.current?.stop();
    gladiaRef.current?.disconnect();
    if (coachTimerRef.current) clearInterval(coachTimerRef.current);

    audioRef.current = null;
    gladiaRef.current = null;
    coachTimerRef.current = null;

    const totalWords = youWordCount + prospectWordCount;
    const youPct = totalWords > 0 ? Math.round((youWordCount / totalWords) * 100) : 50;
    const prospectPct = totalWords > 0 ? 100 - youPct : 50;

    const callSummary: CallSummary = {
      date: new Date().toISOString(),
      duration,
      talkRatio: { you: youPct, prospect: prospectPct },
      sentimentJourney,
      objections: allObjections,
      buyingSignals: allBuyingSignals,
      transcript,
    };

    // Save to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('call-history') ?? '[]');
      existing.push(callSummary);
      localStorage.setItem('call-history', JSON.stringify(existing));
    } catch {
      // Storage full or unavailable
    }

    setSummary(callSummary);
    setIsActive(false);
    setMicStatus('inactive');
  };

  const downloadTranscript = () => {
    if (!summary) return;
    const lines = summary.transcript
      .filter((e) => e.isFinal)
      .map((e) => {
        const time = new Date(e.timestamp).toLocaleTimeString();
        return `[${time}] ${e.speaker === 'you' ? 'Closer' : 'Prospect'}: ${e.text}`;
      })
      .join('\n');

    const header = `Sales Call Transcript - ${new Date(summary.date).toLocaleString()}\nDuration: ${formatTime(summary.duration)}\nTalk Ratio: You ${summary.talkRatio.you}% / Prospect ${summary.talkRatio.prospect}%\n\n`;
    const blob = new Blob([header + lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-transcript-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalWords = youWordCount + prospectWordCount;
  const youPercent = totalWords > 0 ? Math.round((youWordCount / totalWords) * 100) : 50;
  const prospectPercent = totalWords > 0 ? 100 - youPercent : 50;
  const wpm = duration > 0 ? Math.round((youWordCount / duration) * 60) : 0;

  // Summary screen
  if (summary) {
    return (
      <div className="h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-8">Call Summary</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 max-w-4xl w-full">
          <StatCard label="Duration" value={formatTime(summary.duration)} />
          <StatCard label="Your Talk %" value={`${summary.talkRatio.you}%`} />
          <StatCard label="Prospect Talk %" value={`${summary.talkRatio.prospect}%`} />
          <StatCard label="Objections" value={String(summary.objections.length)} />
        </div>

        {summary.sentimentJourney.length > 0 && (
          <div className="mb-6 max-w-4xl w-full">
            <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-2">Sentiment Journey</h3>
            <div className="flex flex-wrap gap-2">
              {summary.sentimentJourney.map((s, i) => (
                <span key={i} className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">{s}</span>
              ))}
            </div>
          </div>
        )}

        {summary.objections.length > 0 && (
          <div className="mb-6 max-w-4xl w-full">
            <h3 className="text-sm text-red-500 uppercase tracking-wider mb-2">Objections Raised</h3>
            <ul className="space-y-1">
              {summary.objections.map((o, i) => (
                <li key={i} className="text-sm text-red-300">- {o}</li>
              ))}
            </ul>
          </div>
        )}

        {summary.buyingSignals.length > 0 && (
          <div className="mb-6 max-w-4xl w-full">
            <h3 className="text-sm text-green-500 uppercase tracking-wider mb-2">Buying Signals</h3>
            <ul className="space-y-1">
              {summary.buyingSignals.map((s, i) => (
                <li key={i} className="text-sm text-green-300">- {s}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-4 mt-4">
          <button onClick={downloadTranscript} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors">
            Download Transcript
          </button>
          <button onClick={() => setSummary(null)} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors">
            New Call
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-white/10">
        <h1 className="text-lg font-bold text-red-500 tracking-wide">Sales Coach Live</h1>
        <div className="flex items-center gap-4">
          {isActive && (
            <>
              <span className="text-sm text-gray-400 font-mono">{formatTime(duration)}</span>
              <MicIndicator status={micStatus} />
              <button onClick={stopCall} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-bold rounded-lg transition-colors">
                STOP CALL
              </button>
            </>
          )}
          {!isActive && (
            <button onClick={startCall} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-bold rounded-lg transition-colors">
              START CALL
            </button>
          )}
        </div>
      </div>

      {/* Transcript panel - 40% */}
      <div className="h-[40%] border-b border-white/10 overflow-hidden">
        <TranscriptPanel entries={transcript} sentiment={coaching?.sentiment ?? null} flash={flash} />
      </div>

      {/* Talk ratio meter - 15% */}
      <div className="h-[15%] flex items-center">
        <TalkRatioMeter
          youPercent={youPercent}
          prospectPercent={prospectPercent}
          wordsPerMinute={wpm}
          fillerWords={fillerCount}
        />
      </div>

      {/* Coach panel - 45% */}
      <div className="h-[45%] bg-gray-950 border-t border-white/10 overflow-hidden">
        <CoachPanel coaching={coaching} isLoading={coachLoading} />
      </div>

      {/* Mic denied error */}
      {micStatus === 'denied' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-red-500/50 rounded-2xl p-8 max-w-md text-center">
            <h2 className="text-xl font-bold text-red-400 mb-3">Microphone Access Denied</h2>
            <p className="text-gray-400 mb-4">Sales Coach Live needs microphone access to transcribe your call. Please allow microphone access in your browser settings and try again.</p>
            <button onClick={() => setMicStatus('inactive')} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MicIndicator({ status }: { status: string }) {
  const color = status === 'active' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-gray-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full ${color} ${status === 'active' ? 'animate-pulse' : ''}`} />
      <span className="text-xs text-gray-500">MIC</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
