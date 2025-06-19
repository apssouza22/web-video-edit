importScripts("demuxer-mp4.js", "render-2d.js", "render-webgl.js", "render-webgpu.js");

/**
 * Main worker class that handles video demuxing, decoding, and rendering
 * Encapsulates all state and provides a clean interface for worker operations
 */
class DemuxWorker {
  #renderer = null;
  #demuxer = null;
  #pendingFrame = null;
  #pendingStatus = null;
  #isInitialized = false;

  constructor() {
    console.log("Demuxer worker started");
  }

  /**
   * Sets up message event listeners for the worker
   * @private
   */
  setupMessageHandlers() {
    self.addEventListener("message", (message) => {
      this.#handleMessage(message.data);
    });

    self.addEventListener("beforeunload", () => {
      this.#cleanup();
    });
  }

  /**
   * Handles incoming messages from the main thread
   * @param {Object} data - Message data
   * @private
   */
  #handleMessage(data) {
    try {
      switch (data.task) {
        case "start":
          this.#start(data);
          break;
        case "cleanup":
          this.#cleanup();
          break;
        default:
          console.warn(`Unknown task: ${data.task}`);
      }
    } catch (error) {
      console.error("Error handling message:", error);
      this.#setStatus("error", error.message);
    }
  }

  /**
   * Initializes the demuxer and renderer with the provided configuration
   * @param {Object} config - Configuration object
   * @param {string} config.dataUri - URI of the video data
   * @private
   */
  #start({dataUri}) {
    if (this.#isInitialized) {
      console.warn("Worker already initialized, cleaning up previous instance");
      this.#cleanup();
    }

    this.#initializeDemuxer(dataUri);
    this.#isInitialized = true;
  }

  /**
   * Initializes the MP4 demuxer with appropriate callbacks
   * @param {string} dataUri - URI of the video data
   * @private
   */
  #initializeDemuxer(dataUri) {
    const demuxerCallbacks = {
      onFrame: (frame) => this.#handleFrame(frame),
      onError: (error) => this.#handleError(error),
      setStatus: (type, message) => this.#setStatus(type, message)
    };

    this.#demuxer = new MP4Demuxer(dataUri, demuxerCallbacks);
  }

  /**
   * Handles decoded video frames for rendering
   * @param {Object} frameData - Frame data with metadata
   * @param {VideoFrame} frameData.frame - Decoded video frame
   * @param {number} frameData.frameNumber - Current frame number
   * @param {number} frameData.totalFrames - Total expected frames
   * @param {boolean} frameData.isLastFrame - Whether this is the last frame
   * @private
   */
  #handleFrame(frameData) {
    // Pass the entire frame data object to the main thread
    self.postMessage({["onFrame"]: frameData});
  }

  /**
   * Handles decode errors
   * @param {Error} error - Decode error
   * @private
   */
  #handleError(error) {
    console.error("Decode error:", error);
    this.#setStatus("onError", error.message || error.toString());
  }

  /**
   * Sets status information and batches updates per animation frame
   * @param {string} type - Status type
   * @param {string} message - Status message
   * @private
   */
  #setStatus(type, message) {
    if (this.#pendingStatus) {
      this.#pendingStatus[type] = message;
    } else {
      this.#pendingStatus = {[type]: message};
      self.requestAnimationFrame(() => this.#statusAnimationFrame());
    }
  }

  /**
   * Sends batched status updates to the main thread
   * @private
   */
  #statusAnimationFrame() {
    if (this.#pendingStatus) {
      self.postMessage(this.#pendingStatus);
      this.#pendingStatus = null;
    }
  }

  /**
   * Cleans up all resources and resets the worker state
   * @private
   */
  #cleanup() {
    if (this.#demuxer) {
      this.#demuxer.close();
      this.#demuxer = null;
    }

    if (this.#pendingFrame) {
      this.#pendingFrame.close();
      this.#pendingFrame = null;
    }

    this.#renderer = null;
    this.#pendingStatus = null;
    this.#isInitialized = false;

    console.log("Worker cleanup completed");
  }
}

const worker = new DemuxWorker();
worker.setupMessageHandlers();
