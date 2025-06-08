/**
 * Video utility functions for processing VideoLayer frames
 */

import { fps } from '../constants.js';

/**
 * Removes a video interval from a VideoLayer by removing frames
 * @param {Object} videoLayer - The VideoLayer instance
 * @param {number} startTime - Start time in seconds to remove
 * @param {number} endTime - End time in seconds to remove
 * @returns {boolean} True if the interval was removed successfully
 */
export function removeVideoInterval(videoLayer, startTime, endTime) {
  if (!videoLayer || !videoLayer.framesCollection || startTime >= endTime || startTime < 0) {
    console.error('Invalid parameters for removeVideoInterval');
    return false;
  }

  const framesCollection = videoLayer.framesCollection;
  const totalDuration = videoLayer.totalTimeInMilSeconds / 1000;
  
  // Clamp times to valid ranges
  const clampedStartTime = Math.max(0, Math.min(startTime, totalDuration));
  const clampedEndTime = Math.max(clampedStartTime, Math.min(endTime, totalDuration));
  
  // Convert time to frame indices
  const startFrameIndex = Math.floor(clampedStartTime * fps);
  const endFrameIndex = Math.ceil(clampedEndTime * fps);
  
  // Clamp to valid frame ranges
  const totalFrames = framesCollection.getLength();
  const clampedStartFrame = Math.max(0, Math.min(startFrameIndex, totalFrames));
  const clampedEndFrame = Math.max(clampedStartFrame, Math.min(endFrameIndex, totalFrames));
  
  const framesToRemove = clampedEndFrame - clampedStartFrame;
  
  if (framesToRemove <= 0) {
    console.log('No frames to remove from video layer');
    return false;
  }
  
  if (framesToRemove >= totalFrames) {
    console.warn('Removing interval would result in empty video layer');
    // Keep at least one frame to avoid empty layer
    framesCollection.slice(1, totalFrames - 1);
    videoLayer.totalTimeInMilSeconds = 1000 / fps; // Duration of one frame
    return true;
  }
  
  // Remove the frames from the collection
  framesCollection.slice(clampedStartFrame, framesToRemove);
  
  // Update the total time
  const removedDuration = (clampedEndTime - clampedStartTime) * 1000;
  videoLayer.totalTimeInMilSeconds = Math.max(0, videoLayer.totalTimeInMilSeconds - removedDuration);
  
  console.log(`Removed video interval ${clampedStartTime}s-${clampedEndTime}s. Removed ${framesToRemove} frames. New duration: ${videoLayer.totalTimeInMilSeconds / 1000}s`);
  
  return true;
}

/**
 * Finds VideoLayers in the studio layers
 * @returns {Array} Array of VideoLayer instances
 */
export function getVideoLayers() {
  if (!window.studio) {
    console.error('Studio not found');
    return [];
  }
  
  const videoLayers = [];
  const layers = window.studio.getLayers();
  
  for (let layer of layers) {
    if (layer.constructor.name === 'VideoLayer' && layer.framesCollection) {
      videoLayers.push(layer);
    }
  }
  
  return videoLayers;
}

/**
 * Updates studio total time after video layer modifications
 */
export function updateStudioTotalTime() {
  if (window.studio) {
    window.studio.player.total_time = 0;
    for (let layer of window.studio.getLayers()) {
      if (layer.start_time + layer.totalTimeInMilSeconds > window.studio.player.total_time) {
        window.studio.player.total_time = layer.start_time + layer.totalTimeInMilSeconds;
      }
    }
    
    // Refresh the studio timeline
    if (window.studio.timeline) {
      window.studio.timeline.render(window.studio.getLayers());
    }
    
    console.log(`Updated studio total time to: ${window.studio.player.total_time / 1000}s`);
  }
} 