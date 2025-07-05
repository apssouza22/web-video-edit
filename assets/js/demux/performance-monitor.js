/**
 * PerformanceMonitor - Comprehensive performance monitoring for frame processing
 * Tracks frame rates, memory usage, processing times, and provides optimization recommendations
 */
class PerformanceMonitor {
  #metrics = {
    frameProcessing: {
      totalFrames: 0,
      processedFrames: 0,
      droppedFrames: 0,
      averageProcessingTime: 0,
      maxProcessingTime: 0,
      minProcessingTime: Infinity,
      lastProcessingTime: 0
    },
    frameRate: {
      targetFPS: 24,
      actualFPS: 0,
      inputFPS: 0,
      compressionRatio: 0,
      frameTimeVariance: 0
    },
    memory: {
      currentUsage: 0,
      maxUsage: 0,
      averageUsage: 0,
      gcEvents: 0,
      memoryPressure: false
    },
    timing: {
      startTime: 0,
      totalRuntime: 0,
      lastFrameTime: 0,
      frameIntervals: []
    },
    quality: {
      averageQuality: 0,
      qualityVariance: 0,
      upgradeEvents: 0,
      qualityHistory: []
    }
  };

  #performanceHistory = [];
  #maxHistorySize = 1000;
  #monitoringInterval = null;
  #onPerformanceAlert = null;
  #alertThresholds = {
    maxProcessingTime: 50, // ms
    minFrameRate: 20, // fps
    maxMemoryUsage: 2024, // MB
    maxFrameTimeVariance: 10 // ms
  };

  constructor() {
    this.#metrics.timing.startTime = performance.now();
    this.#startMonitoring();
  }

  /**
   * Set callback for performance alerts
   * @param {Function} callback - Alert callback function
   */
  setOnPerformanceAlert(callback) {
    this.#onPerformanceAlert = callback;
  }

  /**
   * Record frame processing metrics
   * @param {Object} frameData - Frame processing data
   */
  recordFrameProcessing(frameData) {
    const processingTime = frameData.processingTime || 0;
    const quality = frameData.quality || 0;
    const memoryUsage = frameData.memoryUsage || 0;

    // Update frame processing metrics
    this.#metrics.frameProcessing.totalFrames++;
    if (frameData.processed) {
      this.#metrics.frameProcessing.processedFrames++;
    } else {
      this.#metrics.frameProcessing.droppedFrames++;
    }

    // Update processing time metrics
    this.#updateProcessingTimeMetrics(processingTime);

    // Update frame rate metrics
    this.#updateFrameRateMetrics(frameData.timestamp);

    // Update memory metrics
    this.#updateMemoryMetrics(memoryUsage);

    // Update quality metrics
    this.#updateQualityMetrics(quality);

    // Add to history
    this.#addToHistory({
      timestamp: performance.now(),
      processingTime,
      quality,
      memoryUsage,
      frameRate: this.#metrics.frameRate.actualFPS
    });

    // Check for performance alerts
    this.#checkPerformanceAlerts();
  }

  /**
   * Update processing time metrics
   * @param {number} processingTime - Processing time in milliseconds
   * @private
   */
  #updateProcessingTimeMetrics(processingTime) {
    const metrics = this.#metrics.frameProcessing;
    
    metrics.lastProcessingTime = processingTime;
    metrics.maxProcessingTime = Math.max(metrics.maxProcessingTime, processingTime);
    metrics.minProcessingTime = Math.min(metrics.minProcessingTime, processingTime);
    
    // Update rolling average
    const totalFrames = metrics.processedFrames;
    metrics.averageProcessingTime = 
      (metrics.averageProcessingTime * (totalFrames - 1) + processingTime) / totalFrames;
  }

  /**
   * Update frame rate metrics
   * @param {number} frameTimestamp - Frame timestamp in microseconds
   * @private
   */
  #updateFrameRateMetrics(frameTimestamp) {
    const now = performance.now();
    const metrics = this.#metrics.frameRate;
    const timing = this.#metrics.timing;

    if (timing.lastFrameTime > 0) {
      const interval = now - timing.lastFrameTime;
      timing.frameIntervals.push(interval);
      
      // Keep only recent intervals for FPS calculation
      if (timing.frameIntervals.length > 60) {
        timing.frameIntervals.shift();
      }
      
      // Calculate actual FPS
      if (timing.frameIntervals.length > 1) {
        const avgInterval = timing.frameIntervals.reduce((sum, i) => sum + i, 0) / timing.frameIntervals.length;
        metrics.actualFPS = 1000 / avgInterval;
        
        // Calculate frame time variance
        const variance = timing.frameIntervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / timing.frameIntervals.length;
        metrics.frameTimeVariance = Math.sqrt(variance);
      }
    }
    
    timing.lastFrameTime = now;
    
    // Update compression ratio
    if (this.#metrics.frameProcessing.totalFrames > 0) {
      metrics.compressionRatio = this.#metrics.frameProcessing.processedFrames / this.#metrics.frameProcessing.totalFrames;
    }
  }

  /**
   * Update memory metrics
   * @param {number} memoryUsage - Memory usage in bytes
   * @private
   */
  #updateMemoryMetrics(memoryUsage) {
    const metrics = this.#metrics.memory;
    
    metrics.currentUsage = memoryUsage;
    metrics.maxUsage = Math.max(metrics.maxUsage, memoryUsage);
    
    // Update rolling average
    const totalFrames = this.#metrics.frameProcessing.processedFrames;
    if (totalFrames > 0) {
      metrics.averageUsage = 
        (metrics.averageUsage * (totalFrames - 1) + memoryUsage) / totalFrames;
    }
    
    // Check for memory pressure
    const memoryMB = memoryUsage / (1024 * 1024);
    metrics.memoryPressure = memoryMB > this.#alertThresholds.maxMemoryUsage;
  }

  /**
   * Update quality metrics
   * @param {number} quality - Quality score (0-1)
   * @private
   */
  #updateQualityMetrics(quality) {
    const metrics = this.#metrics.quality;
    
    metrics.qualityHistory.push(quality);
    
    // Keep only recent quality values
    if (metrics.qualityHistory.length > 100) {
      metrics.qualityHistory.shift();
    }
    
    // Calculate average quality
    metrics.averageQuality = metrics.qualityHistory.reduce((sum, q) => sum + q, 0) / metrics.qualityHistory.length;
    
    // Calculate quality variance
    const avgQuality = metrics.averageQuality;
    const variance = metrics.qualityHistory.reduce((sum, q) => sum + Math.pow(q - avgQuality, 2), 0) / metrics.qualityHistory.length;
    metrics.qualityVariance = Math.sqrt(variance);
  }

  /**
   * Add performance data to history
   * @param {Object} data - Performance data
   * @private
   */
  #addToHistory(data) {
    this.#performanceHistory.push(data);
    
    if (this.#performanceHistory.length > this.#maxHistorySize) {
      this.#performanceHistory.shift();
    }
  }

  /**
   * Check for performance alerts
   * @private
   */
  #checkPerformanceAlerts() {
    const alerts = [];
    
    // Check processing time
    if (this.#metrics.frameProcessing.lastProcessingTime > this.#alertThresholds.maxProcessingTime) {
      alerts.push({
        type: 'high_processing_time',
        value: this.#metrics.frameProcessing.lastProcessingTime,
        threshold: this.#alertThresholds.maxProcessingTime,
        severity: 'warning'
      });
    }
    
    // Check frame rate
    if (this.#metrics.frameRate.actualFPS < this.#alertThresholds.minFrameRate) {
      alerts.push({
        type: 'low_frame_rate',
        value: this.#metrics.frameRate.actualFPS,
        threshold: this.#alertThresholds.minFrameRate,
        severity: 'error'
      });
    }
    
    // Check memory usage
    const memoryMB = this.#metrics.memory.currentUsage / (1024 * 1024);
    if (memoryMB > this.#alertThresholds.maxMemoryUsage) {
      alerts.push({
        type: 'high_memory_usage',
        value: memoryMB,
        threshold: this.#alertThresholds.maxMemoryUsage,
        severity: 'warning'
      });
    }
    
    // Check frame time variance
    if (this.#metrics.frameRate.frameTimeVariance > this.#alertThresholds.maxFrameTimeVariance) {
      alerts.push({
        type: 'high_frame_variance',
        value: this.#metrics.frameRate.frameTimeVariance,
        threshold: this.#alertThresholds.maxFrameTimeVariance,
        severity: 'info'
      });
    }
    
    // Trigger alerts
    if (alerts.length > 0 && this.#onPerformanceAlert) {
      this.#onPerformanceAlert(alerts);
    }
  }

  /**
   * Start continuous monitoring
   * @private
   */
  #startMonitoring() {
    this.#monitoringInterval = setInterval(() => {
      this.#updateRuntimeMetrics();
      this.#performGarbageCollectionCheck();
    }, 1000); // Monitor every second
  }

  /**
   * Update runtime metrics
   * @private
   */
  #updateRuntimeMetrics() {
    this.#metrics.timing.totalRuntime = performance.now() - this.#metrics.timing.startTime;
  }

  /**
   * Check for garbage collection events
   * @private
   */
  #performGarbageCollectionCheck() {
    // This is a simplified GC detection - in real implementation,
    // you might use performance.measureUserAgentSpecificMemory() or similar
    const currentMemory = this.#metrics.memory.currentUsage;
    const avgMemory = this.#metrics.memory.averageUsage;
    
    // Detect potential GC event (sudden memory drop)
    if (currentMemory < avgMemory * 0.7 && avgMemory > 0) {
      this.#metrics.memory.gcEvents++;
    }
  }

  /**
   * Get comprehensive performance report
   * @returns {Object} Performance report
   */
  getPerformanceReport() {
    return {
      summary: {
        totalFrames: this.#metrics.frameProcessing.totalFrames,
        processedFrames: this.#metrics.frameProcessing.processedFrames,
        droppedFrames: this.#metrics.frameProcessing.droppedFrames,
        actualFPS: this.#metrics.frameRate.actualFPS.toFixed(2),
        targetFPS: this.#metrics.frameRate.targetFPS,
        compressionRatio: (this.#metrics.frameRate.compressionRatio * 100).toFixed(1) + '%',
        averageQuality: this.#metrics.quality.averageQuality.toFixed(3),
        memoryUsageMB: (this.#metrics.memory.currentUsage / (1024 * 1024)).toFixed(2),
        runtime: (this.#metrics.timing.totalRuntime / 1000).toFixed(1) + 's'
      },
      detailed: {
        frameProcessing: this.#metrics.frameProcessing,
        frameRate: this.#metrics.frameRate,
        memory: this.#metrics.memory,
        timing: this.#metrics.timing,
        quality: this.#metrics.quality
      },
      recommendations: this.#generateRecommendations()
    };
  }

  /**
   * Generate performance optimization recommendations
   * @returns {Array} Array of recommendations
   * @private
   */
  #generateRecommendations() {
    const recommendations = [];
    
    // Frame rate recommendations
    if (this.#metrics.frameRate.actualFPS < this.#metrics.frameRate.targetFPS * 0.9) {
      recommendations.push({
        type: 'frame_rate',
        message: 'Consider reducing target FPS or optimizing frame processing',
        priority: 'high'
      });
    }
    
    // Memory recommendations
    const memoryMB = this.#metrics.memory.currentUsage / (1024 * 1024);
    if (memoryMB > 150) {
      recommendations.push({
        type: 'memory',
        message: 'High memory usage detected. Consider implementing more aggressive frame cleanup',
        priority: 'medium'
      });
    }
    
    // Processing time recommendations
    if (this.#metrics.frameProcessing.averageProcessingTime > 30) {
      recommendations.push({
        type: 'processing',
        message: 'High processing times detected. Consider optimizing frame processing algorithms',
        priority: 'medium'
      });
    }
    
    // Quality recommendations
    if (this.#metrics.quality.averageQuality < 0.7) {
      recommendations.push({
        type: 'quality',
        message: 'Low average quality detected. Consider adjusting quality thresholds',
        priority: 'low'
      });
    }
    
    return recommendations;
  }

  /**
   * Get recent performance history
   * @param {number} count - Number of recent entries to return
   * @returns {Array} Recent performance history
   */
  getRecentHistory(count = 50) {
    return this.#performanceHistory.slice(-count);
  }

  /**
   * Reset performance metrics
   */
  reset() {
    this.#metrics = {
      frameProcessing: {
        totalFrames: 0,
        processedFrames: 0,
        droppedFrames: 0,
        averageProcessingTime: 0,
        maxProcessingTime: 0,
        minProcessingTime: Infinity,
        lastProcessingTime: 0
      },
      frameRate: {
        targetFPS: 24,
        actualFPS: 0,
        inputFPS: 0,
        compressionRatio: 0,
        frameTimeVariance: 0
      },
      memory: {
        currentUsage: 0,
        maxUsage: 0,
        averageUsage: 0,
        gcEvents: 0,
        memoryPressure: false
      },
      timing: {
        startTime: performance.now(),
        totalRuntime: 0,
        lastFrameTime: 0,
        frameIntervals: []
      },
      quality: {
        averageQuality: 0,
        qualityVariance: 0,
        upgradeEvents: 0,
        qualityHistory: []
      }
    };
    
    this.#performanceHistory = [];
  }

  /**
   * Update alert thresholds
   * @param {Object} thresholds - New threshold values
   */
  updateAlertThresholds(thresholds) {
    Object.assign(this.#alertThresholds, thresholds);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.#monitoringInterval) {
      clearInterval(this.#monitoringInterval);
      this.#monitoringInterval = null;
    }
  }
}

// Make the class available globally for worker
globalThis.PerformanceMonitor = PerformanceMonitor;
