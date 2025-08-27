import {PitchPreservationProcessor} from "./pitch-preservation-processor.js";

export class AudioSource {
  /** @type {AudioContext} */
  #audioContext = null
  /** @type {AudioBufferSourceNode} */
  #source = null;
  #pitchProcessor = new PitchPreservationProcessor(); // Pitch preservation processor
  constructor(audioCtx) {
    this.#audioContext = audioCtx
  }

  disconnect() {
    if (this.#source) {
      this.#source.disconnect();
      this.#source = null;
    }
  }

  connect(destination, speed, buffer) {
    this.disconnect();
    this.#source = this.#audioContext.createBufferSource();
    this.#handlePitch(speed, buffer);
    this.#handleVolume()
    this.#source.connect(destination);
  }

  start(when, offset){
    this.#source.start(when, offset);
  }

  #handleVolume(volume){
    volume = volume !== undefined ? volume : 1.0;
    const layerGain = this.#audioContext.createGain();
    layerGain.gain.value = volume;
    this.#source.connect(layerGain);
  }

  #handlePitch(speed, buffer){
    console.log("handle pitch", speed)
    if (speed !== 1.0) {
      this.#source.buffer = this.#pitchProcessor.createPitchPreservedBuffer(buffer, speed, this.#audioContext);
      this.#source.playbackRate.value = 1.0; // Don't apply playbackRate since time-stretching handles the speed change
    } else {
      this.#source.buffer = buffer;
      this.#source.playbackRate.value = speed;
    }
  }
}
