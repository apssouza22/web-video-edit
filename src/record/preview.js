/**
 * RecordingPreview - Handles video preview display and status overlay for screen recording
 * 
 * This class manages:
 * - Live preview video element showing the screen capture
 * - Status overlay with recording information (duration, file size, format, resolution)
 * - Real-time updates of recording metrics
 * - Show/hide functionality for the preview
 * - Cleanup of preview elements
 * 
 * @class RecordingPreview
 */
export class RecordingPreview {
  constructor() {
    /**
     * Reference to preview video element showing live capture
     * @type {HTMLVideoElement|null}
     * @private
     */
    this.previewVideo = null;
    
    /**
     * Reference to preview overlay showing recording status
     * @type {HTMLDivElement|null}
     * @private
     */
    this.previewOverlay = null;
    
    /**
     * Interval ID for updating preview information
     * @type {number|null}
     * @private
     */
    this.previewUpdateInterval = null;
  }

  /**
   * Set up preview video element for live screen capture
   * @param {MediaStream} mediaStream - The media stream to preview
   */
  setupPreview(mediaStream) {
    // Create preview video element if it doesn't exist
    if (!this.previewVideo) {
      this.previewVideo = document.createElement('video');
      this.previewVideo.id = 'screen-recording-preview';
      this.previewVideo.autoplay = true;
      this.previewVideo.muted = true; // Prevent audio feedback
      this.previewVideo.controls = false;
      
      // Style the preview video
      this.previewVideo.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        width: 300px;
        height: auto;
        max-height: 200px;
        border: 2px solid #69d2ff;
        border-radius: 8px;
        background: black;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        object-fit: contain;
        transition: all 0.3s ease;
      `;
      
      // Add preview controls overlay
      this.previewOverlay = document.createElement('div');
      this.previewOverlay.id = 'screen-recording-overlay';
      this.previewOverlay.style.cssText = `
        position: fixed;
        top: 50px;
        right: 20px;
        width: 300px;
        background: rgba(43, 47, 51, 0.9);
        color: #c0c8d5;
        padding: 8px 12px;
        border-radius: 8px 8px 0 0;
        font-family: 'JupiterSans', Arial, sans-serif;
        font-size: 12px;
        z-index: 1001;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      
      this.previewOverlay.innerHTML = `
        <div id="recording-status">
          <span id="recording-indicator" style="color: #dc3545;">● REC</span>
          <span id="recording-duration">00:00</span>
        </div>
        <div id="recording-info">
          <span id="recording-size">0 MB</span>
          <span id="recording-format">WebM</span>
        </div>
      `;
      
      // Add to DOM
      document.body.appendChild(this.previewOverlay);
      document.body.appendChild(this.previewVideo);
    }
    
    // Set the media stream as the video source
    if (mediaStream) {
      this.previewVideo.srcObject = mediaStream;
      console.log('Preview video set up with media stream');
    }
  }

  /**
   * Start updating preview information with recording metrics
   * @param {Function} getRecordingData - Function that returns current recording data
   */
  startUpdates(getRecordingData) {
    if (this.previewUpdateInterval) {
      clearInterval(this.previewUpdateInterval);
    }
    
    // Update initial recording info
    this.updateRecordingInfo(getRecordingData());
    
    this.previewUpdateInterval = setInterval(() => {
      const recordingData = getRecordingData();
      if (recordingData.isRecording) {
        // Update duration
        const durationElement = document.getElementById('recording-duration');
        if (durationElement) {
          durationElement.textContent = this.formatDuration(recordingData.duration);
        }
        
        // Update file size
        const sizeElement = document.getElementById('recording-size');
        if (sizeElement) {
          sizeElement.textContent = this.formatBytes(recordingData.fileSize);
        }
        
        // Animate recording indicator
        const indicator = document.getElementById('recording-indicator');
        if (indicator) {
          indicator.style.opacity = indicator.style.opacity === '0.5' ? '1' : '0.5';
        }
      }
    }, 500); // Update every 500ms
  }

  /**
   * Update recording information display
   * @param {Object} recordingData - Current recording data
   */
  updateRecordingInfo(recordingData) {
    // Update format info
    const formatElement = document.getElementById('recording-format');
    if (formatElement && recordingData.mimeType) {
      let format = 'Unknown';
      
      if (recordingData.mimeType.includes('webm')) {
        format = 'WebM';
      } else if (recordingData.mimeType.includes('mp4')) {
        format = 'MP4';
      }
      
      // Add codec info if available
      if (recordingData.mimeType.includes('vp9')) {
        format += ' (VP9)';
      } else if (recordingData.mimeType.includes('vp8')) {
        format += ' (VP8)';
      } else if (recordingData.mimeType.includes('h264')) {
        format += ' (H264)';
      }
      
      formatElement.textContent = format;
    }
    
    // Update resolution info in overlay
    if (recordingData.mediaStream && this.previewOverlay) {
      const videoTrack = recordingData.mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        if (settings.width && settings.height) {
          // Add resolution info to the overlay
          let resolutionSpan = document.getElementById('recording-resolution');
          if (!resolutionSpan) {
            resolutionSpan = document.createElement('span');
            resolutionSpan.id = 'recording-resolution';
            resolutionSpan.style.fontSize = '10px';
            resolutionSpan.style.color = '#8a9ba8';
            
            const recordingInfo = document.getElementById('recording-info');
            if (recordingInfo) {
              recordingInfo.appendChild(document.createElement('br'));
              recordingInfo.appendChild(resolutionSpan);
            }
          }
          resolutionSpan.textContent = `${settings.width}×${settings.height}`;
        }
      }
    }
  }

  /**
   * Hide preview video element
   */
  hide() {
    if (this.previewVideo) {
      this.previewVideo.style.display = 'none';
    }
    if (this.previewOverlay) {
      this.previewOverlay.style.display = 'none';
    }
    
    this.stopUpdates();
  }

  /**
   * Show preview video element
   */
  show() {
    if (this.previewVideo) {
      this.previewVideo.style.display = 'block';
    }
    if (this.previewOverlay) {
      this.previewOverlay.style.display = 'flex';
    }
  }

  /**
   * Stop preview updates
   */
  stopUpdates() {
    if (this.previewUpdateInterval) {
      clearInterval(this.previewUpdateInterval);
      this.previewUpdateInterval = null;
    }
  }

  /**
   * Clean up preview elements and resources
   */
  cleanup() {
    // Stop updates
    this.stopUpdates();
    
    // Clean up preview video if exists
    if (this.previewVideo) {
      this.previewVideo.srcObject = null;
      if (document.body.contains(this.previewVideo)) {
        document.body.removeChild(this.previewVideo);
      }
      this.previewVideo = null;
    }
    
    // Clean up preview overlay if exists
    if (this.previewOverlay) {
      if (document.body.contains(this.previewOverlay)) {
        document.body.removeChild(this.previewOverlay);
      }
      this.previewOverlay = null;
    }
    
    console.log('Preview elements cleaned up');
  }

  /**
   * Format bytes into human readable format
   * @param {number} bytes - Number of bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format duration into human readable format
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
} 