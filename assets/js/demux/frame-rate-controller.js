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
  #onFrameCallback = null;
  #qualityThreshold = 0.8; // Prefer frames with quality >= 80%

  constructor(targetFPS = 24, onFrameCallback = null) {
    this.#targetFPS = targetFPS;
    this.#targetFrameInterval = 1000000 / targetFPS;
    this.#onFrameCallback = onFrameCallback;
  }

  /**
   * Set the callback function for processed frames
   * @param {Function} callback - Function to call with processed frames
   */
  setOnFrameCallback(callback) {
    this.#onFrameCallback = callback;
  }

  /**
   * Set the source frame rate for optimization
   * @param {number} fps - Source video frame rate
   */
  setSourceFrameRate(fps) {
    this.#sourceFrameRate = fps;
    console.log(`FrameRateController: Source FPS set to ${fps}, target FPS: ${this.#targetFPS}`);
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

    // Check if it's time to output a frame
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
    // Mark frame as in use to prevent premature cleanup
    frameData.inUse = true;
    frameData.addedAt = performance.now();
    
    this.#frameBuffer.push(frameData);

    // Remove oldest frames if buffer is full, but only if they're not in use
    while (this.#frameBuffer.length > this.#maxBufferSize) {
      const oldestFrame = this.#frameBuffer[0];
      
      // Don't remove frames that are still in use or very recent
      const frameAge = performance.now() - oldestFrame.addedAt;
      if (oldestFrame.inUse || frameAge < 100) { // Keep frames for at least 100ms
        break;
      }
      
      const removedFrame = this.#frameBuffer.shift();
      // Close the removed frame to free memory
      if (removedFrame.frame && typeof removedFrame.frame.close === 'function') {
        removedFrame.frame.close();
      }
    }
  }

  /**
   * Select and output the best frame from the buffer
   * @private
   */
  #outputBestFrame() {
    if (this.#frameBuffer.length === 0) return;

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

    if (bestFrame) {
      // Mark the selected frame as ready for output
      bestFrame.inUse = true;
      
      // Output the best frame
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
    
    try {
      // Check if the frame is still valid before creating a new one
      if (!frameData.frame || frameData.frame.format === null) {
        console.warn('Attempting to output an invalid or closed frame');
        return;
      }
      
      // Create a new frame with adjusted timestamp for consistent 24 FPS
      const adjustedFrame = new VideoFrame(frameData.frame, {
        timestamp: outputTimestamp
      });

      // Update tracking
      this.#lastOutputTimestamp = outputTimestamp;
      this.#totalFramesOutput++;

      // Call the callback with the processed frame
      if (this.#onFrameCallback) {
        this.#onFrameCallback(adjustedFrame, {
          ...frameData.metadata,
          originalTimestamp: frameData.timestamp,
          adjustedTimestamp: outputTimestamp,
          frameIndex: this.#totalFramesOutput - 1
        });
      }

      // Now it's safe to close the original frame
      if (frameData.frame && typeof frameData.frame.close === 'function') {
        frameData.frame.close();
      }
      
    } catch (error) {
      console.error('Error creating adjusted VideoFrame:', error);
      // If we can't create a new frame, try to output the original
      if (frameData.frame && typeof frameData.frame.close !== 'function') {
        if (this.#onFrameCallback) {
          this.#onFrameCallback(frameData.frame, {
            ...frameData.metadata,
            originalTimestamp: frameData.timestamp,
            adjustedTimestamp: outputTimestamp,
            frameIndex: this.#totalFramesOutput - 1,
            error: 'Could not adjust timestamp'
          });
        }
      }
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
   * Get processing statistics
   * @returns {Object} Processing statistics
   */
  getStats() {
    const compressionRatio = this.#totalFramesProcessed > 0 
      ? this.#totalFramesOutput / this.#totalFramesProcessed 
      : 0;

    return {
      totalFramesProcessed: this.#totalFramesProcessed,
      totalFramesOutput: this.#totalFramesOutput,
      compressionRatio: compressionRatio.toFixed(3),
      targetFPS: this.#targetFPS,
      sourceFrameRate: this.#sourceFrameRate,
      bufferSize: this.#frameBuffer.length
    };
  }

  /**
   * Reset the controller state
   */
  reset() {
    // Close all buffered frames
    this.#frameBuffer.forEach(frameData => {
      if (frameData.frame && typeof frameData.frame.close === 'function') {
        try {
          if (frameData.frame.format !== null) {
            frameData.frame.close();
          }
        } catch (error) {
          console.debug('Frame already closed during reset:', error.message);
        }
      }
    });

    this.#frameBuffer = [];
    this.#lastOutputTimestamp = 0;
    this.#totalFramesProcessed = 0;
    this.#totalFramesOutput = 0;
  }

  /**
   * Complete cleanup - closes all frames for shutdown
   */
  completeCleanup() {
    console.log('FrameRateController: Performing complete cleanup');
    
    let closedFrames = 0;
    
    // Close all buffered frames
    this.#frameBuffer.forEach(frameData => {
      if (frameData.frame && typeof frameData.frame.close === 'function') {
        try {
          if (frameData.frame.format !== null) {
            frameData.frame.close();
            closedFrames++;
          }
        } catch (error) {
          console.debug('Frame already closed during complete cleanup:', error.message);
        }
      }
    });

    // Clear all state
    this.#frameBuffer = [];
    this.#lastOutputTimestamp = 0;
    this.#totalFramesProcessed = 0;
    this.#totalFramesOutput = 0;
    
    console.log(`FrameRateController: Complete cleanup finished - closed ${closedFrames} buffered frames`);
  }

  /**
   * Update target FPS (useful for dynamic frame rate adjustment)
   * @param {number} fps - New target frame rate
   */
  setTargetFPS(fps) {
    this.#targetFPS = fps;
    this.#targetFrameInterval = 1000000 / fps;
    console.log(`FrameRateController: Target FPS updated to ${fps}`);
  }
}

// Make the class available globally for worker
globalThis.FrameRateController = FrameRateController;
