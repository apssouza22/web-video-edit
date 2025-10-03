import {Canvas2DRender} from "../../common/render-2d.js";

export class CodecDemuxer {
  #worker = null;
  #isProcessing = false;
  #cleanupHandlers = [];
  #frames = [];
  /** @type {Canvas2DRender} */
  #renderer;

  constructor() {
    this.onCompleteCallback = () => {
    };
    this.onMetadataCallback = (info) => {
    };
    this.#setupCleanupHandlers();
  }

  /**
   * Setup cleanup handlers for page unload
   * @private
   */
  #setupCleanupHandlers() {
    const cleanupHandler = () => {
      this.cleanup();
    };

    window.addEventListener('beforeunload', cleanupHandler);
    window.addEventListener('unload', cleanupHandler);

    // Store handlers for later removal
    this.#cleanupHandlers.push(
        () => window.removeEventListener('beforeunload', cleanupHandler),
        () => window.removeEventListener('unload', cleanupHandler)
    );
  }

  setOnProgressCallback(callback) {
    this.onProgressCallback = callback;
  }

  setOnCompleteCallback(callback) {
    this.onCompleteCallback = callback;
  }

  setOnMetadataCallback(callback) {
    this.onMetadataCallback = callback;
  }

  /**
   * Handle messages from worker
   * @param {MessageEvent} message - Worker message
   * @private
   */
  #handleWorkerMessage(message) {
    const data = message.data

    if (data["type"] === "frame_processed") {
      this.#frames.push(data.data.frame);
      const currentTimeMs = data.data.timestamp / 1000; // Convert microseconds to milliseconds
      const progress = this.totalTimeInMilSeconds > 0 ? Math.min(100, (currentTimeMs / this.totalTimeInMilSeconds) * 100) : 0;
      this.onProgressCallback(progress);

      if (progress >= 99) {
        this.onCompleteCallback(this.#frames);
      }
    }

    if (data["type"] === "start_processing") {
      console.log("Frame info:", data.data);
      let width = data.data.videoTracks[0].video.width;
      let height = data.data.videoTracks[0].video.height;

      // Duration from MP4Box is typically in milliseconds
      this.totalTimeInMilSeconds = data.data.duration;
      console.log("Video dimensions:", width, "x", height,
          "Duration:", (this.totalTimeInMilSeconds / 1000 / 60).toFixed(2), "minutes");

      this.onMetadataCallback({
        width: width,
        height: height,
        totalTimeInMilSeconds: this.totalTimeInMilSeconds,
        duration: this.totalTimeInMilSeconds / 1000 // Also provide duration in seconds
      });
    }
  }

  /**
   * Initialize codec demuxing with worker
   * @param {File} file - Video file to process
   * @param {Canvas2DRender} renderer - Renderer object
   */
  async initialize(file, renderer) {
    this.#isProcessing = true;
    this.#renderer = renderer;
    this.#frames = [];

    // Create worker if not exists
    if (!this.#worker) {
      this.#worker = new Worker(new URL("./worker.js", import.meta.url));
      this.#worker.addEventListener("message", this.#handleWorkerMessage.bind(this));

      // Handle worker errors
      this.#worker.addEventListener('error', (error) => {
        console.error('Worker error:', error);
        this.cleanup();
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    arrayBuffer.fileStart = 0;
    this.#worker.postMessage({
      task: "start",
      arrayBuffer: arrayBuffer,
      canvas: renderer.transferableCanvas
    }, [renderer.transferableCanvas]);
  }

  /**
   * Comprehensive cleanup of all resources
   */
  cleanup() {
    try {
      this.#isProcessing = false;
      if (this.#frames && this.#frames.length > 0) {
        let closedFrames = 0;
        this.#frames.forEach((frameData, index) => {
          try {
            if (frameData && frameData.frame && typeof frameData.frame.close === 'function') {
              frameData.frame.close();
              closedFrames++;
            }
          } catch (error) {
            console.debug(`Frame ${index} already closed:`, error.message);
          }
        });
        this.#frames = [];
      }

      if (this.#worker) {
        this.#worker.postMessage({task: 'cleanup'});
        // Give worker time to cleanup, then terminate
        setTimeout(() => {
          if (this.#worker) {
            this.#worker.terminate();
            this.#worker = null;
          }
        }, 1000);
      }

      this.#cleanupHandlers.forEach(handler => handler());
      this.#cleanupHandlers = [];

    } catch (error) {
      console.error('Error during CodecDemuxer cleanup:', error);
    }
  }
}