import {AudioContext} from '../constants.js';

/**
 * AudioLoader handles loading and decoding audio files
 */
export class AudioLoader {
  constructor() {
    this.audioCtx = new AudioContext({
      sampleRate: 16000 // Whisper model requires this
    });
  }

  /**
   * Loads an audio file and returns a promise that resolves with the AudioBuffer
   * @param {File} file - The audio file to load
   * @returns {Promise<AudioBuffer>} Promise that resolves with the decoded AudioBuffer
   */
  async loadAudioFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.addEventListener("load", () => {
        const buffer = reader.result;
        this.audioCtx.decodeAudioData(
          buffer,
          (audioBuffer) => {
            resolve(audioBuffer);
          },
          (error) => {
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
  dispose() {
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
  }
}