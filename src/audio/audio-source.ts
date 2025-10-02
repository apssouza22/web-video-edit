import { PitchPreservationProcessor } from './pitch-preservation-processor';

export class AudioSource {
  #audioContext: AudioContext | null = null;
  #source: AudioBufferSourceNode | null = null;
  #pitchProcessor = new PitchPreservationProcessor(); // Pitch preservation processor

  constructor(audioCtx: AudioContext) {
    this.#audioContext = audioCtx;
  }

  disconnect(): void {
    if (this.#source) {
      this.#source.disconnect();
      this.#source = null;
    }
  }

  connect(destination: AudioNode, speed: number, buffer: AudioBuffer): void {
    this.disconnect();
    this.#source = this.#audioContext!.createBufferSource();
    this.#handlePitch(speed, buffer);
    this.#handleVolume();
    this.#source.connect(destination);
  }

  start(when: number, offset: number): void {
    this.#source!.start(when, offset);
  }

  #handleVolume(volume?: number): void {
    volume = volume !== undefined ? volume : 1.0;
    const layerGain = this.#audioContext!.createGain();
    layerGain.gain.value = volume;
    this.#source!.connect(layerGain);
  }

  #handlePitch(speed: number, buffer: AudioBuffer): void {
    console.log("handle pitch", speed);
    if (speed !== 1.0) {
      this.#source!.buffer = this.#pitchProcessor.createPitchPreservedBuffer(buffer, speed, this.#audioContext!);
      this.#source!.playbackRate.value = 1.0; // Don't apply playbackRate since time-stretching handles the speed change
    } else {
      this.#source!.buffer = buffer;
      this.#source!.playbackRate.value = speed;
    }
  }
}
