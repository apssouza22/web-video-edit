// FrameQuality constants for worker environment
const FrameQuality = {
  EMPTY: 0,           // Not loaded
  INTERPOLATED: 1,    // Calculated from nearby frames
  LOW_RES: 2,         // Extracted at reduced FPS (12 FPS)
  HIGH_RES: 3         // Extracted at full FPS
};


/**
 * Enhanced frame metadata for progressive loading
 */
class FrameMetadata {
  constructor(data = null, quality = FrameQuality.EMPTY, timestamp = 0) {
    this.data = data;           // ImageData or null
    this.quality = quality;     // FrameQuality level
    this.timestamp = timestamp; // Exact timestamp in seconds
    this.sourceIndex = null;    // For interpolated frames, points to source frame
  }

  /**
   * Check if frame has actual extracted data
   */
  hasRealData() {
    return this.quality === FrameQuality.LOW_RES || this.quality === FrameQuality.HIGH_RES;
  }

  /**
   * Check if frame needs quality upgrade
   */
  needsUpgrade() {
    return this.quality === FrameQuality.LOW_RES || this.quality === FrameQuality.INTERPOLATED;
  }

  /**
   * Get display data (handles interpolation)
   */
  getDisplayData(frames) {
    if (this.data) {
      return this.data;
    }

    // For interpolated frames, return source frame data
    if (this.quality === FrameQuality.INTERPOLATED && this.sourceIndex !== null) {
      const sourceFrame = frames[this.sourceIndex];
      return sourceFrame ? sourceFrame.data : null;
    }

    return null;
  }
}

/**
 * EnhancedFrameQualityManager - Advanced frame quality management for 24 FPS output
 * Integrates with FrameRateController to provide intelligent quality-based frame selection
 */
class EnhancedFrameQualityManager {
  #qualityThresholds = {
    [FrameQuality.EMPTY]: 0.0,
    [FrameQuality.INTERPOLATED]: 0.3,
    [FrameQuality.LOW_RES]: 0.7,
    [FrameQuality.HIGH_RES]: 1.0
  };
  
  #frameHistory = [];
  #maxHistorySize = 100;
  #qualityStats = {
    [FrameQuality.EMPTY]: 0,
    [FrameQuality.INTERPOLATED]: 0,
    [FrameQuality.LOW_RES]: 0,
    [FrameQuality.HIGH_RES]: 0
  };
  
  #onQualityUpgrade = null;
  #upgradeInProgress = false;

  constructor() {
    console.log('EnhancedFrameQualityManager: Initialized');
  }

  /**
   * Set callback for quality upgrade notifications
   * @param {Function} callback - Quality upgrade callback
   */
  setOnQualityUpgrade(callback) {
    this.#onQualityUpgrade = callback;
  }

  /**
   * Evaluate frame quality and return a normalized score
   * @param {VideoFrame} frame - Video frame to evaluate
   * @param {FrameMetadata} metadata - Frame metadata
   * @returns {number} Quality score between 0 and 1
   */
  evaluateFrameQuality(frame, metadata = null) {
    if (!frame) return 0;

    let qualityScore = 0.5; // Base score

    // Factor 1: Frame metadata quality
    if (metadata && metadata.quality !== undefined) {
      qualityScore = this.#qualityThresholds[metadata.quality] || 0.5;
    }

    // Factor 2: Frame completeness and validity
    if (frame.codedWidth && frame.codedHeight) {
      qualityScore += 0.1;
    }

    // Factor 3: Frame format preferences
    if (frame.format) {
      // Prefer certain formats for better quality
      const formatBonus = this.#getFormatQualityBonus(frame.format);
      qualityScore += formatBonus;
    }

    // Factor 4: Frame age (newer frames might be better)
    const frameAge = performance.now() - (frame.timestamp / 1000);
    if (frameAge < 1000) { // Less than 1 second old
      qualityScore += 0.05;
    }

    // Clamp to [0, 1] range
    return Math.max(0, Math.min(1, qualityScore));
  }

  /**
   * Get quality bonus based on frame format
   * @param {string} format - Frame format
   * @returns {number} Quality bonus
   * @private
   */
  #getFormatQualityBonus(format) {
    const formatBonuses = {
      'I420': 0.1,
      'NV12': 0.08,
      'RGBA': 0.05,
      'BGRA': 0.05
    };
    return formatBonuses[format] || 0;
  }

  /**
   * Compare two frames and determine which has better quality
   * @param {Object} frameA - First frame with metadata
   * @param {Object} frameB - Second frame with metadata
   * @returns {number} -1 if A is better, 1 if B is better, 0 if equal
   */
  compareFrameQuality(frameA, frameB) {
    const qualityA = this.evaluateFrameQuality(frameA.frame, frameA.metadata);
    const qualityB = this.evaluateFrameQuality(frameB.frame, frameB.metadata);

    if (Math.abs(qualityA - qualityB) < 0.05) {
      // If quality is very similar, prefer the one closer to target timestamp
      const timestampDiffA = Math.abs(frameA.targetTimestamp - frameA.frame.timestamp);
      const timestampDiffB = Math.abs(frameB.targetTimestamp - frameB.frame.timestamp);
      
      return timestampDiffA < timestampDiffB ? -1 : 1;
    }

    return qualityA > qualityB ? -1 : 1;
  }

  /**
   * Select the best frame from a collection based on quality and timing
   * @param {Array} frames - Array of frame objects with metadata
   * @param {number} targetTimestamp - Target timestamp for selection
   * @returns {Object|null} Best frame object or null
   */
  selectBestFrame(frames, targetTimestamp) {
    if (!frames || frames.length === 0) return null;

    // Add target timestamp to each frame for comparison
    const framesWithTarget = frames.map(frame => ({
      ...frame,
      targetTimestamp: targetTimestamp
    }));

    // Sort by quality (best first)
    framesWithTarget.sort((a, b) => this.compareFrameQuality(a, b));

    const bestFrame = framesWithTarget[0];
    
    // Update statistics
    if (bestFrame.metadata && bestFrame.metadata.quality !== undefined) {
      this.#qualityStats[bestFrame.metadata.quality]++;
    }

    // Add to history
    this.#addToHistory({
      timestamp: bestFrame.frame.timestamp,
      quality: this.evaluateFrameQuality(bestFrame.frame, bestFrame.metadata),
      metadata: bestFrame.metadata
    });

    return bestFrame;
  }

  /**
   * Create enhanced metadata for a frame
   * @param {VideoFrame} frame - Video frame
   * @param {FrameQuality} quality - Frame quality level
   * @param {Object} additionalData - Additional metadata
   * @returns {FrameMetadata} Enhanced frame metadata
   */
  createEnhancedMetadata(frame, quality = FrameQuality.HIGH_RES, additionalData = {}) {
    const metadata = new FrameMetadata(null, quality, frame.timestamp / 1000000);
    
    // Add enhanced properties
    metadata.frameSize = {
      width: frame.displayWidth || frame.codedWidth,
      height: frame.displayHeight || frame.codedHeight
    };
    
    metadata.format = frame.format;
    metadata.duration = frame.duration;
    metadata.qualityScore = this.evaluateFrameQuality(frame, metadata);
    metadata.processingTimestamp = performance.now();
    
    // Merge additional data
    Object.assign(metadata, additionalData);
    
    return metadata;
  }

  /**
   * Determine if a frame needs quality upgrade
   * @param {FrameMetadata} metadata - Frame metadata
   * @param {number} currentTime - Current playback time
   * @returns {Object} Upgrade recommendation
   */
  shouldUpgradeQuality(metadata, currentTime = 0) {
    if (!metadata) return { shouldUpgrade: false, reason: 'no_metadata' };

    const needsUpgrade = metadata.needsUpgrade();
    const isRecentlyViewed = Math.abs(currentTime - metadata.timestamp) < 2; // Within 2 seconds
    const hasLowQuality = metadata.quality <= FrameQuality.INTERPOLATED;
    
    const shouldUpgrade = needsUpgrade && (isRecentlyViewed || hasLowQuality);
    
    return {
      shouldUpgrade: shouldUpgrade,
      priority: this.#calculateUpgradePriority(metadata, currentTime),
      reason: shouldUpgrade ? 'quality_improvement_needed' : 'sufficient_quality',
      currentQuality: metadata.quality,
      targetQuality: FrameQuality.HIGH_RES
    };
  }

  /**
   * Calculate upgrade priority for a frame
   * @param {FrameMetadata} metadata - Frame metadata
   * @param {number} currentTime - Current playback time
   * @returns {number} Priority score (higher = more urgent)
   * @private
   */
  #calculateUpgradePriority(metadata, currentTime) {
    let priority = 0;
    
    // Distance from current time (closer = higher priority)
    const timeDiff = Math.abs(currentTime - metadata.timestamp);
    priority += Math.max(0, 10 - timeDiff); // Max 10 points for current frame
    
    // Quality level (lower quality = higher priority)
    priority += (FrameQuality.HIGH_RES - metadata.quality) * 2;
    
    // Frame importance (key frames, scene changes, etc.)
    if (metadata.isKeyFrame) priority += 3;
    if (metadata.hasSceneChange) priority += 2;
    
    return priority;
  }

  /**
   * Add frame to processing history
   * @param {Object} frameInfo - Frame information
   * @private
   */
  #addToHistory(frameInfo) {
    this.#frameHistory.push({
      ...frameInfo,
      processedAt: performance.now()
    });

    // Maintain history size
    if (this.#frameHistory.length > this.#maxHistorySize) {
      this.#frameHistory.shift();
    }
  }

  /**
   * Analyze quality trends over time
   * @returns {Object} Quality analysis
   */
  analyzeQualityTrends() {
    if (this.#frameHistory.length < 10) {
      return { trend: 'insufficient_data', confidence: 0 };
    }

    const recentFrames = this.#frameHistory.slice(-20);
    const qualityValues = recentFrames.map(f => f.quality);
    
    // Calculate trend
    const avgQuality = qualityValues.reduce((sum, q) => sum + q, 0) / qualityValues.length;
    const firstHalf = qualityValues.slice(0, Math.floor(qualityValues.length / 2));
    const secondHalf = qualityValues.slice(Math.floor(qualityValues.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, q) => sum + q, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, q) => sum + q, 0) / secondHalf.length;
    
    const trendDirection = secondAvg > firstAvg ? 'improving' : 
                          secondAvg < firstAvg ? 'degrading' : 'stable';
    
    return {
      trend: trendDirection,
      averageQuality: avgQuality.toFixed(3),
      confidence: Math.min(1, this.#frameHistory.length / 50),
      recentFrames: recentFrames.length,
      qualityDistribution: this.#qualityStats
    };
  }

  /**
   * Get comprehensive quality statistics
   * @returns {Object} Quality statistics
   */
  getQualityStats() {
    const totalFrames = Object.values(this.#qualityStats).reduce((sum, count) => sum + count, 0);
    const qualityDistribution = {};
    
    for (const [quality, count] of Object.entries(this.#qualityStats)) {
      qualityDistribution[quality] = {
        count: count,
        percentage: totalFrames > 0 ? ((count / totalFrames) * 100).toFixed(1) : '0.0'
      };
    }

    return {
      totalFramesProcessed: totalFrames,
      qualityDistribution: qualityDistribution,
      averageQuality: this.#calculateAverageQuality(),
      upgradeInProgress: this.#upgradeInProgress,
      historySize: this.#frameHistory.length,
      trends: this.analyzeQualityTrends()
    };
  }

  /**
   * Calculate average quality score
   * @returns {number} Average quality score
   * @private
   */
  #calculateAverageQuality() {
    const totalFrames = Object.values(this.#qualityStats).reduce((sum, count) => sum + count, 0);
    if (totalFrames === 0) return 0;

    let weightedSum = 0;
    for (const [quality, count] of Object.entries(this.#qualityStats)) {
      weightedSum += this.#qualityThresholds[quality] * count;
    }

    return (weightedSum / totalFrames).toFixed(3);
  }

  /**
   * Reset quality manager state
   */
  reset() {
    this.#frameHistory = [];
    this.#qualityStats = {
      [FrameQuality.EMPTY]: 0,
      [FrameQuality.INTERPOLATED]: 0,
      [FrameQuality.LOW_RES]: 0,
      [FrameQuality.HIGH_RES]: 0
    };
    this.#upgradeInProgress = false;
  }

  /**
   * Set upgrade in progress status
   * @param {boolean} inProgress - Whether upgrade is in progress
   */
  setUpgradeInProgress(inProgress) {
    this.#upgradeInProgress = inProgress;
    if (this.#onQualityUpgrade) {
      this.#onQualityUpgrade({ type: 'status_change', upgrading: inProgress });
    }
  }
}

// Make the class and constants available globally for worker
globalThis.FrameQuality = FrameQuality;
globalThis.EnhancedFrameQualityManager = EnhancedFrameQualityManager;
