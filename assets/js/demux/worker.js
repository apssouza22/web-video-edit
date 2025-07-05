importScripts("demuxer-mp4.js", "render-2d.js");


/**
 * Main worker class that handles video demuxing, decoding, and rendering
 * Encapsulates all state and provides a clean interface for worker operations
 */
class DemuxWorker {
  #demuxer = null;
  #frameBuffer = [];
  #frameIndex = 0;

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
  }

  /**
   * Handles incoming messages from the main thread
   * @param {Object} data - Message data
   * @private
   */
  #handleMessage(data) {
    try {
      this.#start(data);
    } catch (error) {
      console.error("Error handling message:", error);
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
  #start({arrayBuffer, dataUri, rendererName, canvas}) {
    dataUri = dataUri || arrayBuffer;
    this.#initializeDemuxer(dataUri);
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
      onReady: (info) => {
        self.postMessage({"onReady": info});
      }
    };

    this.#demuxer = new MP4Demuxer(dataUri, demuxerCallbacks);
  }

  #handleFrame(frame) {
    // self.postMessage({"onFrame": {frame, timestamp: frame.timestamp / 1e6}});
  }

  #handleError(error) {
    console.error("Decode error:", error);
  }
}

const worker = new DemuxWorker();
worker.setupMessageHandlers();
