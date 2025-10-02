import {StandardLayer} from '../layer/index';
import {AudioContext} from '../constants.js';
import {AudioCutter} from './audio-cutter.js';
import {AudioLoader} from './audio-loader.js';
import {AudioSource} from "./audio-source.js";

export class AudioLayer extends StandardLayer {

  constructor(file, skipLoading = false) {
    super(file);
    this.audioLoader = new AudioLoader();
    /** @type {AudioBuffer} */
    this.audioBuffer = null;
    /** @type {AudioSource} */
    this.source = null;
    /** @type {AudioContext} */
    this.playerAudioContext = null;
    this.playing = false;
    this.audioStreamDestination = null;
    this.currentSpeed = 1.0; // Track current playback speed
    this.lastAppliedSpeed = 1.0; // Track last applied speed for change detection
    this.audioCutter = new AudioCutter();
    this.originalTotalTimeInMilSeconds = 0; // Store original duration before speed changes

    if (skipLoading) {
      return;
    }

    this.#loadAudioFile(file);
  }

  /**
   * Loads an audio file using the AudioLoader
   * @param {File} file - The audio file to load
   * @private
   */
  async #loadAudioFile(file) {
    try {
      const audioBuffer = await this.audioLoader.loadAudioFile(file);
      this.#onAudioLoadSuccess(audioBuffer);
    } catch (error) {
      console.error(`Failed to load audio layer: ${this.name}`, error);
      // TODO: Handle error appropriately
    }
  }

  /**
   * Handles successful audio loading
   * @param {AudioBuffer} audioBuffer - The loaded audio buffer
   * @private
   */
  #onAudioLoadSuccess(audioBuffer) {
    this.audioBuffer = audioBuffer;
    this.originalTotalTimeInMilSeconds = this.audioBuffer.duration * 1000;
    this.totalTimeInMilSeconds = this.originalTotalTimeInMilSeconds;
    if (this.totalTimeInMilSeconds === 0) {
      console.warn("Failed to load audio layer: " + this.name + ". Audio buffer duration is 0.");
    }
    this.ready = true;
    this.loadUpdateListener(this, 100, null, audioBuffer);
  }

  updateName(name) {
    this.name = name + " [Audio] ";
  }

  disconnect() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
  }

  /**
   * Disposes of the audio layer resources
   */
  dispose() {
    this.disconnect();
    if (this.audioLoader) {
      this.audioLoader.dispose();
      this.audioLoader = null;
    }
  }

  init(canvasWidth, canvasHeight, playerAudioContext) {
    super.init(canvasWidth, canvasHeight);
    this.playerAudioContext = playerAudioContext;
  }

  setSpeed(speed) {
    super.setSpeed(speed);
    this.#updateTotalTimeForSpeed();
  }

  connectAudioSource(playerAudioContext) {
    this.disconnect();
    this.currentSpeed = this.speedController.getSpeed();
    this.lastAppliedSpeed = this.currentSpeed;
    this.source = new AudioSource(playerAudioContext);
    if (this.audioStreamDestination) {
      //Used for video exporting
      this.source.connect(this.audioStreamDestination, this.currentSpeed, this.audioBuffer);
    } else {
      this.source.connect(playerAudioContext.destination, this.currentSpeed, this.audioBuffer);
    }
    this.started = false;
  }

  render(ctxOut, currentTime, playing = false) {
    if (!this.ready) {
      return;
    }
    if (!this.isLayerVisible(currentTime)) {
      return;
    }
    if (!playing) {
      return;
    }

    const currentSpeed = this.speedController.getSpeed();
    if (currentSpeed !== this.lastAppliedSpeed && this.source) {
      this.connectAudioSource(this.playerAudioContext);
    }

    let time = currentTime - this.start_time;
    if (time < 0 || time > this.totalTimeInMilSeconds) {
      return;
    }

    if (!this.started) {
      this.source.start(0, time / 1000);
      this.started = true;
    }
  }

  playStart(time) {
    this.source.start(time / 1000);
  }

  /**
   * Removes an audio interval from this AudioLayer
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @returns {boolean} - True if the interval was successfully removed, false otherwise
   */
  removeInterval(startTime, endTime) {
    if (!this.audioBuffer || !this.playerAudioContext) {
      console.warn(`Audio layer "${this.name}" missing audioBuffer or playerAudioContext`);
      return false;
    }

    if (startTime < 0 || endTime <= startTime) {
      console.error('Invalid time interval provided:', startTime, endTime);
      return false;
    }

    try {
      const newBuffer = this.audioCutter.removeInterval(this.audioBuffer, this.playerAudioContext, startTime, endTime);

      if (newBuffer && newBuffer !== this.audioBuffer) {
        this.#updateBuffer(newBuffer);
        console.log(`Successfully updated audio layer: "${this.name}"`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error removing audio interval from layer "${this.name}":`, error);
      return false;
    }
  }

  /**
   * Updates this AudioLayer with a new AudioBuffer
   * @param {AudioBuffer} newBuffer - The new AudioBuffer
   * @private
   */
  #updateBuffer(newBuffer) {
    if (!newBuffer) {
      console.error('Invalid buffer provided for updateBuffer');
      return;
    }

    this.disconnect();
    this.audioBuffer = newBuffer;
    this.originalTotalTimeInMilSeconds = newBuffer.duration * 1000;
    this.currentSpeed = this.speedController.getSpeed();
    this.#updateTotalTimeForSpeed();
    this.connectAudioSource(this.playerAudioContext);

  }

  #updateTotalTimeForSpeed() {
    this.totalTimeInMilSeconds = this.originalTotalTimeInMilSeconds / this.speedController.getSpeed();
    console.log(`Updated total time for speed ${this.currentSpeed}: ${this.totalTimeInMilSeconds}ms from original ${this.originalTotalTimeInMilSeconds}ms`);
  }

}
