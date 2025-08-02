/**
 * Pitch Preservation Processor
 * Handles time-stretching algorithms to preserve pitch while changing audio playback speed
 */
export class PitchPreservationProcessor {
  constructor() {
    /** @type {Map<string, AudioBuffer>} */
    this.processedBuffers = new Map(); // Cache for processed audio buffers
  }

  /**
   * Creates a time-stretched audio buffer that preserves pitch
   * @param {AudioBuffer} originalBuffer - The original audio buffer
   * @param {number} speed - Speed multiplier (0.5 = half speed, 2.0 = double speed)
   * @param {AudioContext} audioContext - Audio context for creating new buffers
   * @returns {AudioBuffer} - Time-stretched audio buffer with preserved pitch
   */
  createPitchPreservedBuffer(originalBuffer, speed, audioContext) {
    if (speed === 1.0) {
      return originalBuffer;
    }

    // Check cache first
    const cacheKey = `${speed}_${originalBuffer.duration}_${originalBuffer.sampleRate}`;
    if (this.processedBuffers.has(cacheKey)) {
      return this.processedBuffers.get(cacheKey);
    }

    const sampleRate = originalBuffer.sampleRate;
    const numberOfChannels = originalBuffer.numberOfChannels;
    const originalLength = originalBuffer.length;

    // Calculate new buffer length for time stretching
    const newLength = Math.floor(originalLength / speed);
    const newBuffer = audioContext.createBuffer(numberOfChannels, newLength, sampleRate);

    // Process each channel
    for (let channel = 0; channel < numberOfChannels; channel++) {
      this.#processChannel(
        originalBuffer.getChannelData(channel),
        newBuffer.getChannelData(channel),
        originalLength,
        newLength,
        speed
      );
    }
    this.processedBuffers.set(cacheKey, newBuffer);
    return newBuffer;
  }

  /**
   * Process a single audio channel using overlap-add time-stretching
   * @param {Float32Array} originalData - Original channel data
   * @param {Float32Array} newData - Output channel data
   * @param {number} originalLength - Original buffer length
   * @param {number} newLength - New buffer length
   * @param {number} speed - Speed multiplier
   * @private
   */
  #processChannel(originalData, newData, originalLength, newLength, speed) {
    // Simple time-stretching algorithm using overlap-add method
    const frameSize = 1024; // Frame size for processing
    const hopSize = Math.floor(frameSize / 4); // Overlap factor
    const stretchedHopSize = Math.floor(hopSize * speed);

    newData.fill(0);
    let inputPos = 0;
    let outputPos = 0;

    while (inputPos + frameSize < originalLength && outputPos + frameSize < newLength) {
      // Extract frame from original audio
      const frame = this.#extractFrame(originalData, inputPos, frameSize);
      this.#applyHannWindow(frame);
      this.#overlapAdd(newData, frame, outputPos, newLength);
      inputPos += stretchedHopSize;
      outputPos += hopSize;
    }
    this.#normalizeChannel(newData, newLength);
  }

  /**
   * Extract a frame from the original audio data
   * @param {Float32Array} originalData - Original audio data
   * @param {number} startPos - Start position
   * @param {number} frameSize - Frame size
   * @returns {Float32Array} - Extracted frame
   * @private
   */
  #extractFrame(originalData, startPos, frameSize) {
    const frame = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) {
      frame[i] = originalData[startPos + i] || 0;
    }
    return frame;
  }

  /**
   * Apply Hann window function to a frame
   * @param {Float32Array} frame - Audio frame
   * @private
   */
  #applyHannWindow(frame) {
    const frameSize = frame.length;
    for (let i = 0; i < frameSize; i++) {
      const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frameSize - 1)));
      frame[i] *= windowValue;
    }
  }

  /**
   * Overlap-add frame to output buffer
   * @param {Float32Array} outputData - Output buffer
   * @param {Float32Array} frame - Frame to add
   * @param {number} outputPos - Output position
   * @param {number} maxLength - Maximum output length
   * @private
   */
  #overlapAdd(outputData, frame, outputPos, maxLength) {
    for (let i = 0; i < frame.length && outputPos + i < maxLength; i++) {
      outputData[outputPos + i] += frame[i];
    }
  }

  /**
   * Normalize channel data to prevent clipping
   * @param {Float32Array} channelData - Channel data to normalize
   * @param {number} length - Data length
   * @private
   */
  #normalizeChannel(channelData, length) {
    let maxValue = 0;
    for (let i = 0; i < length; i++) {
      maxValue = Math.max(maxValue, Math.abs(channelData[i]));
    }

    if (maxValue > 1.0) {
      const normalizationFactor = 0.95 / maxValue;
      for (let i = 0; i < length; i++) {
        channelData[i] *= normalizationFactor;
      }
    }
  }

  /**
   * Clear the processed buffer cache
   */
  clearCache() {
    this.processedBuffers.clear();
    console.log('Pitch preservation buffer cache cleared');
  }
}
