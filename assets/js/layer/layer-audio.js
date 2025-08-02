import {StandardLayer} from './layer-common.js';
import {AudioContext} from '../constants.js';

export class AudioLayer extends StandardLayer {
  constructor(file, skipLoading = false) {
    super(file);
    this.reader = new FileReader();
    this.audioCtx = new AudioContext({
      sampleRate: 16000 // Whisper model requires this
    });
    this.audioBuffer = null;
    this.source = null;
    this.playing = false;
    /** @type {AudioContext} */
    this.playerAudioContext = null;
    this.audioStreamDestination = null;
    this.currentSpeed = 1.0; // Track current playback speed
    this.lastAppliedSpeed = 1.0; // Track last applied speed for change detection
    this.preservePitch = true; // Enable pitch preservation by default
    this.processedBuffers = new Map(); // Cache for processed audio buffers
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

    if (this.preservePitch && this.currentSpeed !== 1.0) {
      // Use pitch-preserved buffer for non-normal speeds
      const pitchPreservedBuffer = this.#createPitchPreservedBuffer(this.audioBuffer, this.currentSpeed);
      this.source.buffer = pitchPreservedBuffer;
      // Don't apply playbackRate since time-stretching handles the speed change
      this.source.playbackRate.value = 1.0;
    } else {
      this.source.buffer = this.audioBuffer;
      this.source.playbackRate.value = this.currentSpeed;
    }

    this.lastAppliedSpeed = this.currentSpeed;

    if (this.audioStreamDestination) {
      //Used for video exporting
      this.source.connect(this.audioStreamDestination);
    } else {
      this.source.connect(playerAudioContext.destination);
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

    // Check if speed has changed and recreate audio source if needed
    const currentSpeed = this.speedController.getSpeed();
    if (currentSpeed !== this.lastAppliedSpeed && this.source) {
      // Speed changed, need to recreate audio source
      console.log(`AudioLayer "${this.name}" speed changed from ${this.lastAppliedSpeed} to ${currentSpeed}. Recreating audio source.`);
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
      console.log(`Audio layer "${this.name}" missing audioBuffer or playerAudioContext`);
      return false;
    }

    if (startTime < 0 || endTime <= startTime) {
      console.error('Invalid time interval provided:', startTime, endTime);
      return false;
    }

    try {
      console.log(`Processing audio layer: "${this.name}"`);

      const newBuffer = this.#removeAudioIntervalInternal(startTime, endTime);

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
   * Removes an audio interval from this AudioLayer's buffer and returns a new AudioBuffer
   * @param {number} startTime - Start time in seconds to remove
   * @param {number} endTime - End time in seconds to remove
   * @returns {AudioBuffer} New AudioBuffer with the interval removed
   * @private
   */
  #removeAudioIntervalInternal(startTime, endTime) {
    if (!this.audioBuffer || startTime >= endTime || startTime < 0) {
      console.error('Invalid parameters for removeAudioInterval');
      return this.audioBuffer;
    }

    const sampleRate = this.audioBuffer.sampleRate;
    const numberOfChannels = this.audioBuffer.numberOfChannels;
    const originalLength = this.audioBuffer.length;

    // Convert time to sample indices
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.ceil(endTime * sampleRate);

    // Clamp to valid ranges
    const clampedStartSample = Math.max(0, Math.min(startSample, originalLength));
    const clampedEndSample = Math.max(clampedStartSample, Math.min(endSample, originalLength));

    // Calculate new buffer length
    const removedSamples = clampedEndSample - clampedStartSample;
    const newLength = originalLength - removedSamples;

    if (newLength <= 0) {
      console.warn('Removing interval would result in empty audio buffer');
      // Return a minimal buffer with silence
      return this.playerAudioContext.createBuffer(numberOfChannels, 1, sampleRate);
    }

    const newBuffer = this.playerAudioContext.createBuffer(numberOfChannels, newLength, sampleRate);

    // Copy audio data for each channel
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const originalChannelData = this.audioBuffer.getChannelData(channel);
      const newChannelData = newBuffer.getChannelData(channel);

      let writeIndex = 0;

      // Copy data before the removed interval
      for (let i = 0; i < clampedStartSample; i++) {
        newChannelData[writeIndex++] = originalChannelData[i];
      }

      // Skip the removed interval and copy data after
      for (let i = clampedEndSample; i < originalLength; i++) {
        newChannelData[writeIndex++] = originalChannelData[i];
      }
    }

    console.log(`Removed audio interval ${startTime}s-${endTime}s. Original: ${this.audioBuffer.duration}s, New: ${newBuffer.duration}s`);

    return newBuffer;
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

  }

  /**
   * Creates a time-stretched audio buffer that preserves pitch
   * @param {AudioBuffer} originalBuffer - The original audio buffer
   * @param {number} speed - Speed multiplier (0.5 = half speed, 2.0 = double speed)
   * @returns {AudioBuffer} - Time-stretched audio buffer with preserved pitch
   * @private
   */
  #createPitchPreservedBuffer(originalBuffer, speed) {
    if (speed === 1.0) {
      return originalBuffer;
    }

    // Check cache first
    const cacheKey = `${speed}_${originalBuffer.duration}`;
    if (this.processedBuffers.has(cacheKey)) {
      return this.processedBuffers.get(cacheKey);
    }

    const sampleRate = originalBuffer.sampleRate;
    const numberOfChannels = originalBuffer.numberOfChannels;
    const originalLength = originalBuffer.length;

    // Calculate new buffer length for time stretching
    const newLength = Math.floor(originalLength / speed);
    const newBuffer = this.playerAudioContext.createBuffer(numberOfChannels, newLength, sampleRate);

    // Simple time-stretching algorithm using overlap-add method
    const frameSize = 1024; // Frame size for processing
    const hopSize = Math.floor(frameSize / 4); // Overlap factor
    const stretchedHopSize = Math.floor(hopSize * speed);

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const originalData = originalBuffer.getChannelData(channel);
      const newData = newBuffer.getChannelData(channel);

      // Initialize output buffer
      newData.fill(0);

      let inputPos = 0;
      let outputPos = 0;

      while (inputPos + frameSize < originalLength && outputPos + frameSize < newLength) {
        // Extract frame from original audio
        const frame = new Float32Array(frameSize);
        for (let i = 0; i < frameSize; i++) {
          frame[i] = originalData[inputPos + i] || 0;
        }

        // Apply window function (Hann window)
        for (let i = 0; i < frameSize; i++) {
          const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frameSize - 1)));
          frame[i] *= windowValue;
        }

        // Overlap-add to output buffer
        for (let i = 0; i < frameSize && outputPos + i < newLength; i++) {
          newData[outputPos + i] += frame[i];
        }

        inputPos += stretchedHopSize;
        outputPos += hopSize;
      }

      // Normalize the output to prevent clipping
      let maxValue = 0;
      for (let i = 0; i < newLength; i++) {
        maxValue = Math.max(maxValue, Math.abs(newData[i]));
      }

      if (maxValue > 1.0) {
        const normalizationFactor = 0.95 / maxValue;
        for (let i = 0; i < newLength; i++) {
          newData[i] *= normalizationFactor;
        }
      }
    }

    // Cache the processed buffer
    this.processedBuffers.set(cacheKey, newBuffer);

    console.log(`Created pitch-preserved buffer for speed ${speed}: ${originalBuffer.duration}s -> ${newBuffer.duration}s`);
    return newBuffer;
  }

  #updateTotalTimeForSpeed() {
    this.totalTimeInMilSeconds = this.originalTotalTimeInMilSeconds / this.speedController.getSpeed();
    console.log(`Updated total time for speed ${this.currentSpeed}: ${this.totalTimeInMilSeconds}ms from original ${this.originalTotalTimeInMilSeconds}ms`);
  }

  /**
   * Set whether to preserve pitch when changing speed
   * @param {boolean} preserve - True to preserve pitch, false to allow pitch changes
   */
  setPitchPreservation(preserve) {
    if (this.preservePitch === preserve) {
      return;
    }
    this.preservePitch = preserve;
    this.processedBuffers.clear();
    // If currently playing, reconnect with new settings
    if (this.source && this.playerAudioContext) {
      this.connectAudioSource(this.playerAudioContext);
    } else {
      this.currentSpeed = this.speedController.getSpeed();
    }
  }
}
