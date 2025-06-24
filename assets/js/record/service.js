import { RecordingPreview } from './preview.js';

/**
 * ScreenRecordingService - Handles screen capture and recording functionality
 */
export class ScreenRecordingService {

  constructor() {
    /**
     * Media stream from getDisplayMedia() API
     * @type {MediaStream|null}
     * @private
     */
    this.mediaStream = null;
    
    /**
     * MediaRecorder instance for recording the media stream
     * @type {MediaRecorder|null}
     * @private
     */
    this.mediaRecorder = null;
    
    /**
     * Array to store recorded video chunks as they become available
     * @type {Blob[]}
     * @private
     */
    this.recordedChunks = [];
    
    /**
     * Boolean flag indicating current recording state
     * @type {boolean}
     * @public
     */
    this.isRecording = false;
    
    /**
     * Preview manager for handling video preview and status overlay
     * @type {RecordingPreview}
     * @private
     */
    this.preview = new RecordingPreview();
    
    /**
     * Maximum memory usage allowed before implementing progressive storage (bytes)
     * @type {number}
     * @private
     */
    this.maxMemoryUsage = 100 * 1024 * 1024; // 100MB max in memory
    
    /**
     * Current memory usage by recorded chunks (bytes)
     * @type {number}
     * @private
     */
    this.currentMemoryUsage = 0;
    
    /**
     * Total number of chunks recorded
     * @type {number}
     * @private
     */
    this.chunkCount = 0;
    
    /**
     * Timestamp when recording started (milliseconds)
     * @type {number|null}
     * @private
     */
    this.recordingStartTime = null;
    
    /**
     * Current recording duration (milliseconds)
     * @type {number}
     * @private
     */
    this.recordingDuration = 0;
    
    /**
     * Total file size of recorded content (bytes)
     * @type {number}
     * @private
     */
    this.totalFileSize = 0;
  }

  /**
   * Check if the current browser supports screen recording
   * @returns {Object} Support status and details
   */
  checkBrowserSupport() {
    const support = {
      isSupported: true,
      features: {
        getDisplayMedia: false,
        mediaRecorder: false,
        supportedCodecs: []
      },
      browserInfo: {
        name: 'Unknown',
        version: 'Unknown'
      },
      errors: []
    };

    // Detect browser
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Chrome') > -1) {
      support.browserInfo.name = 'Chrome';
    } else if (userAgent.indexOf('Firefox') > -1) {
      support.browserInfo.name = 'Firefox';
    } else if (userAgent.indexOf('Safari') > -1) {
      support.browserInfo.name = 'Safari';
    } else if (userAgent.indexOf('Edge') > -1) {
      support.browserInfo.name = 'Edge';
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      support.features.getDisplayMedia = true;
    } else {
      support.isSupported = false;
      support.errors.push('getDisplayMedia is not supported');
    }

    if (typeof MediaRecorder !== 'undefined') {
      support.features.mediaRecorder = true;
      
      const testCodecs = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4;codecs=h264,aac',
        'video/mp4'
      ];
      
      support.features.supportedCodecs = testCodecs.filter(codec => 
        MediaRecorder.isTypeSupported(codec)
      );
      
      if (support.features.supportedCodecs.length === 0) {
        support.isSupported = false;
        support.errors.push('No supported video codecs found');
      }
    } else {
      support.isSupported = false;
      support.errors.push('MediaRecorder is not supported');
    }

    // Additional checks for known problematic browsers
    if (support.browserInfo.name === 'Safari') {
      // Safari has limited support
      support.errors.push('Safari has limited screen recording support');
      support.isSupported = false;
    }

    // Browser-specific optimizations and warnings
    if (support.browserInfo.name === 'Firefox') {
      // Firefox might have different behavior
      support.warnings = support.warnings || [];
      support.warnings.push('Firefox may require manual codec selection');
    }

    if (support.browserInfo.name === 'Chrome') {
      support.optimizations = support.optimizations || [];
      support.optimizations.push('Chrome provides optimal screen recording performance');
    }

    if (support.browserInfo.name === 'Edge') {
      // Edge should work similarly to Chrome
      support.optimizations = support.optimizations || [];
      support.optimizations.push('Edge supports modern screen recording features');
    }

    return support;
  }



  /**
   * Set up handlers for recording interruptions
   */
  setupInterruptionHandlers() {
    if (!this.mediaStream) return;

    // Handle video track ending (user stops sharing screen/window)
    const videoTracks = this.mediaStream.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks[0].addEventListener('ended', () => {
        console.log('Video track ended - Screen sharing stopped by user');
        this.handleRecordingInterruption('USER_STOPPED_SHARING');
      });
    }

    // Handle audio track ending (if audio is included)
    const audioTracks = this.mediaStream.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks[0].addEventListener('ended', () => {
        console.log('Audio track ended');
        // Don't stop recording for audio track end, just note it
        console.warn('Audio recording interrupted, continuing with video only');
      });
    }

    // Handle MediaRecorder errors
    if (this.mediaRecorder) {
      this.mediaRecorder.addEventListener('error', (event) => {
        console.error('MediaRecorder error:', event.error);
        this.handleRecordingInterruption('RECORDER_ERROR', event.error);
      });
    }

    // Handle page visibility changes (user switches tabs, minimizes window)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isRecording) {
        console.log('Page hidden during recording, continuing...');
        // Continue recording but note the event
      }
    });

    // Handle page unload (user closes tab/refreshes)
    window.addEventListener('beforeunload', () => {
      if (this.isRecording) {
        console.log('Page unloading during recording');
        this.handleRecordingInterruption('PAGE_UNLOAD');
      }
    });
  }

  /**
   * Handle recording interruptions
   * @param {string} reason - Reason for interruption
   * @param {Error} error - Optional error object
   */
  async handleRecordingInterruption(reason, error = null) {
    console.log(`Recording interrupted: ${reason}`, error);

    if (!this.isRecording) {
      return; // Already handled
    }

    try {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        console.log('Attempting to save partial recording...');
        this.mediaRecorder.stop();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create partial video blob if we have chunks
        if (this.recordedChunks.length > 0) {
          const partialBlob = this.createVideoBlob();
          if (partialBlob) {
            console.log('Partial recording saved:', partialBlob.size, 'bytes');
          }
        }
      }
    } catch (cleanupError) {
      console.error('Error during interruption cleanup:', cleanupError);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Request display media and initialize recording
   * @returns {Promise<void>}
   */
  async startScreenCapture() {
    try {
      // Check browser support upfront
      const browserSupport = this.checkBrowserSupport();
      if (!browserSupport.isSupported) {
        const error = new Error(`Screen recording is not supported: ${browserSupport.errors.join(', ')}`);
        error.name = 'UnsupportedBrowserError';
        error.userMessage = `Screen recording is not supported in ${browserSupport.browserInfo.name}. Please use Chrome, Firefox, or Edge.`;
        error.supportDetails = browserSupport;
        throw error;
      }

      console.log('Browser support check passed:', browserSupport);

      // Define media constraints for screen capture
      const constraints = {
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      };

      this.mediaStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      console.log('Screen capture stream obtained:', this.mediaStream);
      
      // Set up MediaRecorder with appropriate codec
      const supportedMimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4;codecs=h264,aac',
        'video/mp4'
      ];
      
      let selectedMimeType = '';
      for (const mimeType of supportedMimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          console.log('Using codec:', mimeType);
          break;
        }
      }
      
      if (!selectedMimeType) {
        throw new Error('No supported video codec found');
      }
      
      // Initialize MediaRecorder
      const options = {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 8000000, // 8 Mbps
        audioBitsPerSecond: 128000   // 128 kbps
      };
      
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
      this.mediaRecorder.ondataavailable = (event) => this.handleDataAvailable(event);
      this.mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
        this.isRecording = false;
      };
      
              // Handle stream end events and recording interruptions
        this.setupInterruptionHandlers();
        
        // Set up preview video and start updates
        this.preview.setupPreview(this.mediaStream);
        this.preview.startUpdates(() => this.getRecordingData());
      
      // Clear previous recorded chunks and reset metadata
      this.recordedChunks = [];
      this.currentMemoryUsage = 0;
      this.chunkCount = 0;
      this.totalFileSize = 0;
      this.recordingStartTime = Date.now();
      this.recordingDuration = 0;
      
      // Start recording - State transition: idle → recording
      this.mediaRecorder.start(1000); // Collect data every 1000ms
      this.isRecording = true;
      
      console.log('Screen recording started - State: idle → recording', {
        startTime: new Date(this.recordingStartTime).toISOString(),
        maxMemoryLimit: this.preview.formatBytes(this.maxMemoryUsage)
      });
      
    } catch (error) {
      console.error('Error starting screen capture:', error);
      if (error.name === 'NotAllowedError') {
        // User denied permission
        const permissionError = new Error('Screen capture permission was denied by the user');
        permissionError.name = 'PermissionDeniedError';
        permissionError.userMessage = 'Please allow screen sharing to start recording';
        throw permissionError;
      } else if (error.name === 'NotFoundError') {
        // No screen capture source available
        const sourceError = new Error('No screen capture source available');
        sourceError.name = 'NoSourceError';
        sourceError.userMessage = 'No screen or window is available for capture';
        throw sourceError;
      } else if (error.name === 'AbortError') {
        // User canceled the screen selection
        const cancelError = new Error('Screen capture was canceled by the user');
        cancelError.name = 'UserCanceledError';
        cancelError.userMessage = 'Screen capture was canceled';
        throw cancelError;
      } else if (error.message.includes('not supported')) {
        // Browser doesn't support screen capture
        const supportError = new Error('Screen capture is not supported in this browser');
        supportError.name = 'UnsupportedError';
        supportError.userMessage = 'Your browser does not support screen recording. Please use Chrome, Firefox, or Edge.';
        throw supportError;
      }
      
      // For any other errors, re-throw with user-friendly message
      error.userMessage = 'An unexpected error occurred while starting screen capture';
      throw error;
    }
  }

  /**
   * Stop recording and process the final video
   * @returns {Promise<void>}
   */
  async stopScreenCapture() {
    try {
      if (!this.isRecording || !this.mediaRecorder) {
        console.log('Recording is not active');
        return;
      }

      console.log('Stopping recording - State: recording → processing');
      this.mediaRecorder.stop();

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => {
          track.stop();
        });
      }

      await new Promise((resolve) => {
        if (this.mediaRecorder.state === 'inactive') {
          resolve();
        } else {
          this.mediaRecorder.addEventListener('stop', resolve, { once: true });
        }
      });
      console.log('Processing recorded data - State: processing → complete');
      const videoBlob = this.createVideoBlob();
      
      if (videoBlob) {
        console.log('Screen recording completed successfully');
        
        // Add to video layers
        await this.addToVideoLayers(videoBlob);
        
        // Clean up
        this.cleanup();
        
        console.log('Recording process complete - State: complete');
      } else {
        throw new Error('Failed to create video blob from recorded chunks');
      }
      
    } catch (error) {
      console.error('Error stopping screen capture:', error);
      this.isRecording = false;
      throw error;
    }
  }

  /**
   * Handle data available event from MediaRecorder
   * @param {BlobEvent} event - The data available event
   */
  handleDataAvailable(event) {
    if (event.data && event.data.size > 0) {
      this.chunkCount++;
      this.currentMemoryUsage += event.data.size;
      this.totalFileSize += event.data.size;

      if (this.recordingStartTime) {
        this.recordingDuration = Date.now() - this.recordingStartTime;
      }

      if (this.currentMemoryUsage > this.maxMemoryUsage) {
        console.warn('Memory usage exceeded limit, implementing progressive storage...');
        this.handleMemoryPressure();
      }
      
      this.recordedChunks.push(event.data);
      
      console.log('Recorded chunk added:', {
        chunkSize: event.data.size,
        totalChunks: this.recordedChunks.length,
        memoryUsage: this.preview.formatBytes(this.currentMemoryUsage),
        totalFileSize: this.preview.formatBytes(this.totalFileSize),
        duration: this.preview.formatDuration(this.recordingDuration)
      });
      
      // Monitor memory usage and warn if getting high
      if (this.currentMemoryUsage > this.maxMemoryUsage * 0.8) {
        console.warn('Memory usage approaching limit:', this.preview.formatBytes(this.currentMemoryUsage));
      }
    }
  }

  /**
   * Handle memory pressure by optimizing storage
   */
  handleMemoryPressure() {
    console.log('Handling memory pressure...');
    
    // In a real implementation, you might want to:
    // 1. Write older chunks to IndexedDB or temporary storage
    // 2. Implement a rolling buffer system
    // 3. Compress chunks if possible
    // 4. Warn the user about memory constraints
    
    // For now, we'll just log a warning and continue
    // This could be extended to implement actual progressive storage
    console.warn('Memory usage is high. Consider stopping recording soon or implementing disk-based storage.');
  }

  /**
   * Get current recording data for preview updates
   * @returns {Object} Current recording data
   * @private
   */
  getRecordingData() {
    return {
      isRecording: this.isRecording,
      duration: this.recordingDuration,
      fileSize: this.totalFileSize,
      mimeType: this.mediaRecorder ? this.mediaRecorder.mimeType : null,
      mediaStream: this.mediaStream
    };
  }

  /**
   * Combine chunks into final video blob
   * @returns {Blob} The combined video blob
   */
  createVideoBlob() {
    if (this.recordedChunks.length === 0) {
      console.warn('No recorded chunks available');
      return null;
    }

    // Determine the MIME type from the first chunk
    const firstChunk = this.recordedChunks[0];
    let mimeType = firstChunk.type || 'video/webm';

    const videoBlob = new Blob(this.recordedChunks, { type: mimeType });
    
    console.log('Video blob created:', {
      size: videoBlob.size,
      type: videoBlob.type,
      chunks: this.recordedChunks.length
    });
    
    return videoBlob;
  }

  /**
   * Integrate recorded video into the studio's layer system
   * @param {Blob} videoBlob - The recorded video blob
   * @returns {Promise<void>}
   */
  async addToVideoLayers(videoBlob) {
    try {
      if (!videoBlob) {
        throw new Error('No video blob provided');
      }

      console.log('Converting video blob to URL and adding to layer system...');
      const videoUrl = URL.createObjectURL(videoBlob);
      console.log('Video blob converted to URL:', videoUrl);
      let response = await fetch(videoUrl);
      let data = await response.blob();


      // Create a timestamp for the filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screen-recording-${timestamp}.webm`;
      
      // Get reference to the studio instance
      const studio = window.studio;
      if (!studio) {
        throw new Error('Studio instance not available');
      }
      

      console.log('Adding screen recording to layer system:', {
        filename,
        size: this.preview.formatBytes(videoBlob.size),
        type: videoBlob.type
      });

      console.log('buffer from the url data:', {
        filename,
        size: this.preview.formatBytes(data.size),
        type: data.type
      });
      let file = new File([data], 'screen-recording.mp4', { type: videoBlob.type });
      file.uri = videoUrl;
      // const file = new File([videoBlob], 'screen-recording.webm', { type: videoBlob.type });
      // return
      // Use the existing layer loading system to add the video
      // This will automatically create a video layer and add it to the timeline
      return
      const addedLayers = studio.layerLoader.addLayerFromFile(file);
      console.log('Added layers:', addedLayers);
      
      console.log('Screen recording successfully added to video layers');
      
      // Optionally show a success notification
      if (window.popup) {
        const successMessage = document.createElement('div');
        successMessage.innerHTML = `
          <h3>Screen Recording Complete!</h3>
          <p>Your screen recording has been added to the timeline.</p>
          <p><strong>File:</strong> ${filename}</p>
          <p><strong>Size:</strong> ${this.preview.formatBytes(videoBlob.size)}</p>
          <p><strong>Duration:</strong> ${this.preview.formatDuration(this.recordingDuration)}</p>
        `;
        window.popup(successMessage);
      }
      
    } catch (error) {
      console.error('Error adding video to layers:', error);
      
      // Show error notification
      if (window.popup) {
        const errorMessage = document.createElement('div');
        errorMessage.innerHTML = `
          <h3>Error Adding Recording</h3>
          <p>There was an error adding your screen recording to the timeline:</p>
          <p><strong>Error:</strong> ${error.message}</p>
        `;
        window.popup(errorMessage);
      }
      
      throw error;
    }
  }

  /**
   * Clean up resources after recording
   */
  cleanup() {
    // Reset recording state
    this.isRecording = false;
    
    // Clear recorded chunks to free memory
    this.recordedChunks = [];
    
    // Reset metadata
    this.currentMemoryUsage = 0;
    this.chunkCount = 0;
    this.totalFileSize = 0;
    this.recordingStartTime = null;
    this.recordingDuration = 0;
    
    // Clean up media recorder
    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }
    
    // Clean up media stream
    if (this.mediaStream) {
      this.mediaStream = null;
    }
    
    // Clean up preview
    this.preview.cleanup();
    
    console.log('Resources, metadata, and preview elements cleaned up');
  }
}
