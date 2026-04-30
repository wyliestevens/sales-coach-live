'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TranscriptEntry, CoachingResponse, CallSummary } from '@/types';
import { AudioCapture } from '@/lib/audio-capture';
import { AudioRecorder } from '@/lib/audio-recorder';
import { GladiaClient } from '@/lib/gladia-client';
import TranscriptPanel from './TranscriptPanel';
import CoachPanel from './CoachPanel';
import TalkRatioMeter from './TalkRatioMeter';
import Link from 'next/link';

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'right'];
const COACHING_INTERVAL = 6000;

// Fuzzy dedup: only add if no existing item shares 60%+ of the same words
function addUnique(existing: string[], newItems: string[]): string[] {
  const result = [...existing];
  for (const item of newItems) {
    const itemWords = new Set(item.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/));
    const isDuplicate = result.some((e) => {
      const existingWords = new Set(e.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/));
      const overlap = [...itemWords].filter((w) => existingWords.has(w)).length;
      const smaller = Math.min(itemWords.size, existingWords.size);
      return smaller > 0 && overlap / smaller > 0.6;
    });
    if (!isDuplicate) result.push(item);
  }
  return result;
}

export default function CallInterface() {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [coaching, setCoaching] = useState<CoachingResponse | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [micStatus, setMicStatus] = useState<'inactive' | 'active' | 'error' | 'denied'>('inactive');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [flash, setFlash] = useState<'red' | 'green' | null>(null);
  const [summary, setSummary] = useState<CallSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [youWordCount, setYouWordCount] = useState(0);
  const [prospectWordCount, setProspectWordCount] = useState(0);
  const [fillerCount, setFillerCount] = useState(0);
  const [sentimentJourney, setSentimentJourney] = useState<string[]>([]);
  const [allObjections, setAllObjections] = useState<string[]>([]);
  const [allBuyingSignals, setAllBuyingSignals] = useState<string[]>([]);
  const [showProspectModal, setShowProspectModal] = useState(false);
  const [prospectName, setProspectName] = useState('');
  const [prospectIndustryRole, setProspectIndustryRole] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const prospectContextRef = useRef<{ name: string; industryRole: string } | null>(null);

  const audioRef = useRef<AudioCapture | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const gladiaRef = useRef<GladiaClient | null>(null);
  const coachTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCoachRef = useRef<string>('');
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const callStartTimeRef = useRef<string>('');

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (!isActive || !startTime) return;
    const timer = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, startTime]);

  const handleTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscript((prev) => {
      if (entry.isFinal) {
        const filtered = prev.filter((e) => e.isFinal || e.speaker !== entry.speaker);
        return [...filtered, entry];
      }
      const filtered = prev.filter((e) => e.isFinal || e.speaker !== entry.speaker);
      return [...filtered, entry];
    });

    if (entry.isFinal) {
      const words = entry.text.split(/\s+/).length;
      if (entry.speaker === 'you') {
        setYouWordCount((c) => c + words);
      } else {
        setProspectWordCount((c) => c + words);
      }
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
        body: JSON.stringify({
          transcript: recent,
          prospectContext: prospectContextRef.current || undefined,
        }),
      });
      if (res.ok) {
        const data: CoachingResponse = await res.json();
        setCoaching(data);

        setSentimentJourney((prev) => {
          if (prev[prev.length - 1] !== data.sentiment) {
            return [...prev, data.sentiment];
          }
          return prev;
        });

        if (data.objections?.length > 0) {
          setAllObjections((prev) => addUnique(prev, data.objections));
          triggerFlash('red');
        }
        if (data.buyingSignals?.length > 0) {
          setAllBuyingSignals((prev) => addUnique(prev, data.buyingSignals));
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

  const handleStartClick = () => {
    setShowProspectModal(true);
  };

  const handleProspectSubmit = () => {
    const name = prospectName.trim();
    const industry = prospectIndustryRole === 'Other' ? customIndustry.trim() : prospectIndustryRole.trim();
    if (industry) {
      prospectContextRef.current = { name: name || 'Unknown', industryRole: industry };
    } else {
      prospectContextRef.current = null;
    }
    setShowProspectModal(false);
    startCall();
  };

  const startCall = async () => {
    setErrorMessage(null);

    let audio: AudioCapture;
    try {
      audio = new AudioCapture();
      await audio.testAccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'MICROPHONE_DENIED') {
        setMicStatus('denied');
        setErrorMessage('Microphone access was denied. Please allow microphone access in your browser settings.');
      } else {
        setMicStatus('error');
        setErrorMessage(`Microphone error: ${msg || 'Could not access microphone'}`);
      }
      return;
    }

    let gladia: GladiaClient;
    try {
      gladia = new GladiaClient(handleTranscript, (status) => {
        if (status === 'connected') setMicStatus('active');
        else if (status === 'error') {
          setErrorMessage('Transcription connection lost. Try stopping and restarting the call.');
        }
      });
      await gladia.connect();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      audio.stop();
      setMicStatus('error');
      setErrorMessage(`Transcription service error: ${msg}. Check that your Gladia API key is valid.`);
      return;
    }

    try {
      await audio.start((data) => gladia.sendAudio(data));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      gladia.disconnect();
      setMicStatus('error');
      setErrorMessage(`Audio streaming error: ${msg}`);
      return;
    }

    // Start audio recording
    const recorder = new AudioRecorder();
    const stream = audio.getStream();
    if (stream) {
      recorder.start(stream);
    }

    audioRef.current = audio;
    recorderRef.current = recorder;
    gladiaRef.current = gladia;
    callStartTimeRef.current = new Date().toISOString();

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

    coachTimerRef.current = setInterval(fetchCoaching, COACHING_INTERVAL);
  };

  const stopCall = async () => {
    // Stop recording and get the audio blob
    const audioBlob = recorderRef.current ? await recorderRef.current.stop() : null;

    audioRef.current?.stop();
    gladiaRef.current?.disconnect();
    if (coachTimerRef.current) clearInterval(coachTimerRef.current);

    audioRef.current = null;
    recorderRef.current = null;
    gladiaRef.current = null;
    coachTimerRef.current = null;

    const totalWords = youWordCount + prospectWordCount;
    const youPct = totalWords > 0 ? Math.round((youWordCount / totalWords) * 100) : 50;
    const prospectPct = totalWords > 0 ? 100 - youPct : 50;

    const callSummary: CallSummary = {
      date: callStartTimeRef.current || new Date().toISOString(),
      duration,
      talkRatio: { you: youPct, prospect: prospectPct },
      sentimentJourney,
      objections: allObjections,
      buyingSignals: allBuyingSignals,
      transcript,
    };

    setSummary(callSummary);
    setIsActive(false);
    setMicStatus('inactive');

    // Save to server
    setSaving(true);
    try {
      // Upload audio if we have a recording
      let audioUrl: string | null = null;
      if (audioBlob && audioBlob.size > 0) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        const uploadRes = await fetch('/api/calls/upload', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          audioUrl = uploadData.url;
        }
      }

      // Save call data
      await fetch('/api/calls/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startedAt: callSummary.date,
          duration: callSummary.duration,
          talkRatioYou: youPct,
          talkRatioProspect: prospectPct,
          fillerWords: fillerCount,
          transcript: transcript.filter((e) => e.isFinal),
          sentimentJourney,
          objections: allObjections,
          buyingSignals: allBuyingSignals,
          audioUrl,
          prospectName: prospectContextRef.current?.name || undefined,
        }),
      });
    } catch (err) {
      console.error('Failed to save call:', err);
    } finally {
      setSaving(false);
    }
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
    const talkVerdict = summary.talkRatio.you > 60
      ? 'You talked too much — aim for 40% or less.'
      : summary.talkRatio.you < 30
        ? 'Great listening — you let the prospect do the talking.'
        : 'Good balance between talking and listening.';

    return (
      <div className="h-screen bg-gray-950 text-white flex flex-col items-center p-8 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-2">Call Summary</h1>
        {saving && <p className="text-yellow-400 text-sm mb-4">Saving call data...</p>}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 max-w-4xl w-full">
          <StatCard label="Duration" value={formatTime(summary.duration)} />
          <StatCard label="You Talked" value={`${summary.talkRatio.you}%`} />
          <StatCard label="Prospect Talked" value={`${summary.talkRatio.prospect}%`} />
          <StatCard label="Buying Signals" value={String(summary.buyingSignals.length)} />
        </div>

        {/* Talk ratio verdict */}
        <p className="text-sm text-gray-400 mb-6 max-w-4xl w-full">{talkVerdict}</p>

        {/* Sentiment journey */}
        {summary.sentimentJourney.length > 0 && (
          <div className="mb-6 max-w-4xl w-full">
            <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-2">Prospect Mood</h3>
            <div className="flex flex-wrap items-center gap-1">
              {summary.sentimentJourney.map((s, i) => (
                <span key={i} className="flex items-center">
                  {i > 0 && <span className="text-gray-700 mx-1">&rarr;</span>}
                  <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">{s}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Key Insights - combined, capped */}
        <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-4xl w-full">
          {summary.buyingSignals.length > 0 && (
            <div className="bg-green-950/30 border border-green-800/30 rounded-xl p-4">
              <h3 className="text-sm text-green-400 font-semibold uppercase tracking-wider mb-3">Buying Signals Detected</h3>
              <ul className="space-y-2">
                {summary.buyingSignals.slice(0, 8).map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-green-200">
                    <span className="text-green-500 shrink-0">+</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {summary.objections.length > 0 && (
            <div className="bg-red-950/30 border border-red-800/30 rounded-xl p-4">
              <h3 className="text-sm text-red-400 font-semibold uppercase tracking-wider mb-3">Objections Raised</h3>
              <ul className="space-y-2">
                {summary.objections.slice(0, 8).map((o, i) => (
                  <li key={i} className="flex gap-2 text-sm text-red-200">
                    <span className="text-red-500 shrink-0">!</span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-4">
          <button onClick={downloadTranscript} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors">
            Download Transcript
          </button>
          <Link href="/history" className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors">
            Call History
          </Link>
          <button onClick={() => setSummary(null)} className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors">
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
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-red-500 tracking-wide">Sales Coach Live</h1>
          <Link href="/history" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            History
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {isActive && (
            <>
              <span className="text-xs text-red-400 animate-pulse">REC</span>
              <span className="text-sm text-gray-400 font-mono">{formatTime(duration)}</span>
              <MicIndicator status={micStatus} />
              <button onClick={stopCall} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-bold rounded-lg transition-colors">
                STOP CALL
              </button>
            </>
          )}
          {!isActive && (
            <button onClick={handleStartClick} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-bold rounded-lg transition-colors">
              START CALL
            </button>
          )}
        </div>
      </div>

      <div className="h-[40%] border-b border-white/10 overflow-hidden">
        <TranscriptPanel entries={transcript} sentiment={coaching?.sentiment ?? null} flash={flash} />
      </div>

      <div className="h-[15%] flex items-center">
        <TalkRatioMeter
          youPercent={youPercent}
          prospectPercent={prospectPercent}
          wordsPerMinute={wpm}
          fillerWords={fillerCount}
        />
      </div>

      <div className="h-[45%] bg-gray-950 border-t border-white/10 overflow-hidden">
        <CoachPanel coaching={coaching} isLoading={coachLoading} />
      </div>

      {/* Error overlay */}
      {(micStatus === 'denied' || micStatus === 'error') && errorMessage && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-red-500/50 rounded-2xl p-8 max-w-md text-center">
            <h2 className="text-xl font-bold text-red-400 mb-3">
              {micStatus === 'denied' ? 'Microphone Access Denied' : 'Connection Error'}
            </h2>
            <p className="text-yellow-300 bg-yellow-900/30 rounded-lg p-3 mb-4 text-sm font-mono break-all">
              {errorMessage}
            </p>
            {micStatus === 'denied' && (
              <div className="text-left bg-gray-800 rounded-lg p-4 mb-4 text-sm text-gray-300 space-y-2">
                <p><strong>To fix this:</strong></p>
                <p>1. Click the <strong>lock/tune icon</strong> in your browser address bar</p>
                <p>2. Set <strong>Microphone</strong> to <strong>Allow</strong></p>
                <p>3. Refresh the page (Cmd+R)</p>
                <p>4. Click START CALL again</p>
              </div>
            )}
            <button onClick={() => { setMicStatus('inactive'); setErrorMessage(null); }} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Prospect info modal */}
      {showProspectModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-1">What industry is this call for?</h2>
            <p className="text-sm text-gray-400 mb-6">The AI will tailor coaching to this industry&apos;s language, pain points, and objections.</p>

            <label className="block text-sm text-gray-400 mb-1">Industry</label>
            <select
              value={prospectIndustryRole}
              onChange={(e) => setProspectIndustryRole(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-red-500 mb-4 appearance-none"
              autoFocus
            >
              <option value="">Select an industry...</option>
              <option value="Personal Injury Attorney">Personal Injury Attorney</option>
              <option value="Family Law Attorney">Family Law Attorney</option>
              <option value="Criminal Defense Attorney">Criminal Defense Attorney</option>
              <option value="Real Estate Agent">Real Estate Agent</option>
              <option value="Insurance Agent">Insurance Agent</option>
              <option value="Roofing / Home Services">Roofing / Home Services</option>
              <option value="HVAC / Plumbing">HVAC / Plumbing</option>
              <option value="Dental Practice">Dental Practice</option>
              <option value="Medical Practice">Medical Practice</option>
              <option value="Chiropractic / Physical Therapy">Chiropractic / Physical Therapy</option>
              <option value="SaaS / Technology">SaaS / Technology</option>
              <option value="Marketing Agency">Marketing Agency</option>
              <option value="Financial Services / Wealth Management">Financial Services / Wealth Management</option>
              <option value="Automotive Dealership">Automotive Dealership</option>
              <option value="Restaurant / Hospitality">Restaurant / Hospitality</option>
              <option value="E-commerce / Retail">E-commerce / Retail</option>
              <option value="Construction / General Contractor">Construction / General Contractor</option>
              <option value="Fitness / Gym / Wellness">Fitness / Gym / Wellness</option>
              <option value="Education / Coaching">Education / Coaching</option>
              <option value="Other">Other</option>
            </select>

            {prospectIndustryRole === 'Other' && (
              <>
                <label className="block text-sm text-gray-400 mb-1">Specify Industry</label>
                <input
                  type="text"
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  placeholder="e.g. Solar installation, Pet grooming"
                  className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-red-500 mb-4"
                />
              </>
            )}

            <label className="block text-sm text-gray-400 mb-1">Prospect Name <span className="text-gray-600">(optional)</span></label>
            <input
              type="text"
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
              placeholder="e.g. John Smith"
              className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-red-500 mb-6"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleProspectSubmit();
                }
              }}
            />

            <div className="flex gap-3">
              <button
                onClick={handleProspectSubmit}
                disabled={!prospectIndustryRole}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-colors"
              >
                START CALL
              </button>
              <button
                onClick={() => setShowProspectModal(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
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
