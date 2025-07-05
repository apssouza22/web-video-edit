/**
 * TimestampCalculator - Precise timestamp calculations for frame rate conversion
 * Handles timestamp normalization, frame interval calculations, and sync management
 */
class TimestampCalculator {
  #targetFPS = 24;
  #targetFrameInterval = 1000000 / 24; // Microseconds per frame
  #baseTimestamp = 0;
  #frameCount = 0;
  #sourceFrameRate = null;
  #timestampOffset = 0;
  #driftCorrection = 0;
  #maxDrift = 5000; // 5ms max drift before correction

  constructor(targetFPS = 24) {
    this.#targetFPS = targetFPS;
    this.#targetFrameInterval = 1000000 / targetFPS;
  }

  /**
   * Set the source frame rate for optimization
   * @param {number} fps - Source video frame rate
   */
  setSourceFrameRate(fps) {
    this.#sourceFrameRate = fps;
    console.log(`TimestampCalculator: Source FPS set to ${fps}, target FPS: ${this.#targetFPS}`);
  }

  /**
   * Initialize the calculator with the first frame timestamp
   * @param {number} firstTimestamp - First frame timestamp in microseconds
   */
  initialize(firstTimestamp) {
    this.#baseTimestamp = firstTimestamp;
    this.#frameCount = 0;
    this.#timestampOffset = 0;
    this.#driftCorrection = 0;
    console.log(`TimestampCalculator: Initialized with base timestamp ${firstTimestamp}`);
  }

  /**
   * Calculate the ideal timestamp for the next output frame
   * @returns {number} Ideal timestamp in microseconds
   */
  getNextIdealTimestamp() {
    return this.#baseTimestamp + (this.#frameCount * this.#targetFrameInterval) + this.#driftCorrection;
  }

  /**
   * Calculate the timestamp for a specific frame index
   * @param {number} frameIndex - Frame index (0-based)
   * @returns {number} Timestamp in microseconds
   */
  getTimestampForFrame(frameIndex) {
    return this.#baseTimestamp + (frameIndex * this.#targetFrameInterval) + this.#driftCorrection;
  }

  /**
   * Advance to the next frame and return its timestamp
   * @returns {number} Next frame timestamp in microseconds
   */
  advanceFrame() {
    const timestamp = this.getNextIdealTimestamp();
    this.#frameCount++;
    return timestamp;
  }

  /**
   * Calculate the best timestamp for a frame given source constraints
   * @param {number} sourceTimestamp - Original frame timestamp
   * @param {number} sourceDuration - Original frame duration (optional)
   * @returns {Object} Calculated timestamp info
   */
  calculateOptimalTimestamp(sourceTimestamp, sourceDuration = null) {
    const idealTimestamp = this.getNextIdealTimestamp();
    const timeDifference = sourceTimestamp - idealTimestamp;
    
    // Calculate drift and determine if correction is needed
    const currentDrift = Math.abs(timeDifference);
    const needsCorrection = currentDrift > this.#maxDrift;

    let adjustedTimestamp = idealTimestamp;
    let correctionApplied = 0;

    if (needsCorrection) {
      // Apply gradual drift correction to avoid sudden jumps
      const maxCorrection = this.#targetFrameInterval * 0.1; // Max 10% of frame interval
      correctionApplied = Math.sign(timeDifference) * Math.min(Math.abs(timeDifference), maxCorrection);
      this.#driftCorrection += correctionApplied;
      adjustedTimestamp = idealTimestamp + correctionApplied;
    }

    return {
      originalTimestamp: sourceTimestamp,
      idealTimestamp: idealTimestamp,
      adjustedTimestamp: adjustedTimestamp,
      timeDifference: timeDifference,
      driftCorrection: correctionApplied,
      totalDrift: this.#driftCorrection,
      frameIndex: this.#frameCount,
      needsCorrection: needsCorrection
    };
  }

  /**
   * Determine if a source frame should be included based on timestamp
   * @param {number} sourceTimestamp - Source frame timestamp
   * @param {number} lastOutputTimestamp - Last output frame timestamp
   * @returns {Object} Frame selection decision
   */
  shouldIncludeFrame(sourceTimestamp, lastOutputTimestamp = null) {
    const nextIdealTime = this.getNextIdealTimestamp();
    const timeSinceLastOutput = lastOutputTimestamp ? sourceTimestamp - lastOutputTimestamp : Infinity;
    const timeToNextIdeal = Math.abs(sourceTimestamp - nextIdealTime);
    
    // Decision factors
    const isCloserToIdeal = timeToNextIdeal < (this.#targetFrameInterval * 0.5);
    const hasBeenLongEnough = timeSinceLastOutput >= (this.#targetFrameInterval * 0.8);
    const isWithinWindow = timeToNextIdeal < (this.#targetFrameInterval * 1.2);

    const shouldInclude = isCloserToIdeal && hasBeenLongEnough && isWithinWindow;

    return {
      shouldInclude: shouldInclude,
      timeToIdeal: timeToNextIdeal,
      timeSinceLastOutput: timeSinceLastOutput,
      nextIdealTime: nextIdealTime,
      reasons: {
        closerToIdeal: isCloserToIdeal,
        longEnoughSinceLastOutput: hasBeenLongEnough,
        withinTimeWindow: isWithinWindow
      }
    };
  }

  /**
   * Convert timestamp from one frame rate to another
   * @param {number} timestamp - Original timestamp
   * @param {number} sourceFPS - Source frame rate
   * @param {number} targetFPS - Target frame rate
   * @returns {number} Converted timestamp
   */
  static convertTimestamp(timestamp, sourceFPS, targetFPS) {
    if (sourceFPS === targetFPS) return timestamp;
    
    const sourceInterval = 1000000 / sourceFPS;
    const targetInterval = 1000000 / targetFPS;
    const frameNumber = Math.round(timestamp / sourceInterval);
    
    return frameNumber * targetInterval;
  }

  /**
   * Calculate frame rate from a series of timestamps
   * @param {Array<number>} timestamps - Array of timestamps in microseconds
   * @returns {number} Calculated frame rate
   */
  static calculateFrameRate(timestamps) {
    if (timestamps.length < 2) return 0;
    
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    
    // Calculate average interval
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    // Convert to FPS
    return 1000000 / avgInterval;
  }

  /**
   * Normalize timestamps to start from zero
   * @param {Array<number>} timestamps - Array of timestamps
   * @returns {Array<number>} Normalized timestamps
   */
  static normalizeTimestamps(timestamps) {
    if (timestamps.length === 0) return [];
    
    const baseTime = timestamps[0];
    return timestamps.map(ts => ts - baseTime);
  }

  /**
   * Generate ideal timestamps for a given duration and frame rate
   * @param {number} durationMs - Duration in milliseconds
   * @param {number} fps - Frame rate
   * @param {number} startTime - Start timestamp (default: 0)
   * @returns {Array<number>} Array of ideal timestamps
   */
  static generateIdealTimestamps(durationMs, fps, startTime = 0) {
    const frameInterval = 1000000 / fps; // Convert to microseconds
    const totalFrames = Math.ceil((durationMs * 1000) / frameInterval);
    const timestamps = [];
    
    for (let i = 0; i < totalFrames; i++) {
      timestamps.push(startTime + (i * frameInterval));
    }
    
    return timestamps;
  }

  /**
   * Get current calculator statistics
   * @returns {Object} Calculator statistics
   */
  getStats() {
    return {
      targetFPS: this.#targetFPS,
      targetFrameInterval: this.#targetFrameInterval,
      sourceFrameRate: this.#sourceFrameRate,
      frameCount: this.#frameCount,
      baseTimestamp: this.#baseTimestamp,
      currentDrift: this.#driftCorrection,
      nextIdealTimestamp: this.getNextIdealTimestamp()
    };
  }

  /**
   * Reset the calculator state
   */
  reset() {
    this.#baseTimestamp = 0;
    this.#frameCount = 0;
    this.#timestampOffset = 0;
    this.#driftCorrection = 0;
  }

  /**
   * Update target frame rate
   * @param {number} fps - New target frame rate
   */
  setTargetFPS(fps) {
    this.#targetFPS = fps;
    this.#targetFrameInterval = 1000000 / fps;
    console.log(`TimestampCalculator: Target FPS updated to ${fps}`);
  }

  /**
   * Check if timestamps are in sync within tolerance
   * @param {number} actualTimestamp - Actual timestamp
   * @param {number} expectedTimestamp - Expected timestamp
   * @param {number} toleranceMs - Tolerance in milliseconds (default: 2ms)
   * @returns {boolean} True if in sync
   */
  static isInSync(actualTimestamp, expectedTimestamp, toleranceMs = 2) {
    const toleranceMicros = toleranceMs * 1000;
    return Math.abs(actualTimestamp - expectedTimestamp) <= toleranceMicros;
  }
}

// Make the class available globally for worker
globalThis.TimestampCalculator = TimestampCalculator;
