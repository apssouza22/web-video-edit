/**
 * AudioCutter provides audio cutting functionality
 */
export class AudioCutter {

  /**
   * Removes an audio interval from the provided AudioBuffer
   * @param audioBuffer - The original audio buffer
   * @param audioContext - Audio context for creating new buffer
   * @param startTime - Start time in seconds
   * @param endTime - End time in seconds
   * @returns New audio buffer with interval removed, or null on error
   */
  removeInterval(audioBuffer: AudioBuffer, audioContext: AudioContext, startTime: number, endTime: number): AudioBuffer | null {
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
   * @param audioBuffer - The audio buffer to validate
   * @param startTime - Start time in seconds
   * @param endTime - End time in seconds
   * @param audioContext - Audio context to validate
   * @returns True if inputs are valid, false otherwise
   */
  #validateInputs(audioBuffer: AudioBuffer, startTime: number, endTime: number, audioContext: AudioContext): boolean {
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
   * @param originalBuffer - Source audio buffer
   * @param newBuffer - Destination audio buffer
   * @param startSample - Start sample index to exclude
   * @param endSample - End sample index to exclude
   */
  #copyAudioData(originalBuffer: AudioBuffer, newBuffer: AudioBuffer, startSample: number, endSample: number): void {
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
