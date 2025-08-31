importScripts("demuxer-mp4.js", "frame-rate-controller.js");

/**
 * Enhanced worker class that handles video demuxing, decoding, and rendering with 24 FPS optimization
 * Integrates frame rate control and performance monitoring
 */
class DemuxWorker {
  #demuxer = null;
  /**
   * FrameRateController instance for managing output at 24 FPS
   * @type {FrameRateController}
   */
  #frameRateController = null;
  #targetFPS = 24;
  #isProcessing = false;
  #frameCount = 0;
  #startTime = 0;

  constructor() {
    this.#initializeComponents();
    this.#setupCleanupHandlers();
  }

  #initializeComponents() {
    this.#frameRateController = new FrameRateController(this.#targetFPS, (frame, metadata) => {
      this.#handleProcessedFrame(frame, metadata);
    });

  }

  /**
   * Setup cleanup handlers for worker termination
   * @private
   */
  #setupCleanupHandlers() {
    // Handle worker termination
    self.addEventListener('beforeunload', () => {
      this.#cleanup();
    });

    // Handle explicit cleanup messages
    self.addEventListener('message', (event) => {
      if (event.data.task === 'cleanup' || event.data.task === 'terminate') {
        this.#cleanup();
      }
    });

    // Handle uncaught errors that might require cleanup
    self.addEventListener('error', (event) => {
      console.error('Worker error, performing cleanup:', event.error);
      this.#cleanup();
    });
  }

  setupMessageHandlers() {
    self.addEventListener("message", (message) => {
      this.#start(message.data);
    });
  }

  /**
   * Initializes the demuxer and frame processing with the provided configuration
   * @param {Object} config - Configuration object
   * @private
   */
  #start({arrayBuffer}) {
    this.#isProcessing = true;
    this.#startTime = performance.now();
    this.#initializeDemuxer(arrayBuffer);
  }

  /**
   * Initializes the MP4 demuxer with enhanced callbacks
   * @param {string} fileBuffer - URI of the video data
   * @private
   */
  #initializeDemuxer(fileBuffer) {
    const demuxerCallbacks = {
      onFrame: (frame) => this.#frameRateController.processFrame(frame),
      onError: (error) => this.#handleError(error),
      onReady: (info) => {
        this.#handleDemuxerReady(info);
      }
    };

    this.#demuxer = new MP4Demuxer(demuxerCallbacks);
    this.#demuxer.start(fileBuffer);
  }

  /**
   * Handle demuxer ready event with enhanced initialization
   * @param {Object} info - Demuxer info
   * @private
   */
  #handleDemuxerReady(info) {
    if (info.videoTracks && info.videoTracks[0]) {
      const track = info.videoTracks[0];
      const sourceFPS = track.movie_timescale / track.movie_duration * track.duration || 30;
      this.#frameRateController.setSourceFrameRate(sourceFPS);
      console.log(`Source FPS detected: ${sourceFPS}, Target FPS: ${this.#targetFPS}`);
    }
    self.postMessage({"type": "start_processing", "data": info});
  }

  /**
   * Handle processed frames from frame rate controller
   * @param {VideoFrame} frame - Processed frame at 24 FPS
   * @param {Object} metadata - Frame metadata
   * @private
   */
  #handleProcessedFrame(frame, metadata) {
    this.#frameCount++;
    self.postMessage({
      "type": "frame_processed",
      "data": {
        frameIndex: this.#frameCount,
        timestamp: frame.timestamp,
        frame: frame
      }
    });
  }

  /**
   * Handle errors with enhanced reporting
   * @param {Error} error - Error object
   * @private
   */
  #handleError(error) {
    console.error("Enhanced worker error:", error);
  }

  /**
   * Comprehensive cleanup of all resources
   * @private
   */
  #cleanup() {
    console.log('DemuxWorker: Starting comprehensive cleanup...');

    try {
      // Cleanup frame rate controller
      if (this.#frameRateController) {
        this.#frameRateController.flush(); // Output any remaining frames
        this.#frameRateController.completeCleanup();
      }

      this.#demuxer.close();
      this.#frameCount = 0;
      this.#startTime = 0;

      console.log('DemuxWorker: Cleanup completed successfully');

    } catch (error) {
      console.error('Error during worker cleanup:', error);
    }
  }

  /**
   * Public cleanup method that can be called externally
   */
  cleanup() {
    this.#cleanup();
  }
}

const worker = new DemuxWorker();
worker.setupMessageHandlers();
