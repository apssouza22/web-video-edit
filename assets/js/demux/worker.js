importScripts("demuxer-mp4.js", "render-2d.js");

const TARGET_FPS = 24;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

/**
 * Main worker class that handles video demuxing, decoding, and rendering
 * Encapsulates all state and provides a clean interface for worker operations
 */
class DemuxWorker {
  /**
   * @type {Canvas2DRenderer}
   */
  #renderer = null
  #demuxer = null;
  #pendingFrame = null;
  #pendingStatus = null;
  #isInitialized = false;
  
  // 24 FPS rendering system
  #frameBuffer = [];
  #renderStartTime = null;
  #frameIndex = 0;
  #renderingActive = false;
  #renderAnimationId = null;
  #lastRenderTime = 0;
  #droppedFrames = 0;
  #renderedFrames = 0;

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
    this.#startFrameRendering();
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
      setStatus: (type, message) => this.#setStatus(type, message),
      onReady: (info) => {
        console.log("Demuxer ready:", info);
      }
    };

    this.#demuxer = new MP4Demuxer(dataUri, demuxerCallbacks);
  }

  /**
   * Handles decoded video frames for buffering and 24 FPS rendering
   * @param {VideoFrame} frame - Decoded video frame
   * @private
   */
  #handleFrame(frame) {
    console.log(`Received frame ${this.#frameIndex++} at ${frame.timestamp / 1e6} ms`);
    this.#frameBuffer.push({
      frame: frame,
      timestamp: frame.timestamp,
      bufferedAt: performance.now()
    });
    this.#renderer.draw(frame);
    const imageData = this.#renderer.getImageData(0, 0);
    self.postMessage({imageData});
    self.postMessage({"onFrame": {imageData, timestamp: frame.timestamp / 1e6}});
  }

  /**
   * Starts the 24 FPS frame rendering loop
   * @private
   */
  #startFrameRendering() {
    if (this.#renderingActive) return;
    
    this.#renderingActive = true;
    this.#renderStartTime = null;
    this.#lastRenderTime = 0;
    this.#scheduleNextFrame();
  }

  /**
   * Schedules the next frame for 24 FPS rendering
   * @private
   */
  #scheduleNextFrame() {
    if (!this.#renderingActive) return;

    this.#renderAnimationId = self.requestAnimationFrame((currentTime) => {
      this.#renderFrameAt24FPS(currentTime);
    });
  }

  /**
   * Renders frames at precise 24 FPS intervals
   * @param {number} currentTime - Current timestamp from requestAnimationFrame
   * @private
   */
  #renderFrameAt24FPS(currentTime) {
    if (!this.#renderingActive || !this.#renderer) return;

    // Initialize start time on first frame
    if (this.#renderStartTime === null) {
      this.#renderStartTime = currentTime;
      this.#lastRenderTime = currentTime;
    }


    // Only render if enough time has passed for 24 FPS
    const timeSinceLastRender = currentTime - this.#lastRenderTime;
    if (timeSinceLastRender >= FRAME_INTERVAL_MS) {
      const frameToRender = this.#selectFrameForRendering(currentTime);

      if (frameToRender) {
        // this.#renderer.draw(frameToRender.frame);
        this.#renderedFrames++;
        this.#lastRenderTime = currentTime;

        // Update render statistics
        const totalElapsed = (currentTime - this.#renderStartTime) / 1000;
        const actualFPS = this.#renderedFrames / totalElapsed;
        // console.log(`${actualFPS.toFixed(1)} fps (target: ${TARGET_FPS})`)
        // console.log(`Rendered frames: ${this.#renderedFrames}`, "total frames:", this.#frameBuffer.length, "dropped frames:", this.#droppedFrames);
      }
    }

    this.#scheduleNextFrame();
  }

  /**
   * Selects the most appropriate frame for rendering at current time
   * @param {number} currentTime - Current timestamp
   * @returns {Object|null} Frame object to render
   * @private
   */
  #selectFrameForRendering(currentTime) {
    if (this.#frameBuffer.length === 0) return null;

    // Calculate target timestamp for current render time
    const elapsedTime = currentTime - this.#renderStartTime;
    const targetTimestamp = elapsedTime * 1000; // Convert to microseconds

    // Find the frame closest to our target timestamp
    let bestFrame = null;
    let bestIndex = -1;
    let smallestDiff = Infinity;

    for (let i = 0; i < this.#frameBuffer.length; i++) {
      const frame = this.#frameBuffer[i];
      const timeDiff = Math.abs(frame.timestamp - targetTimestamp);
      
      if (timeDiff < smallestDiff) {
        smallestDiff = timeDiff;
        bestFrame = frame;
        bestIndex = i;
      }
    }

    if (bestFrame && bestIndex >= 0) {
      this.#frameBuffer.splice(bestIndex, 1);
      this.#cleanupOldFrames(targetTimestamp);
    }

    return bestFrame;
  }

  /**
   * Cleans up frames that are too old to be useful
   * @param {number} currentTimestamp - Current target timestamp
   * @private
   */
  #cleanupOldFrames(currentTimestamp) {
    const maxAge = FRAME_INTERVAL_MS * 2 * 1000; // 2 frame intervals in microseconds
    
    for (let i = this.#frameBuffer.length - 1; i >= 0; i--) {
      const frame = this.#frameBuffer[i];
      if (currentTimestamp - frame.timestamp > maxAge) {
        frame.frame.close();
        this.#frameBuffer.splice(i, 1);
        this.#droppedFrames++;
      }
    }
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
    this.#stopFrameRendering();
    
    // Clean up demuxer
    if (this.#demuxer) {
      this.#demuxer.close();
      this.#demuxer = null;
    }
    
    // Clean up pending frame
    if (this.#pendingFrame) {
      this.#pendingFrame.close();
      this.#pendingFrame = null;
    }

    this.#clearFrameBuffer();
    this.#renderer = null;
    this.#pendingStatus = null;
    this.#isInitialized = false;
    
    console.log("Worker cleanup completed");
  }

  /**
   * Stops the 24 FPS frame rendering loop
   * @private
   */
  #stopFrameRendering() {
    this.#renderingActive = false;
    
    if (this.#renderAnimationId) {
      self.cancelAnimationFrame(this.#renderAnimationId);
      this.#renderAnimationId = null;
    }
    
    // Log final statistics
    if (this.#renderedFrames > 0) {
      console.log(`24 FPS Rendering Statistics:
        - Rendered frames: ${this.#renderedFrames}
        - Dropped frames: ${this.#droppedFrames}
        - Buffer efficiency: ${((this.#renderedFrames / (this.#renderedFrames + this.#droppedFrames)) * 100).toFixed(1)}%`);
    }
  }

  /**
   * Clears the frame buffer and closes all frames
   * @private
   */
  #clearFrameBuffer() {
    for (const bufferedFrame of this.#frameBuffer) {
      if (bufferedFrame && bufferedFrame.frame) {
        bufferedFrame.frame.close();
      }
    }
    this.#frameBuffer = [];
    
    // Reset counters
    this.#renderStartTime = null;
    this.#frameIndex = 0;
    this.#lastRenderTime = 0;
    this.#droppedFrames = 0;
    this.#renderedFrames = 0;
  }
}

const worker = new DemuxWorker();
worker.setupMessageHandlers();
