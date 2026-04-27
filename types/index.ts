export interface CoachingResponse {
  sentiment: 'interested' | 'skeptical' | 'defensive' | 'excited' | 'objecting' | 'ready-to-close' | 'neutral';
  buyingSignals: string[];
  objections: string[];
  nextLine: string;
  tactic: string;
  warning?: string;
}

export interface TranscriptEntry {
  id: string;
  speaker: 'prospect' | 'you';
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface CallState {
  isActive: boolean;
  startTime: number | null;
  duration: number;
  transcript: TranscriptEntry[];
  coaching: CoachingResponse | null;
  talkRatio: { you: number; prospect: number };
  wordsPerMinute: number;
  fillerWords: number;
  micStatus: 'inactive' | 'active' | 'error' | 'denied';
}

export interface CallSummary {
  date: string;
  duration: number;
  talkRatio: { you: number; prospect: number };
  sentimentJourney: string[];
  objections: string[];
  buyingSignals: string[];
  transcript: TranscriptEntry[];
}

export interface GladiaTranscriptEvent {
  type: string;
  transcription?: string;
  text?: string;
  is_final?: boolean;
  utterance?: {
    text: string;
    start: number;
    end: number;
    channel: number;
  };
  channel?: number;
}
