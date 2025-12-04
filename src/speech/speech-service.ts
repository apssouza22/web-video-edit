import { SpeechView } from './speech-view.js';
import { getEventBus, SpeechGeneratedEvent } from '@/common/event-bus';
import type { SpeechConfig, SpeechResult, WorkerResponseMessage } from './types.js';
import { DEFAULT_SPEED, DEFAULT_VOICES } from './types.js';

export class SpeechService {
  #worker: Worker;
  #view: SpeechView;
  #eventBus = getEventBus();
  #currentAudioUrl: string | null = null;
  #audioElement: HTMLAudioElement | null = null;

  constructor() {
    this.#worker = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module',
    });
    const eventListeners = {
      generateSpeech: this.generateSpeech.bind(this),
      playAudio: this.playAudio.bind(this),
      stopAudio: this.stopAudio.bind(this),
      downloadAudio: this.downloadAudio.bind(this)
    };
    this.#view = new SpeechView(eventListeners);
    this.#addEventListener();
  }

  #addEventListener(): void {
    this.#worker.addEventListener('message', ((event: MessageEvent<WorkerResponseMessage>) => {
      const message = event.data;

      switch (message.status) {
        case 'progress':
          this.#view.updateProgress({
            status: 'generating',
            message: message.data && typeof message.data === 'object' && 'message' in message.data
              ? (message.data as { message: string }).message
              : 'Processing...',
          });
          break;

        case 'complete':
          if (message.data && typeof message.data === 'object' && 'audioData' in message.data) {
            this.#onSpeechComplete(message.data as SpeechResult);
          }
          break;

        case 'initiate':
          this.#view.updateProgress({
            status: 'loading',
            message: 'Initiating model...',
          });
          break;

        case 'ready':
          console.log('Speech model ready');
          this.#view.updateProgress({
            status: 'complete',
            message: 'Model loaded!',
          });
          break;

        case 'error':
          const errorMessage = message.data && typeof message.data === 'object' && 'message' in message.data
            ? (message.data as Error).message
            : 'Unknown error occurred';

          this.#view.updateProgress({
            status: 'error',
            message: errorMessage,
          });
          console.error('Speech model error:', errorMessage);
          break;

        case 'done':
          console.log('Speech model file loaded:', message.file);
          break;

        default:
          break;
      }
    }).bind(this));
  }

  #onSpeechComplete(result: SpeechResult): void {
    console.log('Speech generation complete');

    this.#cleanupCurrentAudio();

    const audioBlob = this.#createWavBlob(result.audioData, result.sampleRate);
    this.#currentAudioUrl = URL.createObjectURL(audioBlob);

    this.#view.updateProgress({
      status: 'complete',
      message: 'Speech generated successfully!',
    });
    this.#view.enableDownload(this.#currentAudioUrl);

    this.#eventBus.emit(new SpeechGeneratedEvent(audioBlob, this.#currentAudioUrl));

    this.playAudio();
  }

  #createWavBlob(audioData: Float32Array, sampleRate: number): Blob {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = audioData.length * bytesPerSample;
    const bufferSize = 44 + dataSize;

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < audioData.length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  loadModel(): void {
    this.#worker.postMessage({ task: 'load-model' });
  }

  generateSpeech(text: string, config: SpeechConfig): void {
    if (!text.trim()) {
      console.warn('Cannot generate speech from empty text');
      return;
    }

    this.#view.updateProgress({
      status: 'loading',
      message: 'Starting speech generation...',
    });

    const speed = config.speed / 100;

    this.#worker.postMessage({
      task: 'generate-speech',
      text: text,
      voice: config.voice,
      speed: speed,
    });
  }

  playAudio(): void {
    if (!this.#currentAudioUrl) return;

    if (this.#audioElement) {
      this.#audioElement.pause();
    }

    this.#audioElement = new Audio(this.#currentAudioUrl);
    this.#audioElement.play().catch((error) => {
      console.error('Audio playback failed:', error);
    });
  }

  stopAudio(): void {
    if (this.#audioElement) {
      this.#audioElement.pause();
      this.#audioElement.currentTime = 0;
    }
  }

  downloadAudio(filename: string = 'speech.wav'): void {
    if (!this.#currentAudioUrl) return;

    const link = document.createElement('a');
    link.href = this.#currentAudioUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getDefaultVoice(): string {
    return DEFAULT_VOICES[0].id;
  }

  getDefaultSpeed(): number {
    return DEFAULT_SPEED;
  }

  #cleanupCurrentAudio(): void {
    if (this.#currentAudioUrl) {
      URL.revokeObjectURL(this.#currentAudioUrl);
      this.#currentAudioUrl = null;
    }
    if (this.#audioElement) {
      this.#audioElement.pause();
      this.#audioElement = null;
    }
  }
}
