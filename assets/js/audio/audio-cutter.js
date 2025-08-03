/**
 * AudioCutter provides audio cutting functionality
 */
export class AudioCutter {

  /**
   * Removes an audio interval from the provided AudioBuffer
   * @param {AudioBuffer} audioBuffer - The original audio buffer
   * @param {AudioContext} audioContext - Audio context for creating new buffer
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @returns {AudioBuffer|null} - New audio buffer with interval removed, or null on error
   */
  removeInterval(audioBuffer, audioContext, startTime, endTime) {
    if (!this.#validateInputs(audioBuffer, startTime, endTime, audioContext)) {
      return null;
    }

    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const originalLength = audioBuffer.length;

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
      return audioContext.createBuffer(numberOfChannels, 1, sampleRate);
    }

    const newBuffer = audioContext.createBuffer(numberOfChannels, newLength, sampleRate);
    this.#copyAudioData(audioBuffer, newBuffer, clampedStartSample, clampedEndSample);
    console.log(`Removed audio interval ${startTime}s-${endTime}s. Original: ${audioBuffer.duration}s, New: ${newBuffer.duration}s`);
    return newBuffer;
  }

  /**
   * Validates input parameters for audio interval removal
   * @param {AudioBuffer} audioBuffer - The audio buffer to validate
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @param {AudioContext} audioContext - Audio context to validate
   * @returns {boolean} - True if inputs are valid, false otherwise
   * @private
   */
  #validateInputs(audioBuffer, startTime, endTime, audioContext) {
    if (!audioBuffer) {
      console.error('AudioCutter: No audio buffer provided');
      return false;
    }

    if (!audioContext) {
      console.error('AudioCutter: No audio context provided');
      return false;
    }

    if (startTime >= endTime || startTime < 0) {
      console.error('AudioCutter: Invalid parameters for removeInterval - startTime:', startTime, 'endTime:', endTime);
      return false;
    }

    return true;
  }

  /**
   * Copies audio data from original buffer to new buffer, excluding the specified interval
   * @param {AudioBuffer} originalBuffer - Source audio buffer
   * @param {AudioBuffer} newBuffer - Destination audio buffer
   * @param {number} startSample - Start sample index to exclude
   * @param {number} endSample - End sample index to exclude
   * @private
   */
  #copyAudioData(originalBuffer, newBuffer, startSample, endSample) {
    const numberOfChannels = originalBuffer.numberOfChannels;
    const originalLength = originalBuffer.length;

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const originalChannelData = originalBuffer.getChannelData(channel);
      const newChannelData = newBuffer.getChannelData(channel);

      let writeIndex = 0;

      // Copy data before the removed interval
      for (let i = 0; i < startSample; i++) {
        newChannelData[writeIndex++] = originalChannelData[i];
      }

      // Skip the removed interval and copy data after
      for (let i = endSample; i < originalLength; i++) {
        newChannelData[writeIndex++] = originalChannelData[i];
      }
    }
  }
}
