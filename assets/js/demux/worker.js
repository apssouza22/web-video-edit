importScripts("demuxer-mp4.js", "render-2d.js");

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
   * @param {string} config.rendererName - Name of the renderer to use
   * @param {OffscreenCanvas} config.canvas - Canvas for rendering
   * @private
   */
  #start({dataUri, rendererName, canvas}) {
    if (this.#isInitialized) {
      console.warn("Worker already initialized, cleaning up previous instance");
      this.#cleanup();
    }

    this.#initializeRenderer(rendererName, canvas);
    this.#initializeDemuxer(dataUri);
    this.#isInitialized = true;
  }

  /**
   * Initializes the appropriate renderer based on the renderer name
   * @param {string} rendererName - Name of the renderer
   * @param {OffscreenCanvas} canvas - Canvas for rendering
   * @private
   */
  #initializeRenderer(rendererName, canvas) {
    switch (rendererName) {
      case "2d":
        console.log("Using 2D renderer");
        this.#renderer = new Canvas2DRenderer(canvas);
        break;
      default:
        throw new Error(`Unknown renderer: ${rendererName}`);
    }
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
   * @param {VideoFrame} frame - Decoded video frame
   * @private
   */
  #handleFrame(frame) {
    this.#setStatus("frame", frame)
    this.#scheduleFrameRender(frame);
  }

  /**
   * Handles decode errors
   * @param {Error} error - Decode error
   * @private
   */
  #handleError(error) {
    console.error("Decode error:", error);
    this.#setStatus("decode", error.message || error.toString());
  }

  /**
   * Schedules a frame for rendering in the next animation frame
   * @param {VideoFrame} frame - Frame to render
   * @private
   */
  #scheduleFrameRender(frame) {
    if (!this.#pendingFrame) {
      self.requestAnimationFrame(() => this.#renderAnimationFrame());
    } else {
      this.#pendingFrame.close();
    }
    
    this.#pendingFrame = frame;
  }

  /**
   * Renders the pending frame
   * @private
   */
  #renderAnimationFrame() {
    if (this.#pendingFrame && this.#renderer) {
      this.#renderer.draw(this.#pendingFrame);
      this.#pendingFrame = null;
    }
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
      self.postMessage({data: this.#pendingStatus});
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
