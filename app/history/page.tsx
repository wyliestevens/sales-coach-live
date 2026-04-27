'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CallRecord {
  id: number;
  started_at: string;
  duration: number;
  talk_ratio_you: number;
  talk_ratio_prospect: number;
  filler_words: number;
  sentiment_journey: string[];
  objections: string[];
  buying_signals: string[];
  audio_url: string | null;
  prospect_name: string;
  notes: string;
}

interface CallDetail extends CallRecord {
  transcript: Array<{ speaker: string; text: string; timestamp: number }>;
  coaching_log: Array<Record<string, unknown>>;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function HistoryPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const router = useRouter();

  useEffect(() => {
    fetchCalls();
  }, []);

  async function fetchCalls() {
    try {
      const res = await fetch('/api/calls');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setCalls(data.calls || []);
    } catch {
      setError('Failed to load call history');
    } finally {
      setLoading(false);
    }
  }

  async function viewCall(id: number) {
    try {
      const res = await fetch(`/api/calls/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setSelectedCall(data.call);
      setEditingName(data.call.prospect_name || '');
      setEditingNotes(data.call.notes || '');
      setSaveStatus('idle');
    } catch {
      setError('Failed to load call details');
    }
  }

  async function saveCallInfo() {
    if (!selectedCall) return;
    setSaveStatus('saving');
    try {
      await fetch(`/api/calls/${selectedCall.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectName: editingName, notes: editingNotes }),
      });
      setSelectedCall({ ...selectedCall, prospect_name: editingName, notes: editingNotes });
      setCalls((prev) =>
        prev.map((c) => (c.id === selectedCall.id ? { ...c, prospect_name: editingName, notes: editingNotes } : c))
      );
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setError('Failed to save');
      setSaveStatus('idle');
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading call history...</p>
      </main>
    );
  }

  // Call detail view
  if (selectedCall) {
    const transcript = selectedCall.transcript || [];
    return (
      <main className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedCall(null)}
            className="text-gray-400 hover:text-white mb-6 flex items-center gap-2"
          >
            &larr; Back to History
          </button>

          {/* Prospect name and date */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Prospect name (click to edit)"
                className="text-2xl font-bold bg-transparent border-b border-transparent hover:border-white/20 focus:border-red-500 focus:outline-none transition-colors w-full py-1"
              />
              <span className="text-gray-400 font-mono shrink-0">{formatDuration(selectedCall.duration)}</span>
            </div>
            <p className="text-sm text-gray-500">
              {new Date(selectedCall.started_at).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })} at {new Date(selectedCall.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm text-gray-500 uppercase tracking-wider mb-2">Notes</label>
            <textarea
              value={editingNotes}
              onChange={(e) => setEditingNotes(e.target.value)}
              placeholder="Add notes about this call..."
              rows={3}
              className="w-full bg-gray-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-red-500 transition-colors resize-none"
            />
          </div>

          {/* Save button */}
          {(editingName !== (selectedCall.prospect_name || '') || editingNotes !== (selectedCall.notes || '')) && (
            <div className="mb-6">
              <button
                onClick={saveCallInfo}
                disabled={saveStatus === 'saving'}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
          {saveStatus === 'saved' && (
            <p className="text-green-400 text-sm mb-6">Saved.</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-xl font-bold">{selectedCall.talk_ratio_you}%</p>
              <p className="text-xs text-gray-500 uppercase">Your Talk</p>
            </div>
            <div className="bg-gray-900 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-xl font-bold">{selectedCall.talk_ratio_prospect}%</p>
              <p className="text-xs text-gray-500 uppercase">Prospect Talk</p>
            </div>
            <div className="bg-gray-900 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-xl font-bold">{selectedCall.filler_words}</p>
              <p className="text-xs text-gray-500 uppercase">Filler Words</p>
            </div>
            <div className="bg-gray-900 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-xl font-bold">{formatDuration(selectedCall.duration)}</p>
              <p className="text-xs text-gray-500 uppercase">Duration</p>
            </div>
          </div>

          {/* Audio player */}
          {selectedCall.audio_url && (
            <div className="mb-8">
              <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-2">Recording</h3>
              <audio controls src={selectedCall.audio_url} className="w-full" />
            </div>
          )}

          {/* Sentiment journey */}
          {selectedCall.sentiment_journey && selectedCall.sentiment_journey.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-2">Sentiment Journey</h3>
              <div className="flex flex-wrap gap-2">
                {selectedCall.sentiment_journey.map((s: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">
                    {i > 0 && <span className="text-gray-600 mr-1">&rarr;</span>}
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Objections & signals */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {selectedCall.objections && selectedCall.objections.length > 0 && (
              <div>
                <h3 className="text-sm text-red-500 uppercase tracking-wider mb-2">Objections</h3>
                <ul className="space-y-1">
                  {selectedCall.objections.map((o: string, i: number) => (
                    <li key={i} className="text-sm text-red-300">- {o}</li>
                  ))}
                </ul>
              </div>
            )}
            {selectedCall.buying_signals && selectedCall.buying_signals.length > 0 && (
              <div>
                <h3 className="text-sm text-green-500 uppercase tracking-wider mb-2">Buying Signals</h3>
                <ul className="space-y-1">
                  {selectedCall.buying_signals.map((s: string, i: number) => (
                    <li key={i} className="text-sm text-green-300">- {s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Full transcript */}
          <div>
            <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-3">Full Transcript</h3>
            <div className="bg-gray-900 border border-white/10 rounded-xl p-4 space-y-2 max-h-[500px] overflow-y-auto">
              {transcript.length === 0 && (
                <p className="text-gray-600 text-sm">No transcript available</p>
              )}
              {transcript.map((entry: { speaker: string; text: string; timestamp: number }, i: number) => {
                const time = new Date(entry.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                return (
                  <div key={i} className="flex gap-3">
                    <span className="text-xs text-gray-600 font-mono mt-0.5 shrink-0 w-20">{time}</span>
                    <span className={`text-sm ${entry.speaker === 'prospect' ? 'text-white' : 'text-gray-400'}`}>
                      {entry.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Call list view
  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Call History</h1>
          <Link href="/" className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium text-sm transition-colors">
            New Call
          </Link>
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        {calls.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 text-lg mb-4">No calls recorded yet</p>
            <Link href="/" className="text-red-400 hover:text-red-300">
              Start your first call &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <button
                key={call.id}
                onClick={() => viewCall(call.id)}
                className="w-full text-left bg-gray-900 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {call.prospect_name ? (
                        <span className="text-white">{call.prospect_name}</span>
                      ) : (
                        <span className="text-gray-500 italic">Unnamed prospect</span>
                      )}
                      <span className="text-gray-600 mx-2">·</span>
                      {new Date(call.started_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                      <span className="text-gray-500 ml-2">
                        {new Date(call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                      <span>{formatDuration(call.duration)}</span>
                      <span>You {call.talk_ratio_you}% / Prospect {call.talk_ratio_prospect}%</span>
                      {call.objections && call.objections.length > 0 && (
                        <span className="text-red-400">{call.objections.length} objections</span>
                      )}
                      {call.buying_signals && call.buying_signals.length > 0 && (
                        <span className="text-green-400">{call.buying_signals.length} buying signals</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {call.audio_url && (
                      <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">REC</span>
                    )}
                    <span className="text-gray-600">&rarr;</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
