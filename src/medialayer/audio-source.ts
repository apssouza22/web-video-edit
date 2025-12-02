import {ESAudioContext} from "@/medialayer";
import {PitchPreservationProcessor} from "@/audio/pitch-preservation-processor";

export class AudioSource {
  #audioContext: ESAudioContext | null = null;
  #source: AudioBufferSourceNode | null = null;
  private pitchPreservationProcessor: PitchPreservationProcessor;

  constructor(audioCtx: ESAudioContext) {
    this.#audioContext = audioCtx;
    this.pitchPreservationProcessor = new PitchPreservationProcessor();
  }

  disconnect(): void {
    if (this.#source) {
      this.#source.disconnect();
      this.#source = null;
    }
  }

  connect(destination: AudioNode, speed: number, buffer: AudioBuffer): void {
    if (speed <= 0) {
      speed = 0.1; // Prevent invalid speed values
    }
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
    if (speed !== 1.0) {
      this.#source!.buffer = this.pitchPreservationProcessor.createPitchPreservedBuffer(buffer, speed, this.#audioContext!);
      this.#source!.playbackRate.value = 1.0; // Don't apply playbackRate since time-stretching handles the speed change
    } else {
      this.#source!.buffer = buffer;
      this.#source!.playbackRate.value = speed;
    }
  }
}
