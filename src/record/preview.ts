interface RecordingData {
  isRecording: boolean;
  duration: number;
  fileSize: number;
  mimeType: string | null;
  mediaStream: MediaStream | null;
}

type GetRecordingDataFunction = () => RecordingData;

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

  private previewVideo: HTMLVideoElement | null = null;
  private previewOverlay: HTMLDivElement | null = null;
  private previewUpdateInterval: number | null = null;

  constructor() {
    this.previewVideo = null;
    this.previewOverlay = null;
    this.previewUpdateInterval = null;
  }

  /**
   * Set up preview video element for live screen capture
   */
  setupPreview(mediaStream: MediaStream | null): void {
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
        padding: 10px;
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
   */
  startUpdates(getRecordingData: GetRecordingDataFunction): void {
    if (this.previewUpdateInterval) {
      clearInterval(this.previewUpdateInterval);
    }
    this.updateRecordingInfo(getRecordingData());
    this.previewUpdateInterval = window.setInterval(() => {
      const recordingData = getRecordingData();
      if (recordingData.isRecording) {
        const durationElement = document.getElementById('recording-duration')!;
        durationElement.textContent = this.formatDuration(recordingData.duration);
        const sizeElement = document.getElementById('recording-size')!;
        sizeElement.textContent = this.formatBytes(recordingData.fileSize);
        const indicator = document.getElementById('recording-indicator')!;
        indicator.style.opacity = indicator.style.opacity === '0.5' ? '1' : '0.5';
      }
    }, 500); // Update every 500ms
  }

  /**
   * Update recording information display
   */
  updateRecordingInfo(recordingData: RecordingData): void {
    const formatElement = document.getElementById('recording-format')!;
    if (formatElement && recordingData.mimeType) {
      let format = 'Unknown';
      if (recordingData.mimeType.includes('webm')) {
        format = 'WebM';
      } else if (recordingData.mimeType.includes('mp4')) {
        format = 'MP4';
      }

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
      if (!videoTrack) {
        return
      }
      const settings = videoTrack.getSettings();
      if (!settings.width || !settings.height) {
        return;
      }
      // Add resolution info to the overlay
      let resolutionSpan = document.getElementById('recording-resolution') as HTMLSpanElement;
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

  /**
   * Hide preview video element
   */
  hide(): void {
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
  show(): void {
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
  stopUpdates(): void {
    if (this.previewUpdateInterval) {
      clearInterval(this.previewUpdateInterval);
      this.previewUpdateInterval = null;
    }
  }

  /**
   * Clean up preview elements and resources
   */
  cleanup(): void {
    this.stopUpdates();

    // Clean up preview video if exists
    if (this.previewVideo) {
      this.previewVideo.srcObject = null;
      if (document.body.contains(this.previewVideo)) {
        document.body.removeChild(this.previewVideo);
      }
      this.previewVideo = null;
    }

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
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format duration into human readable format
   */
  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
