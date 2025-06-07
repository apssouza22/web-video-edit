/**
 * Audio utility functions for processing AudioBuffer
 */

/**
 * Removes an audio interval from an AudioBuffer and returns a new AudioBuffer
 * @param {AudioBuffer} originalBuffer - The original audio buffer
 * @param {number} startTime - Start time in seconds to remove
 * @param {number} endTime - End time in seconds to remove
 * @param {AudioContext} audioContext - The audio context to use for creating new buffer
 * @returns {AudioBuffer} New AudioBuffer with the interval removed
 */
export function removeAudioInterval(originalBuffer, startTime, endTime, audioContext) {
  if (!originalBuffer || startTime >= endTime || startTime < 0) {
    console.error('Invalid parameters for removeAudioInterval');
    return originalBuffer;
  }

  const sampleRate = originalBuffer.sampleRate;
  const numberOfChannels = originalBuffer.numberOfChannels;
  const originalLength = originalBuffer.length;
  
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
    const minimalBuffer = audioContext.createBuffer(numberOfChannels, 1, sampleRate);
    return minimalBuffer;
  }
  
  // Create new buffer
  const newBuffer = audioContext.createBuffer(numberOfChannels, newLength, sampleRate);
  
  // Copy audio data for each channel
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const originalChannelData = originalBuffer.getChannelData(channel);
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
  
  console.log(`Removed audio interval ${startTime}s-${endTime}s. Original: ${originalBuffer.duration}s, New: ${newBuffer.duration}s`);
  
  return newBuffer;
}

/**
 * Finds AudioLayers in the studio layers
 * @returns {Array} Array of AudioLayer instances
 */
export function getAudioLayers() {
  if (!window.studio) {
    console.error('Studio not found');
    return [];
  }
  
  const audioLayers = [];
  const layers = window.studio.getLayers();
  
  for (let layer of layers) {
    if (layer.constructor.name === 'AudioLayer' && layer.audioBuffer) {
      audioLayers.push(layer);
    }
  }
  
  return audioLayers;
}

/**
 * Updates an AudioLayer with a new AudioBuffer
 * @param {Object} audioLayer - The AudioLayer to update
 * @param {AudioBuffer} newBuffer - The new AudioBuffer
 */
export function updateAudioLayerBuffer(audioLayer, newBuffer) {
  if (!audioLayer || !newBuffer) {
    console.error('Invalid parameters for updateAudioLayerBuffer');
    return;
  }
  
  // Disconnect current audio source
  audioLayer.disconnect();
  
  // Update the audio buffer
  audioLayer.audioBuffer = newBuffer;
  
  // Update total time
  audioLayer.totalTimeInMilSeconds = newBuffer.duration * 1000;
  
  // Update studio total time if needed
  if (window.studio) {
    window.studio.player.total_time = 0;
    for (let layer of window.studio.getLayers()) {
      if (layer.start_time + layer.totalTimeInMilSeconds > window.studio.player.total_time) {
        window.studio.player.total_time = layer.start_time + layer.totalTimeInMilSeconds;
      }
    }
    
    // Refresh audio connections
    window.studio.player.refreshAudio();
  }
  
  console.log(`Updated AudioLayer "${audioLayer.name}" with new buffer duration: ${newBuffer.duration}s`);
} 