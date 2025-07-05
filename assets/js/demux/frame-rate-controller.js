/**
 * FrameRateController - Manages frame rate conversion and intelligent frame sampling
 * Converts any input frame rate to exactly 24 FPS output with optimal quality
 */
class FrameRateController {
  #targetFPS = 24;
  #targetFrameInterval = 1000000 / 24; // 41666.67 microseconds per frame at 24 FPS
  #lastOutputTimestamp = 0;
  #frameBuffer = [];
  #maxBufferSize = 10;
  #sourceFrameRate = null;
  #totalFramesProcessed = 0;
  #totalFramesOutput = 0;
  #onFrameCallback = (frame, metadata) => {
  };

  constructor(targetFPS = 24, onFrameCallback = null) {
    this.#targetFPS = targetFPS;
    this.#targetFrameInterval = 1000000 / targetFPS;
    this.#onFrameCallback = onFrameCallback;
  }

  /**
   * Set the source frame rate for optimization
   * @param {number} fps - Source video frame rate
   */
  setSourceFrameRate(fps) {
    this.#sourceFrameRate = fps;
  }

  /**
   * Process an incoming frame and determine if it should be output
   * @param {VideoFrame} frame - Input video frame
   * @param {Object} metadata - Frame metadata including quality info
   */
  processFrame(frame, metadata = {}) {
    this.#totalFramesProcessed++;

    const frameTimestamp = frame.timestamp;
    const expectedOutputTime = this.#lastOutputTimestamp + this.#targetFrameInterval;

    // Add frame to buffer with metadata
    this.#addToBuffer({
      frame,
      timestamp: frameTimestamp,
      metadata,
      quality: metadata.quality || 1.0
    });

    // Check if it's time to output a frame considering 24 FPS
    if (frameTimestamp >= expectedOutputTime || this.#frameBuffer.length >= this.#maxBufferSize) {
      this.#outputBestFrame();
    }
  }

  /**
   * Add frame to buffer with intelligent overflow management
   * @param {Object} frameData - Frame data with metadata
   * @private
   */
  #addToBuffer(frameData) {
    frameData.addedAt = performance.now();
    this.#frameBuffer.push(frameData);
  }

  /**
   * Select and output the best frame from the buffer
   * @private
   */
  #outputBestFrame() {
    if (this.#frameBuffer.length === 0) {
      return;
    }

    const targetTime = this.#lastOutputTimestamp + this.#targetFrameInterval;
    let bestFrame = null;
    let bestScore = -1;
    let bestIndex = -1;

    // Find the best frame based on timestamp proximity and quality
    for (let i = 0; i < this.#frameBuffer.length; i++) {
      const frameData = this.#frameBuffer[i];
      const score = this.#calculateFrameScore(frameData, targetTime);

      if (score > bestScore) {
        bestScore = score;
        bestFrame = frameData;
        bestIndex = i;
      }
    }

    if (!bestFrame) {
      return;
    }
    bestFrame.inUse = true;
    this.#outputFrame(bestFrame);

    // Remove frames that are older than the selected frame
    for (let i = 0; i <= bestIndex; i++) {
      const frameData = this.#frameBuffer.shift();
      // Only close frames that weren't selected and aren't in use
      if (i !== bestIndex && frameData.frame && typeof frameData.frame.close === 'function') {
        frameData.frame.close();
      }
    }
  }

  /**
   * Calculate a score for frame selection based on timestamp and quality
   * @param {Object} frameData - Frame data with metadata
   * @param {number} targetTime - Target timestamp for output
   * @returns {number} Frame selection score (higher is better)
   * @private
   */
  #calculateFrameScore(frameData, targetTime) {
    const timeDiff = Math.abs(frameData.timestamp - targetTime);
    const maxTimeDiff = this.#targetFrameInterval;

    // Normalize time score (closer to target time = higher score)
    const timeScore = Math.max(0, 1 - (timeDiff / maxTimeDiff));

    // Quality score (higher quality = higher score)
    const qualityScore = frameData.quality || 1.0;

    // Weighted combination: 70% time accuracy, 30% quality
    return (timeScore * 0.7) + (qualityScore * 0.3);
  }

  /**
   * Output a frame with proper timestamp adjustment
   * @param {Object} frameData - Frame data to output
   * @private
   */
  #outputFrame(frameData) {
    const outputTimestamp = this.#lastOutputTimestamp + this.#targetFrameInterval;

    const adjustedFrame = new VideoFrame(frameData.frame, {
      timestamp: outputTimestamp
    });
    this.#lastOutputTimestamp = outputTimestamp;
    this.#totalFramesOutput++;

    this.#onFrameCallback(adjustedFrame, {
      ...frameData.metadata,
      originalTimestamp: frameData.timestamp,
      adjustedTimestamp: outputTimestamp,
      frameIndex: this.#totalFramesOutput - 1
    });

    if (frameData.frame && typeof frameData.frame.close === 'function') {
      frameData.frame.close();
    }
  }

  /**
   * Flush any remaining frames in the buffer
   */
  flush() {
    while (this.#frameBuffer.length > 0) {
      this.#outputBestFrame();
    }
  }


  /**
   * Complete cleanup - closes all frames for shutdown
   */
  completeCleanup() {
    this.#frameBuffer.forEach(frameData => {
      frameData.frame.close();
    });

    // Clear all state
    this.#frameBuffer = [];
    this.#lastOutputTimestamp = 0;
    this.#totalFramesProcessed = 0;
    this.#totalFramesOutput = 0;
  }
}
