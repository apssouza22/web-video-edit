import { AudioContext } from '../constants.js';

/**
 * AudioLoader handles loading and decoding audio files
 */
export class AudioLoader {
  private audioCtx: AudioContext;

  constructor() {
    this.audioCtx = new AudioContext({
      sampleRate: 16000 // Whisper model requires this
    });
  }

  /**
   * Loads an audio file and returns a promise that resolves with the AudioBuffer
   * @param file - The audio file to load
   * @returns Promise that resolves with the decoded AudioBuffer
   */
  async loadAudioFile(file: File): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.addEventListener("load", () => {
        const buffer = reader.result as ArrayBuffer;
        this.audioCtx.decodeAudioData(
          buffer,
          (audioBuffer: AudioBuffer) => {
            resolve(audioBuffer);
          },
          (error: DOMException | null) => {
            reject(new Error(`Failed to decode audio data: ${error}`));
          }
        );
      });

      reader.addEventListener("error", () => {
        reject(new Error(`Failed to read audio file: ${reader.error}`));
      });

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Disposes of the audio loader resources
   */
  dispose(): void {
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
  }
}
