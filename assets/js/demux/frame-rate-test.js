/**
 * FrameRateTest - Test suite for validating 24 FPS frame rate accuracy
 * Tests frame timing, rate consistency, and quality management
 */
class FrameRateTest {
  #testResults = [];
  #startTime = 0;
  #frameTimestamps = [];
  #targetFPS = 24;
  #tolerance = 0.1; // 10% tolerance

  constructor(targetFPS = 24) {
    this.#targetFPS = targetFPS;
  }

  /**
   * Start frame rate testing
   */
  startTest() {
    this.#startTime = performance.now();
    this.#frameTimestamps = [];
    this.#testResults = [];
    console.log(`Starting 24 FPS accuracy test (target: ${this.#targetFPS} FPS)`);
  }

  /**
   * Record a frame for testing
   * @param {Object} frameData - Frame data with timestamp
   */
  recordFrame(frameData) {
    const timestamp = frameData.adjustedTimestamp || frameData.timestamp;
    this.#frameTimestamps.push({
      timestamp: timestamp,
      receivedAt: performance.now(),
      quality: frameData.quality || 1.0,
      frameIndex: frameData.frameIndex || this.#frameTimestamps.length
    });
  }

  /**
   * Analyze frame rate accuracy
   * @returns {Object} Test results
   */
  analyzeFrameRate() {
    if (this.#frameTimestamps.length < 10) {
      return {
        error: 'Insufficient frames for analysis',
        frameCount: this.#frameTimestamps.length
      };
    }

    const results = {
      frameCount: this.#frameTimestamps.length,
      targetFPS: this.#targetFPS,
      actualFPS: this.#calculateActualFPS(),
      frameIntervals: this.#analyzeFrameIntervals(),
      timingAccuracy: this.#analyzeTimingAccuracy(),
      qualityConsistency: this.#analyzeQualityConsistency(),
      overallScore: 0
    };

    // Calculate overall score
    results.overallScore = this.#calculateOverallScore(results);
    
    return results;
  }

  /**
   * Calculate actual frame rate from timestamps
   * @returns {number} Actual FPS
   * @private
   */
  #calculateActualFPS() {
    if (this.#frameTimestamps.length < 2) return 0;

    const firstFrame = this.#frameTimestamps[0];
    const lastFrame = this.#frameTimestamps[this.#frameTimestamps.length - 1];
    const durationSeconds = (lastFrame.timestamp - firstFrame.timestamp) / 1000000; // Convert from microseconds
    
    return (this.#frameTimestamps.length - 1) / durationSeconds;
  }

  /**
   * Analyze frame intervals for consistency
   * @returns {Object} Interval analysis
   * @private
   */
  #analyzeFrameIntervals() {
    const expectedInterval = 1000000 / this.#targetFPS; // Microseconds
    const intervals = [];
    
    for (let i = 1; i < this.#frameTimestamps.length; i++) {
      const interval = this.#frameTimestamps[i].timestamp - this.#frameTimestamps[i - 1].timestamp;
      intervals.push(interval);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    return {
      expectedInterval: expectedInterval,
      actualInterval: avgInterval,
      variance: variance,
      standardDeviation: stdDev,
      consistency: this.#calculateConsistencyScore(stdDev, expectedInterval),
      intervalAccuracy: Math.abs(avgInterval - expectedInterval) / expectedInterval
    };
  }

  /**
   * Analyze timing accuracy against target
   * @returns {Object} Timing analysis
   * @private
   */
  #analyzeTimingAccuracy() {
    const expectedInterval = 1000000 / this.#targetFPS;
    let totalError = 0;
    let maxError = 0;
    const errors = [];

    for (let i = 1; i < this.#frameTimestamps.length; i++) {
      const expectedTimestamp = this.#frameTimestamps[0].timestamp + (i * expectedInterval);
      const actualTimestamp = this.#frameTimestamps[i].timestamp;
      const error = Math.abs(actualTimestamp - expectedTimestamp);
      
      errors.push(error);
      totalError += error;
      maxError = Math.max(maxError, error);
    }

    const avgError = totalError / errors.length;
    const errorPercentage = (avgError / expectedInterval) * 100;

    return {
      averageError: avgError,
      maxError: maxError,
      errorPercentage: errorPercentage,
      isWithinTolerance: errorPercentage <= (this.#tolerance * 100),
      tolerancePercentage: this.#tolerance * 100
    };
  }

  /**
   * Analyze quality consistency across frames
   * @returns {Object} Quality analysis
   * @private
   */
  #analyzeQualityConsistency() {
    const qualities = this.#frameTimestamps.map(frame => frame.quality);
    const avgQuality = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
    const qualityVariance = qualities.reduce((sum, q) => sum + Math.pow(q - avgQuality, 2), 0) / qualities.length;

    return {
      averageQuality: avgQuality,
      qualityVariance: qualityVariance,
      minQuality: Math.min(...qualities),
      maxQuality: Math.max(...qualities),
      consistencyScore: 1 - Math.sqrt(qualityVariance) // Higher is better
    };
  }

  /**
   * Calculate consistency score based on standard deviation
   * @param {number} stdDev - Standard deviation
   * @param {number} expectedInterval - Expected interval
   * @returns {number} Consistency score (0-1)
   * @private
   */
  #calculateConsistencyScore(stdDev, expectedInterval) {
    const normalizedStdDev = stdDev / expectedInterval;
    return Math.max(0, 1 - normalizedStdDev);
  }

  /**
   * Calculate overall test score
   * @param {Object} results - Test results
   * @returns {number} Overall score (0-100)
   * @private
   */
  #calculateOverallScore(results) {
    let score = 0;
    
    // Frame rate accuracy (40% weight)
    const fpsAccuracy = 1 - Math.abs(results.actualFPS - this.#targetFPS) / this.#targetFPS;
    score += fpsAccuracy * 40;
    
    // Timing accuracy (30% weight)
    const timingScore = results.timingAccuracy.isWithinTolerance ? 30 : 
                       Math.max(0, 30 - results.timingAccuracy.errorPercentage);
    score += timingScore;
    
    // Interval consistency (20% weight)
    score += results.frameIntervals.consistency * 20;
    
    // Quality consistency (10% weight)
    score += results.qualityConsistency.consistencyScore * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate test report
   * @returns {Object} Comprehensive test report
   */
  generateReport() {
    const analysis = this.analyzeFrameRate();
    
    return {
      testSummary: {
        passed: analysis.overallScore >= 80,
        score: analysis.overallScore.toFixed(1),
        grade: this.#getGrade(analysis.overallScore),
        frameCount: analysis.frameCount,
        testDuration: ((performance.now() - this.#startTime) / 1000).toFixed(2) + 's'
      },
      frameRateAccuracy: {
        target: analysis.targetFPS,
        actual: analysis.actualFPS.toFixed(2),
        accuracy: ((1 - Math.abs(analysis.actualFPS - analysis.targetFPS) / analysis.targetFPS) * 100).toFixed(1) + '%'
      },
      timingAccuracy: {
        withinTolerance: analysis.timingAccuracy.isWithinTolerance,
        averageError: (analysis.timingAccuracy.averageError / 1000).toFixed(2) + 'ms',
        maxError: (analysis.timingAccuracy.maxError / 1000).toFixed(2) + 'ms',
        errorPercentage: analysis.timingAccuracy.errorPercentage.toFixed(2) + '%'
      },
      consistency: {
        intervalConsistency: (analysis.frameIntervals.consistency * 100).toFixed(1) + '%',
        qualityConsistency: (analysis.qualityConsistency.consistencyScore * 100).toFixed(1) + '%',
        averageQuality: analysis.qualityConsistency.averageQuality.toFixed(3)
      },
      recommendations: this.#generateRecommendations(analysis)
    };
  }

  /**
   * Get grade based on score
   * @param {number} score - Test score
   * @returns {string} Grade
   * @private
   */
  #getGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate recommendations based on test results
   * @param {Object} analysis - Test analysis
   * @returns {Array} Recommendations
   * @private
   */
  #generateRecommendations(analysis) {
    const recommendations = [];

    if (Math.abs(analysis.actualFPS - this.#targetFPS) > 1) {
      recommendations.push({
        type: 'frame_rate',
        message: `Frame rate deviation detected. Consider adjusting frame rate controller parameters.`,
        priority: 'high'
      });
    }

    if (!analysis.timingAccuracy.isWithinTolerance) {
      recommendations.push({
        type: 'timing',
        message: `Timing accuracy outside tolerance. Consider improving timestamp calculations.`,
        priority: 'medium'
      });
    }

    if (analysis.frameIntervals.consistency < 0.8) {
      recommendations.push({
        type: 'consistency',
        message: `Frame interval consistency is low. Check for processing bottlenecks.`,
        priority: 'medium'
      });
    }

    if (analysis.qualityConsistency.averageQuality < 0.8) {
      recommendations.push({
        type: 'quality',
        message: `Average frame quality is below optimal. Consider quality management improvements.`,
        priority: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Reset test state
   */
  reset() {
    this.#frameTimestamps = [];
    this.#testResults = [];
    this.#startTime = 0;
  }

  /**
   * Set tolerance for accuracy testing
   * @param {number} tolerance - Tolerance as decimal (e.g., 0.1 for 10%)
   */
  setTolerance(tolerance) {
    this.#tolerance = tolerance;
  }
}

// Make the class available globally
globalThis.FrameRateTest = FrameRateTest;
