import {RecordingPreview} from './preview';
import {checkBrowserSupport} from "@/common/browser-support";
import {fixWebmDuration} from "@/common/utils";
import {getEventBus, RecordVideoFileCreatedEvent} from '@/common/event-bus';

interface RecordingData {
  isRecording: boolean;
  duration: number;
  fileSize: number;
  mimeType: string | null;
  mediaStream: MediaStream | null;
}

interface BrowserSupportResult {
  isSupported: boolean;
  features: {
    getDisplayMedia: boolean;
    mediaRecorder: boolean;
    supportedCodecs: string[];
  };
  browserInfo: {
    name: string;
    version: string;
  };
  errors: string[];
  warnings?: string[];
  optimizations?: string[];
  supportDetails?: any;
}

interface StreamCombination {
  screen: MediaStream;
  microphone: MediaStream | null;
}

interface UserMediaConstraints {
  video: {
    width?: number;
    height?: number;
    frameRate?: number;
    mediaSource?: string;
    facingMode?: string;
  };
  audio: {
    echoCancellation: boolean;
    noiseSuppression: boolean;
    sampleRate: number;
  };
}

interface MediaRecorderOptions {
  mimeType: string;
  videoBitsPerSecond: number;
  audioBitsPerSecond: number;
}

interface RecordingError extends Error {
  userMessage?: string;
  supportDetails?: BrowserSupportResult;
}

/**
 * ScreenRecordingService - Handles screen capture and recording functionality
 */
export class UserMediaRecordingService {
  #mediaStream: MediaStream | null = null;
  #mediaRecorder: MediaRecorder | null = null;
  #recordedChunks: Blob[] = [];
  #preview: RecordingPreview = new RecordingPreview();
  #maxMemoryUsage: number = 100 * 1024 * 1024; // 100MB max in memory
  #currentMemoryUsage: number = 0;
  #chunkCount: number = 0;
  #recordingStartTime: number | null = null;
  #recordingDuration: number = 0;
  #totalFileSize: number = 0;
  #originalStreams: StreamCombination | null = null;
  #eventBus = getEventBus();
  #audioContext: AudioContext | null = null;
  #audioDestination: MediaStreamAudioDestinationNode | null = null;

  public isRecording: boolean = false;

  constructor() {
    this.#mediaStream = null;
    this.#mediaRecorder = null;
    this.#recordedChunks = [];
    this.#recordingStartTime = null;
    this.isRecording = false;
    this.#maxMemoryUsage = 100 * 1024 * 1024; // 100MB max in memory
    this.#currentMemoryUsage = 0;
    this.#chunkCount = 0;
    this.#recordingDuration = 0;
    this.#totalFileSize = 0;
    this.#originalStreams = null;
  }

  /**
   * Request display media and initialize recording
   */
  async startScreenCapture(): Promise<void> {
    this.#checkBrowserSupport();

    try {
      const screenConstraints: DisplayMediaStreamOptions = {
        video: {
          width: 1280,
          height: 720,
          frameRate: 30
        },
        audio: true  // Request system audio from the display/tab/window
      };
      const screenStream = await navigator.mediaDevices.getDisplayMedia(screenConstraints);
      const hasSystemAudio = screenStream.getAudioTracks().length > 0;
      console.log('System audio captured:', hasSystemAudio);

      // Separately request microphone audio with appropriate constraints
      let microphoneStream: MediaStream | null = null;
      try {
        const micConstraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        };
        microphoneStream = await navigator.mediaDevices.getUserMedia(micConstraints);
        console.log('Microphone access granted for screen recording');
      } catch (micError: any) {
        console.warn('Microphone access denied or unavailable, continuing without microphone:', micError.message);
      }

      this.#mediaStream = this.#combineStreams(screenStream, microphoneStream);
      await this.#startRecording();
    } catch (error) {
      console.error('Error starting screen capture:', error);
      throw error;
    }
  }

  /**
   * Request camera media and initialize recording
   */
  async startCameraCapture(): Promise<void> {
    this.#checkBrowserSupport();
    const constraints = this.#getDefaultUserMediaConstraints();
    constraints.video.facingMode = 'user';
    this.#mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    await this.#startRecording();
  }

  /**
   * Set up handlers for recording interruptions
   */
  #addEventListeners(): void {
    if (!this.#mediaStream) {
      return;
    }

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
      this.#mediaRecorder.addEventListener('error', (event: Event) => {
        console.error('MediaRecorder error:', (event as any).error);
        this.#handleRecordingInterruption('RECORDER_ERROR', (event as any).error);
      });
    }

    // Handle page visibility changes (user switches tabs, minimizes window)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isRecording) {
        console.log('Page hidden during recording, continuing...');
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

  /**
   * Handle recording interruptions
   */
  async #handleRecordingInterruption(reason: string, error: Error | null = null): Promise<void> {
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
        if (partialBlob) {
          const videoFile = this.#createVideoFile(partialBlob);
          this.#eventBus.emit(new RecordVideoFileCreatedEvent(videoFile));
          console.log('Partial recording saved:', partialBlob.size, 'bytes');
        }
      }
    } catch (cleanupError) {
      console.error('Error during interruption cleanup:', cleanupError);
    } finally {
      this.#cleanup();
    }
  }

  #getDefaultUserMediaConstraints(): UserMediaConstraints {
    return {
      video: {
        width: 1280,
        height: 720,
        frameRate: 30,
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      }
    };
  }

  async #startRecording(): Promise<void> {
    try {
      this.#setupMediaRecorder();
      this.#addEventListeners();

      this.#preview.setupPreview(this.#mediaStream);

      await this.#preview.showCountdown();

      this.#preview.startUpdates(() => this.#getRecordingData());
      this.#resetMetadata();
      this.#recordingStartTime = Date.now();
      this.#mediaRecorder!.start(1000); // Collect data every 1000ms
      this.isRecording = true;

      console.log('Screen recording started - State: idle → recording', {
        startTime: new Date(this.#recordingStartTime).toISOString(),
        maxMemoryLimit: this.#preview.formatBytes(this.#maxMemoryUsage)
      });

    } catch (error: any) {
      console.error('Error starting user media capture:', error);
      if (error.name === 'NotAllowedError') {
        const permissionError = new Error('User media capture permission was denied by the user') as RecordingError;
        permissionError.name = 'PermissionDeniedError';
        permissionError.userMessage = 'Please allow user media capture to start recording';
        throw permissionError;
      }
      if (error.name === 'NotFoundError') {
        const sourceError = new Error('No user media is available for capture') as RecordingError;
        sourceError.name = 'NoSourceError';
        sourceError.userMessage = 'No user media is available for capture';
        throw sourceError;
      }
      if (error.name === 'AbortError') {
        const cancelError = new Error('Screen capture was canceled by the user') as RecordingError;
        cancelError.name = 'UserCanceledError';
        cancelError.userMessage = 'Screen capture was canceled';
        throw cancelError;
      }
      if (error.message.includes('not supported')) {
        const supportError = new Error('User media capture is not supported in this browser') as RecordingError;
        supportError.name = 'UnsupportedError';
        supportError.userMessage = 'Your browser does not support user media recording. Please use Chrome, Firefox, or Edge.';
        throw supportError;
      }

      (error as RecordingError).userMessage = 'An unexpected error occurred while starting user media capture';
      throw error;
    }
  }

  #resetMetadata(): void {
    this.#recordedChunks = [];
    this.#currentMemoryUsage = 0;
    this.#chunkCount = 0;
    this.#totalFileSize = 0;
    this.#recordingDuration = 0;
  }

  /**
   * Stop recording and process the final video
   */
  async stopRecording(): Promise<void> {
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

      await new Promise<void>((resolve) => {
        if (this.#mediaRecorder!.state === 'inactive') {
          resolve();
        } else {
          this.#mediaRecorder!.addEventListener('stop', () => resolve(), {once: true});
        }
      });
      const videoBlob = await this.#createVideoBlob();

      if (videoBlob) {
        console.log('Processing recorded data - State: processing → complete');
        const videoFile = this.#createVideoFile(videoBlob);
        this.#eventBus.emit(new RecordVideoFileCreatedEvent(videoFile));
        this.#cleanup();
      } else {
        throw new Error('Failed to create video blob from recorded chunks');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.isRecording = false;
      this.#preview.cleanup();
      throw error;
    }
  }

  /**
   * Handle data available event from MediaRecorder
   */
  #handleDataAvailable(event: BlobEvent): void {
    if (!event.data || event.data.size < 1) {
      return;
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
    // Monitor memory usage and warn if getting high
    if (this.#currentMemoryUsage > this.#maxMemoryUsage * 0.8) {
      console.warn('Memory usage approaching limit:', this.#preview.formatBytes(this.#currentMemoryUsage));
    }
  }

  /**
   * Handle memory pressure by optimizing storage
   */
  #handleMemoryPressure(): void {
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
   */
  #getRecordingData(): RecordingData {
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
   */
  async #createVideoBlob(): Promise<Blob | null> {
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

    return await fixWebmDuration(videoBlob);
  }

  /**
   * Integrate recorded video into the studio's media system
   */
  #createVideoFile(videoBlob: Blob): File {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screen-recording-${timestamp}.webm`;

      console.log('Creating video file:', {
        filename,
        size: this.#preview.formatBytes(videoBlob.size),
        type: videoBlob.type
      });

      return  new File([videoBlob], filename, {type: videoBlob.type});
    } catch (error) {
      console.error('Error adding video to medias:', error);
      throw error;
    }
  }

  /**
   * Clean up recording resources but keep preview for playback
   */
  #cleanupRecordingResources(): void {
    this.isRecording = false;
    this.#resetMetadata();
    this.#recordingStartTime = null;

    if (this.#originalStreams) {
      if (this.#originalStreams.screen) {
        this.#originalStreams.screen.getTracks().forEach(track => {
          track.stop();
        });
      }
      if (this.#originalStreams.microphone) {
        this.#originalStreams.microphone.getTracks().forEach(track => {
          track.stop();
        });
      }
    }

    // Clean up Web Audio API resources
    if (this.#audioContext) {
      this.#audioContext.close().catch(err => {
        console.warn('Error closing audio context:', err);
      });
      this.#audioContext = null;
    }
    this.#audioDestination = null;

    this.#mediaRecorder = null;
    this.#mediaStream = null;
  }

  /**
   * Clean up all resources including preview
   */
  #cleanup(): void {
    this.#cleanupRecordingResources();
    this.#preview.cleanup();
    console.log('All resources and preview elements cleaned up');
  }

  #setupMediaRecorder(): void {
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

    const options: MediaRecorderOptions = {
      mimeType: selectedMimeType,
      videoBitsPerSecond: 8000000, // 8 Mbps
      audioBitsPerSecond: 128000   // 128 kbps
    };

    this.#mediaRecorder = new MediaRecorder(this.#mediaStream!, options);
    this.#mediaRecorder.ondataavailable = (event: BlobEvent) => this.#handleDataAvailable(event);
    this.#mediaRecorder.onstop = () => {
      console.log('MediaRecorder stopped');
      this.isRecording = false;
    };
  }

  /**
   * Combine screen video stream with microphone audio stream using Web Audio API
   * This properly mixes system audio and microphone audio into a single audio track
   */
  #combineStreams(screenStream: MediaStream, microphoneStream: MediaStream | null): MediaStream {
    const combinedStream = new MediaStream();

    // Add video tracks from screen stream
    screenStream.getVideoTracks().forEach(track => {
      combinedStream.addTrack(track);
    });

    const systemAudioTracks = screenStream.getAudioTracks();
    const hasSystemAudio = systemAudioTracks.length > 0;
    const hasMicrophoneAudio = microphoneStream && microphoneStream.getAudioTracks().length > 0;

    // If we have both system audio and microphone audio, mix them using Web Audio API
    if (hasSystemAudio && hasMicrophoneAudio) {
      console.log('Mixing system audio and microphone audio');
      const mixedAudioTrack = this.#mixAudioStreams(screenStream, microphoneStream!);
      combinedStream.addTrack(mixedAudioTrack);
    }
    // If we only have system audio
    else if (hasSystemAudio) {
      systemAudioTracks.forEach(track => {
        combinedStream.addTrack(track);
        console.log('Added system audio track to recording');
      });
    }
    // If we only have microphone audio
    else if (hasMicrophoneAudio) {
      microphoneStream!.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track);
        console.log('Added microphone audio track to recording');
      });
    } else {
      console.warn('No audio tracks available for recording');
    }

    // Store reference to original streams for cleanup
    this.#originalStreams = {
      screen: screenStream,
      microphone: microphoneStream
    };

    return combinedStream;
  }

  /**
   * Mix multiple audio streams into a single track using Web Audio API
   */
  #mixAudioStreams(systemAudioStream: MediaStream, microphoneStream: MediaStream): MediaStreamTrack {
    this.#audioContext = new AudioContext();
    const systemAudioSource = this.#audioContext.createMediaStreamSource(systemAudioStream);
    const microphoneSource = this.#audioContext.createMediaStreamSource(microphoneStream);
    this.#audioDestination = this.#audioContext.createMediaStreamDestination();

    // Connect both sources to the destination (this mixes them)
    systemAudioSource.connect(this.#audioDestination);
    microphoneSource.connect(this.#audioDestination);
    return this.#audioDestination.stream.getAudioTracks()[0];
  }

  #checkBrowserSupport(): void {
    const browserSupport = checkBrowserSupport() as BrowserSupportResult;
    if (!browserSupport.isSupported) {
      const error = new Error(`Camera recording is not supported: ${browserSupport.errors.join(', ')}`) as RecordingError;
      error.name = 'UnsupportedBrowserError';
      error.userMessage = `Camera recording is not supported in ${browserSupport.browserInfo.name}. Please use Chrome, Firefox, or Edge.`;
      error.supportDetails = browserSupport;
      throw error;
    }
  }
}
