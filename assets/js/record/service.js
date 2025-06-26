import {RecordingPreview} from './preview.js';
import {checkBrowserSupport} from "./browser-support.js";
import webmDurationFix from 'https://cdn.jsdelivr.net/npm/webm-duration-fix@1.0.4/+esm'

/**
 * ScreenRecordingService - Handles screen capture and recording functionality
 */
export class ScreenRecordingService {
  #mediaStream = null;
  #mediaRecorder = null;
  #recordedChunks = [];
  #preview = new RecordingPreview();
  #maxMemoryUsage = 100 * 1024 * 1024; // 100MB max in memory
  #currentMemoryUsage = 0;
  #chunkCount = 0;
  #recordingStartTime = null;
  #recordingDuration = 0;
  #totalFileSize = 0;
  #onVideoFileCreatedCallback = (file) => {
  }

  constructor() {
    /**
     * @type {MediaStream|null}
     */
    this.#mediaStream = null;

    /**
     * @type {MediaRecorder|null}
     */
    this.#mediaRecorder = null;

    /**
     * @type {Blob[]}
     */
    this.#recordedChunks = [];

    /**
     * @type {number|null}
     */
    this.#recordingStartTime = null;
    this.isRecording = false;
    this.#maxMemoryUsage = 100 * 1024 * 1024; // 100MB max in memory
    this.#currentMemoryUsage = 0;
    this.#chunkCount = 0;
    this.#recordingDuration = 0;
    this.#totalFileSize = 0;
  }

  /**
   * Set up handlers for recording interruptions
   */
  #addEventListeners() {
    if (!this.#mediaStream) {
      return;
    }

    // Handle video track ending (user stops sharing screen/window)
    const videoTracks = this.#mediaStream.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks[0].addEventListener('ended', () => {
        console.log('Video track ended - Screen sharing stopped by user');
        this.#handleRecordingInterruption('USER_STOPPED_SHARING');
      });
    }

    // Handle audio track ending (if audio is included)
    const audioTracks = this.#mediaStream.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks[0].addEventListener('ended', () => {
        console.warn('Audio recording interrupted, continuing with video only');
      });
    }

    if (this.#mediaRecorder) {
      this.#mediaRecorder.addEventListener('error', (event) => {
        console.error('MediaRecorder error:', event.error);
        this.#handleRecordingInterruption('RECORDER_ERROR', event.error);
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
        this.#handleRecordingInterruption('PAGE_UNLOAD');
      }
    });
  }

  addOnVideoFileCreatedListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    this.#onVideoFileCreatedCallback = callback;
  }

  /**
   * Handle recording interruptions
   * @param {string} reason - Reason for interruption
   * @param {Error} error - Optional error object
   */
  async #handleRecordingInterruption(reason, error = null) {
    console.log(`Recording interrupted: ${reason}`, error);

    if (!this.isRecording) {
      return; // Already handled
    }

    try {
      if (this.#mediaRecorder && this.#mediaRecorder.state === 'recording') {
        console.log('Attempting to save partial recording...');
        this.#mediaRecorder.stop();
        await new Promise(resolve => setTimeout(resolve, 100));
        if (this.#recordedChunks.length < 1) {
          return; // No data to save
        }
        const partialBlob = await this.#createVideoBlob();
        this.#onVideoFileCreatedCallback(this.#createVideoFile(partialBlob));
        if (partialBlob) {
          console.log('Partial recording saved:', partialBlob.size, 'bytes');
        }
      }
    } catch (cleanupError) {
      console.error('Error during interruption cleanup:', cleanupError);
    } finally {
      this.#cleanup();
    }
  }

  /**
   * Request display media and initialize recording
   * @returns {Promise<void>}
   */
  async startScreenCapture() {
    try {
      const browserSupport = checkBrowserSupport();
      if (!browserSupport.isSupported) {
        const error = new Error(`Screen recording is not supported: ${browserSupport.errors.join(', ')}`);
        error.name = 'UnsupportedBrowserError';
        error.userMessage = `Screen recording is not supported in ${browserSupport.browserInfo.name}. Please use Chrome, Firefox, or Edge.`;
        error.supportDetails = browserSupport;
        throw error;
      }

      const constraints = {
        video: {
          mediaSource: 'screen',
          width: {ideal: 1920, max: 1920},
          height: {ideal: 1080, max: 1080},
          frameRate: {ideal: 30, max: 60}
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      };

      this.#mediaStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      this.#setupMediaRecorder();
      this.#addEventListeners();

      this.#preview.setupPreview(this.#mediaStream);
      this.#preview.startUpdates(() => this.#getRecordingData());

      // Clear previous recorded chunks and reset metadata
      this.#recordedChunks = [];
      this.#currentMemoryUsage = 0;
      this.#chunkCount = 0;
      this.#totalFileSize = 0;
      this.#recordingStartTime = Date.now();
      this.#recordingDuration = 0;

      // Start recording - State transition: idle → recording
      this.#mediaRecorder.start(1000); // Collect data every 1000ms
      this.isRecording = true;

      console.log('Screen recording started - State: idle → recording', {
        startTime: new Date(this.#recordingStartTime).toISOString(),
        maxMemoryLimit: this.#preview.formatBytes(this.#maxMemoryUsage)
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
        const sourceError = new Error('No screen or window is available for capture');
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
   * Request camera media and initialize recording
   * @returns {Promise<void>}
   */
  async startCameraCapture() {
    try {
      const browserSupport = checkBrowserSupport();
      if (!browserSupport.isSupported) {
        const error = new Error(`Camera recording is not supported: ${browserSupport.errors.join(', ')}`);
        error.name = 'UnsupportedBrowserError';
        error.userMessage = `Camera recording is not supported in ${browserSupport.browserInfo.name}. Please use Chrome, Firefox, or Edge.`;
        error.supportDetails = browserSupport;
        throw error;
      }

      const constraints = {
        video: {
          width: {ideal: 1920, max: 1920},
          height: {ideal: 1080, max: 1080},
          frameRate: {ideal: 30, max: 60},
          facingMode: 'user' // Front-facing camera
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      };

      this.#mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.#setupMediaRecorder();
      this.#addEventListeners();

      this.#preview.setupPreview(this.#mediaStream);
      this.#preview.startUpdates(() => this.#getRecordingData());

      // Clear previous recorded chunks and reset metadata
      this.#recordedChunks = [];
      this.#currentMemoryUsage = 0;
      this.#chunkCount = 0;
      this.#totalFileSize = 0;
      this.#recordingStartTime = Date.now();
      this.#recordingDuration = 0;

      // Start recording - State transition: idle → recording
      this.#mediaRecorder.start(1000); // Collect data every 1000ms
      this.isRecording = true;

      console.log('Camera recording started - State: idle → recording', {
        startTime: new Date(this.#recordingStartTime).toISOString(),
        maxMemoryLimit: this.#preview.formatBytes(this.#maxMemoryUsage)
      });

    } catch (error) {
      console.error('Error starting camera capture:', error);
      if (error.name === 'NotAllowedError') {
        // User denied permission
        const permissionError = new Error('Camera access permission was denied by the user');
        permissionError.name = 'PermissionDeniedError';
        permissionError.userMessage = 'Please allow camera access to start recording';
        throw permissionError;
      } else if (error.name === 'NotFoundError') {
        // No camera available
        const sourceError = new Error('No camera device found');
        sourceError.name = 'NoSourceError';
        sourceError.userMessage = 'No camera device is available for recording';
        throw sourceError;
      } else if (error.name === 'AbortError') {
        // User canceled the camera selection
        const cancelError = new Error('Camera access was canceled by the user');
        cancelError.name = 'UserCanceledError';
        cancelError.userMessage = 'Camera access was canceled';
        throw cancelError;
      } else if (error.message.includes('not supported')) {
        // Browser doesn't support camera capture
        const supportError = new Error('Camera capture is not supported in this browser');
        supportError.name = 'UnsupportedError';
        supportError.userMessage = 'Your browser does not support camera recording. Please use Chrome, Firefox, or Edge.';
        throw supportError;
      }

      // For any other errors, re-throw with user-friendly message
      error.userMessage = 'An unexpected error occurred while starting camera capture';
      throw error;
    }
  }

  /**
   * Stop recording and process the final video
   * @returns {Promise<void>}
   */
  async stopRecording() {
    try {
      if (!this.isRecording || !this.#mediaRecorder) {
        console.log('Recording is not active');
        return;
      }

      console.log('Stopping recording - State: recording → processing');
      this.#mediaRecorder.stop();

      if (this.#mediaStream) {
        this.#mediaStream.getTracks().forEach(track => {
          track.stop();
        });
      }

      await new Promise((resolve) => {
        if (this.#mediaRecorder.state === 'inactive') {
          resolve();
        } else {
          this.#mediaRecorder.addEventListener('stop', resolve, {once: true});
        }
      });
      const videoBlob = await this.#createVideoBlob();

      if (videoBlob) {
        console.log('Processing recorded data - State: processing → complete');
        const videoFile = this.#createVideoFile(videoBlob);
        this.#onVideoFileCreatedCallback(videoFile);
        this.#cleanup();
      } else {
        throw new Error('Failed to create video blob from recorded chunks');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.isRecording = false;
      throw error;
    }
  }

  /**
   * Backward compatibility method for stopScreenCapture
   * @returns {Promise<void>}
   * @deprecated Use stopRecording() instead
   */
  async stopScreenCapture() {
    return this.stopRecording();
  }

  /**
   * Handle data available event from MediaRecorder
   * @param {BlobEvent} event - The data available event
   */
  #handleDataAvailable(event) {
    if (!event.data || event.data.size < 1) {
      return
    }
    this.#chunkCount++;
    this.#currentMemoryUsage += event.data.size;
    this.#totalFileSize += event.data.size;

    if (this.#recordingStartTime) {
      this.#recordingDuration = Date.now() - this.#recordingStartTime;
    }

    if (this.#currentMemoryUsage > this.#maxMemoryUsage) {
      console.warn('Memory usage exceeded limit, implementing progressive storage...');
      this.#handleMemoryPressure();
    }

    this.#recordedChunks.push(event.data);

    console.log('Recorded chunk added:', {
      chunkSize: event.data.size,
      totalChunks: this.#recordedChunks.length,
      memoryUsage: this.#preview.formatBytes(this.#currentMemoryUsage),
      totalFileSize: this.#preview.formatBytes(this.#totalFileSize),
      duration: this.#preview.formatDuration(this.#recordingDuration)
    });

    // Monitor memory usage and warn if getting high
    if (this.#currentMemoryUsage > this.#maxMemoryUsage * 0.8) {
      console.warn('Memory usage approaching limit:', this.#preview.formatBytes(this.#currentMemoryUsage));
    }
  }

  /**
   * Handle memory pressure by optimizing storage
   */
  #handleMemoryPressure() {
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
   */
  #getRecordingData() {
    return {
      isRecording: this.isRecording,
      duration: this.#recordingDuration,
      fileSize: this.#totalFileSize,
      mimeType: this.#mediaRecorder ? this.#mediaRecorder.mimeType : null,
      mediaStream: this.#mediaStream
    };
  }

  /**
   * Combine chunks into final video blob
   * @returns {Blob} The combined video blob
   */
  async #createVideoBlob() {
    if (this.#recordedChunks.length === 0) {
      console.warn('No recorded chunks available');
      return null;
    }

    // Determine the MIME type from the first chunk
    const firstChunk = this.#recordedChunks[0];
    let mimeType = firstChunk.type || 'video/webm';

    const videoBlob = new Blob(this.#recordedChunks, {type: mimeType});

    console.log('Video blob created:', {
      size: videoBlob.size,
      type: videoBlob.type,
      chunks: this.#recordedChunks.length
    });

    return await webmDurationFix.default(videoBlob, {mimeType: videoBlob.type});
  }

  /**
   * Integrate recorded video into the studio's layer system
   * @param {Blob} videoBlob - The recorded video blob
   * @returns {File} The created video file object
   */
  #createVideoFile(videoBlob) {
    try {
      const videoUrl = URL.createObjectURL(videoBlob);
      console.log('Video blob converted to URL:', videoUrl);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screen-recording-${timestamp}.webm`;

      console.log('Adding screen recording to layer system:', {
        filename,
        size: this.#preview.formatBytes(videoBlob.size),
        type: videoBlob.type
      });

      let file = new File([videoBlob], filename, {type: videoBlob.type});
      file.uri = videoUrl;
      return file
    } catch (error) {
      console.error('Error adding video to layers:', error);
      throw error;
    }
  }

  /**
   * Clean up resources after recording
   */
  #cleanup() {
    // Reset recording state
    this.isRecording = false;

    // Clear recorded chunks to free memory
    this.#recordedChunks = [];

    // Reset metadata
    this.#currentMemoryUsage = 0;
    this.#chunkCount = 0;
    this.#totalFileSize = 0;
    this.#recordingStartTime = null;
    this.#recordingDuration = 0;

    // Clean up media recorder
    if (this.#mediaRecorder) {
      this.#mediaRecorder = null;
    }

    // Clean up media stream
    if (this.#mediaStream) {
      this.#mediaStream = null;
    }

    // Clean up preview
    this.#preview.cleanup();

    console.log('Resources, metadata, and preview elements cleaned up');
  }

  #setupMediaRecorder() {
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

    const options = {
      mimeType: selectedMimeType,
      videoBitsPerSecond: 8000000, // 8 Mbps
      audioBitsPerSecond: 128000   // 128 kbps
    };

    this.#mediaRecorder = new MediaRecorder(this.#mediaStream, options);
    this.#mediaRecorder.ondataavailable = (event) => this.#handleDataAvailable(event);
    this.#mediaRecorder.onstop = () => {
      console.log('MediaRecorder stopped');
      this.isRecording = false;
    };
  }
}
