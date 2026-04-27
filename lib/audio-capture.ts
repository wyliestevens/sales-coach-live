const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096;

export class AudioCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onAudioData: ((data: ArrayBuffer) => void) | null = null;

  async testAccess(): Promise<void> {
    try {
      const testStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      // Save the stream so we can reuse it in start()
      this.stream = testStream;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        throw new Error('MICROPHONE_DENIED');
      }
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone and try again.');
      }
      throw new Error(`MICROPHONE_UNAVAILABLE: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async start(onAudioData: (data: ArrayBuffer) => void): Promise<void> {
    this.onAudioData = onAudioData;

    // If we don't already have a stream from testAccess(), get one now
    if (!this.stream) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: SAMPLE_RATE,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          throw new Error('MICROPHONE_DENIED');
        }
        throw new Error('MICROPHONE_UNAVAILABLE');
      }
    }

    this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    this.processor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      const pcm16 = this.floatTo16BitPCM(inputData);
      this.onAudioData?.(pcm16.buffer as ArrayBuffer);
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  stop(): void {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.audioContext?.close();

    this.processor = null;
    this.source = null;
    this.stream = null;
    this.audioContext = null;
    this.onAudioData = null;
  }

  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }
}
