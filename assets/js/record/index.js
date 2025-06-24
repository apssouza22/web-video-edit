import { ScreenRecordingService } from './service.js';

/**
 * Export the main ScreenRecordingService class
 */
export { ScreenRecordingService };

/**
 * Create and initialize a new screen recording service instance
 * @returns {ScreenRecordingService} New screen recording service instance
 */
export function createScreenRecorder() {
  return new ScreenRecordingService();
}

/**
 * Check if screen recording is supported in the current browser
 * @returns {Object} Browser support information
 */
export function checkScreenRecordingSupport() {
  const service = new ScreenRecordingService();
  return service.checkBrowserSupport();
}

/**
 * Initialize screen recording functionality for a video studio instance
 * @param {VideoStudio} studio - The video studio instance
 * @returns {ScreenRecordingService} Configured screen recording service
 */
export function initializeScreenRecording(studio) {
  const screenRecorder = new ScreenRecordingService();
  
  // Additional initialization logic could go here
  // e.g., setting up studio-specific callbacks, configuration, etc.
  
  console.log('Screen recording initialized for studio');
  return screenRecorder;
}

/**
 * Default export for convenience
 */
export default ScreenRecordingService;
