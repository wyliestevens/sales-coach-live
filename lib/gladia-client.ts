import { TranscriptEntry } from '@/types';

type TranscriptCallback = (entry: TranscriptEntry) => void;
type StatusCallback = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

export class GladiaClient {
  private ws: WebSocket | null = null;
  private onTranscript: TranscriptCallback;
  private onStatus: StatusCallback;
  private reconnectAttempts = 0;
  private maxReconnects = 3;
  private entryId = 0;

  constructor(onTranscript: TranscriptCallback, onStatus: StatusCallback) {
    this.onTranscript = onTranscript;
    this.onStatus = onStatus;
  }

  async connect(): Promise<void> {
    this.onStatus('connecting');

    const res = await fetch('/api/gladia-session', { method: 'POST' });
    if (!res.ok) {
      this.onStatus('error');
      throw new Error('Failed to create Gladia session');
    }

    const { url } = await res.json();

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.onStatus('connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch {
          // Ignore non-JSON messages
        }
      };

      this.ws.onerror = () => {
        this.onStatus('error');
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = () => {
        this.onStatus('disconnected');
        if (this.reconnectAttempts < this.maxReconnects) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
        }
      };
    });
  }

  sendAudio(audioData: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(audioData);
    }
  }

  disconnect(): void {
    this.maxReconnects = 0; // Prevent reconnection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleMessage(data: Record<string, unknown>): void {
    // Handle Gladia v2 live transcription events
    const type = data.type as string | undefined;

    if (type === 'transcript' || type === 'final_transcript' || type === 'partial_transcript') {
      const text = (data.transcription as string) || (data.text as string) || '';
      if (!text.trim()) return;

      const isFinal = type === 'transcript' || type === 'final_transcript' || (data.is_final as boolean) === true;
      const channel = (data.channel as number) ?? 0;

      const entry: TranscriptEntry = {
        id: `t-${this.entryId++}`,
        speaker: channel === 0 ? 'you' : 'prospect',
        text: text.trim(),
        timestamp: Date.now(),
        isFinal,
      };

      this.onTranscript(entry);
    }
  }
}
