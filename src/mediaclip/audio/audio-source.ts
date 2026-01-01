import {ESAudioContext} from "@/mediaclip";
import {PitchPreservationProcessor} from "@/mediaclip/audio/pitch-preservation-processor";

export class AudioSource {
  #audioContext: ESAudioContext | null = null;
  #source: AudioBufferSourceNode | null = null;
  private pitchPreservationProcessor: PitchPreservationProcessor;

  constructor() {
    this.pitchPreservationProcessor = new PitchPreservationProcessor();
  }

  disconnect(): void {
    if (this.#source) {
      this.#source.disconnect();
      this.#source = null;
    }
  }

  get isConnected(): boolean {
    return this.#source !== null;
  }

  connect(audioCtx: ESAudioContext, destination: AudioNode, speed: number, buffer: AudioBuffer, volume: number = 1.0): void {
    this.#audioContext = audioCtx;
    if (speed <= 0) {
      speed = 0.1; // Prevent invalid speed values
    }
    this.disconnect();
    this.#source = this.#audioContext!.createBufferSource();
    this.#handlePitch(speed, buffer);
    const gainNode = this.#handleVolume(volume);
    gainNode.connect(destination);
  }

  start(when: number, offset: number): void {
    if (!this.#source) {
      return;
    }
    this.#source.start(when, offset);
  }

  #handleVolume(volume: number = 1.0): GainNode {
    const layerGain = this.#audioContext!.createGain();
    layerGain.gain.value = volume;
    this.#source!.connect(layerGain);
    return layerGain;
  }

  #handlePitch(speed: number, buffer: AudioBuffer): void {
    if (speed !== 1.0) {
      this.#source!.buffer = this.pitchPreservationProcessor.createPitchPreservedBuffer(buffer, speed, this.#audioContext!);
      this.#source!.playbackRate.value = 1.0; // Don't apply playbackRate since time-stretching handles the speed change
    } else {
      this.#source!.buffer = buffer;
      this.#source!.playbackRate.value = speed;
    }
  }
}
