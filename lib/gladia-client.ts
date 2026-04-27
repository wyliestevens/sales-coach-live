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
      let detail = 'Failed to create Gladia session';
      try {
        const errData = await res.json();
        detail = errData.error || detail;
      } catch { /* ignore */ }
      throw new Error(detail);
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
      // Gladia v2 accepts raw binary PCM directly
      this.ws.send(audioData);
    }
  }

  disconnect(): void {
    this.maxReconnects = 0; // Prevent reconnection
    if (this.ws) {
      // Send stop_recording to properly close the Gladia session
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'stop_recording' }));
      }
      this.ws.close();
      this.ws = null;
    }
  }

  private handleMessage(data: Record<string, unknown>): void {
    const type = data.type as string | undefined;

    // Gladia v2 format: { type: "transcript", data: { is_final: bool, utterance: { text, channel, ... } } }
    if (type === 'transcript') {
      const payload = data.data as Record<string, unknown> | undefined;
      if (!payload) return;

      const isFinal = payload.is_final === true;
      const utterance = payload.utterance as Record<string, unknown> | undefined;
      if (!utterance) return;

      const text = utterance.text as string;
      if (!text?.trim()) return;

      const channel = (utterance.channel as number) ?? 0;

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
