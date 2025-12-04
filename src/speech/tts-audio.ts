export class TTSAudio {
  #audioElement: HTMLAudioElement | null = null;
  #currentAudioUrl: string | null = null;

  constructor(audioBlob: Blob) {
    this.#currentAudioUrl = URL.createObjectURL(audioBlob);
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

  cleanupCurrentAudio(): void {
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