import {StandardLayer} from '../layer/layer-common.js';
import {AudioContext} from '../constants.js';
import {PitchPreservationProcessor} from './pitch-preservation-processor.js';
import {AudioCutter} from './audio-cutter.js';

export class AudioLayer extends StandardLayer {

  constructor(file, skipLoading = false) {
    super(file);
    this.reader = new FileReader();
    this.audioCtx = new AudioContext({
      sampleRate: 16000 // Whisper model requires this
    });
    /** @type {AudioBuffer} */
    this.audioBuffer = null;
    /** @type {AudioBufferSourceNode} */
    this.source = null;
  /** @type {AudioContext} */
    this.playerAudioContext = null;
    this.playing = false;
    this.audioStreamDestination = null;
    this.currentSpeed = 1.0; // Track current playback speed
    this.lastAppliedSpeed = 1.0; // Track last applied speed for change detection
    this.preservePitch = true; // Enable pitch preservation by default
    this.pitchProcessor = new PitchPreservationProcessor(); // Pitch preservation processor
    this.audioCutter = new AudioCutter();
    this.originalTotalTimeInMilSeconds = 0; // Store original duration before speed changes
    if (skipLoading) {
      return
    }
    this.reader.addEventListener("load", this.#onAudioLoad.bind(this));
    this.reader.readAsArrayBuffer(file);
  }

  #onAudioLoad() {
    let buffer = this.reader.result;
    this.audioCtx.decodeAudioData(
        buffer,
        this.#onAudioLoadSuccess.bind(this),
        (function (e) {
          //TODO: On error
        }).bind(this)
    );
  }

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
    this.source = playerAudioContext.createBufferSource();
    this.currentSpeed = this.speedController.getSpeed();
    this.setSourceBuffer(this.source);

    this.lastAppliedSpeed = this.currentSpeed;

    if (this.audioStreamDestination) {
      //Used for video exporting
      this.source.connect(this.audioStreamDestination);
    } else {
      this.source.connect(playerAudioContext.destination);
    }
    this.started = false;
  }

  setSourceBuffer(source) {
    if (this.preservePitch && this.currentSpeed !== 1.0) {
      source.buffer = this.pitchProcessor.createPitchPreservedBuffer(this.audioBuffer, this.currentSpeed, this.playerAudioContext);
      source.playbackRate.value = 1.0; // Don't apply playbackRate since time-stretching handles the speed change
    } else {
      source.buffer = this.audioBuffer;
      source.playbackRate.value = this.currentSpeed;
    }
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
      this.disconnect();
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
