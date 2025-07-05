importScripts("demuxer-mp4.js", "render-2d.js", "frame-rate-controller.js", "frame-buffer-manager.js", "timestamp-calculator.js", "enhanced-frame-quality-manager.js", "worker-communication-manager.js", "performance-monitor.js");

/**
 * Enhanced worker class that handles video demuxing, decoding, and rendering with 24 FPS optimization
 * Integrates frame rate control, quality management, and performance monitoring
 */
class DemuxWorker {
  #demuxer = null;
  #frameRateController = null;
  #frameBufferManager = null;
  #timestampCalculator = null;
  #qualityManager = null;
  #communicationManager = null;
  #performanceMonitor = null;
  #targetFPS = 24;
  #isProcessing = false;
  #frameCount = 0;
  #startTime = 0;

  constructor() {
    this.#initializeComponents();
    this.#setupCleanupHandlers();
  }

  #initializeComponents() {
    this.#frameRateController = new FrameRateController(this.#targetFPS, (frame, metadata) => {
      this.#handleProcessedFrame(frame, metadata);
    });

    this.#frameBufferManager = new FrameBufferManager(2000, 10000); // 20 frames max, 100MB limit
    this.#frameBufferManager.setOnMemoryWarning((warning) => {
      this.#handleMemoryWarning(warning);
    });

    this.#timestampCalculator = new TimestampCalculator(this.#targetFPS);
    this.#qualityManager = new EnhancedFrameQualityManager();
    this.#qualityManager.setOnQualityUpgrade((data) => {
      this.#handleQualityUpgrade(data);
    });

    this.#communicationManager = new WorkerCommunicationManager();
    this.#communicationManager.registerHandler('get_performance_metrics', () => {
      return this.#getPerformanceMetrics();
    });

    this.#performanceMonitor = new PerformanceMonitor();
    this.#performanceMonitor.setOnPerformanceAlert((alerts) => {
      this.#handlePerformanceAlerts(alerts);
    });
  }

  /**
   * Setup cleanup handlers for worker termination
   * @private
   */
  #setupCleanupHandlers() {
    // Handle worker termination
    self.addEventListener('beforeunload', () => {
      this.#cleanup();
    });

    // Handle explicit cleanup messages
    self.addEventListener('message', (event) => {
      if (event.data.task === 'cleanup' || event.data.task === 'terminate') {
        this.#cleanup();
      }
    });

    // Handle uncaught errors that might require cleanup
    self.addEventListener('error', (event) => {
      console.error('Worker error, performing cleanup:', event.error);
      this.#cleanup();
    });
  }

  /**
   * Sets up message event listeners for the worker
   */
  setupMessageHandlers() {
    self.addEventListener("message", (message) => {
      this.#communicationManager.handleMessage(message.data);
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
      if (data.task === 'start') {
        this.#start(data);
      }
    } catch (error) {
      console.error("Error handling message:", error);
      this.#communicationManager.sendMessage('error', { error: error.message });
    }
  }

  /**
   * Initializes the demuxer and frame processing with the provided configuration
   * @param {Object} config - Configuration object
   * @private
   */
  #start({arrayBuffer, dataUri, rendererName, canvas}) {
    this.#isProcessing = true;
    this.#startTime = performance.now();
    
    dataUri = dataUri || arrayBuffer;
    this.#initializeDemuxer(dataUri);
    
    // Send worker ready message
    this.#communicationManager.sendMessage('worker_ready', {
      targetFPS: this.#targetFPS,
      memoryLimit: this.#frameBufferManager.getStats().maxMemoryMB,
      timestamp: performance.now()
    });
  }

  /**
   * Initializes the MP4 demuxer with enhanced callbacks
   * @param {string} dataUri - URI of the video data
   * @private
   */
  #initializeDemuxer(dataUri) {
    const demuxerCallbacks = {
      onFrame: (frame) => this.#handleIncomingFrame(frame),
      onError: (error) => this.#handleError(error),
      onReady: (info) => {
        this.#handleDemuxerReady(info);
      }
    };

    this.#demuxer = new MP4Demuxer(dataUri, demuxerCallbacks);
  }

  /**
   * Handle demuxer ready event with enhanced initialization
   * @param {Object} info - Demuxer info
   * @private
   */
  #handleDemuxerReady(info) {
    console.log("Demuxer ready with enhanced frame processing", info);
    
    // Extract source frame rate if available
    if (info.videoTracks && info.videoTracks[0]) {
      const track = info.videoTracks[0];
      const sourceFPS = track.movie_timescale / track.movie_duration * track.duration || 30;
      
      this.#frameRateController.setSourceFrameRate(sourceFPS);
      this.#timestampCalculator.setSourceFrameRate(sourceFPS);
      
      console.log(`Source FPS detected: ${sourceFPS}, Target FPS: ${this.#targetFPS}`);
    }
    
    // Initialize timestamp calculator with first frame
    this.#timestampCalculator.initialize(0);

    this.#communicationManager.sendMessage('start_processing', {
        ...info,
        enhancedProcessing: true,
        targetFPS: this.#targetFPS,
        frameRateControlEnabled: true,
        qualityManagementEnabled: true
    });
  }

  /**
   * Handle incoming frames from demuxer with 24 FPS processing
   * @param {VideoFrame} frame - Incoming video frame
   * @private
   */
  #handleIncomingFrame(frame) {
    const processingStartTime = performance.now();
    
    try {
      // Create enhanced metadata for the frame (using HIGH_RES quality level)
      const metadata = this.#qualityManager.createEnhancedMetadata(frame, 3, { // FrameQuality.HIGH_RES = 3
        sourceTimestamp: frame.timestamp,
        processingStartTime: processingStartTime
      });

      // Acquire managed frame from buffer manager
      const managedFrame = this.#frameBufferManager.acquireFrame(frame, metadata);
      
      // Mark frame as in use to prevent premature cleanup
      this.#frameBufferManager.markFrameInUse(managedFrame);

      // Process frame through rate controller for 24 FPS output
      this.#frameRateController.processFrame(frame, metadata);

      // Record performance metrics
      const processingTime = performance.now() - processingStartTime;
      this.#performanceMonitor.recordFrameProcessing({
        processed: true,
        processingTime: processingTime,
        timestamp: frame.timestamp,
        quality: this.#qualityManager.evaluateFrameQuality(frame, metadata),
        memoryUsage: this.#frameBufferManager.getStats().memoryUsage
      });

    } catch (error) {
      console.error("Error processing frame:", error);
      this.#handleError(error);
      
      // Record failed processing
      this.#performanceMonitor.recordFrameProcessing({
        processed: false,
        processingTime: performance.now() - processingStartTime,
        timestamp: frame.timestamp,
        error: error.message
      });
    }
  }

  /**
   * Handle processed frames from frame rate controller
   * @param {VideoFrame} frame - Processed frame at 24 FPS
   * @param {Object} metadata - Frame metadata
   * @private
   */
  #handleProcessedFrame(frame, metadata) {
    this.#frameCount++;
    
    // Send frame to main thread with enhanced metadata
    const frameData = {
      frame: frame,
      timestamp: frame.timestamp / 1e6, // Convert to seconds
      frameIndex: metadata.frameIndex,
      quality: metadata.quality || 1.0,
      originalTimestamp: metadata.originalTimestamp,
      adjustedTimestamp: metadata.adjustedTimestamp,
    };

    this.#communicationManager.sendMessage('frame_processed', {
      frameIndex: this.#frameCount,
      timestamp: frame.timestamp,
      quality: metadata.quality || 1.0,
      frameRate: this.#calculateCurrentFrameRate(),
      memoryUsage: this.#frameBufferManager.getStats().memoryUsage,
      bufferSize: this.#frameBufferManager.getStats().activeFrames,
      frameData: frameData
    });

    
    // Frame has been sent, it's now safe to allow cleanup
    // Note: The frame will be closed by the receiving end when done
  }

  /**
   * Calculate current frame rate
   * @returns {number} Current frame rate
   * @private
   */
  #calculateCurrentFrameRate() {
    if (this.#frameCount === 0 || this.#startTime === 0) return 0;
    
    const elapsedSeconds = (performance.now() - this.#startTime) / 1000;
    return this.#frameCount / elapsedSeconds;
  }

  /**
   * Handle memory warnings from buffer manager
   * @param {Object} warning - Memory warning data
   * @private
   */
  #handleMemoryWarning(warning) {
    console.warn("Memory warning:", warning);
    
    // Try gentle cleanup first
    this.#frameBufferManager.gentleCleanup();
    
    // Check if we still have memory pressure
    const stats = this.#frameBufferManager.getStats();
    const memoryUsageMB = stats.memoryUsage / (1024 * 1024);
    
    // Only force cleanup if memory usage is still very high
    if (memoryUsageMB > 8000) { // 800MB threshold for force cleanup
      console.warn("Memory usage still high after gentle cleanup, performing force cleanup");
      this.#frameBufferManager.forceCleanup();
    }
    
    this.#communicationManager.sendMessage('memory_warning', {
      ...warning,
      cleanupPerformed: true,
      currentMemoryMB: memoryUsageMB
    });
  }

  /**
   * Handle quality upgrade events
   * @param {Object} data - Quality upgrade data
   * @private
   */
  #handleQualityUpgrade(data) {
    this.#communicationManager.sendMessage('quality_update', data);
  }

  /**
   * Handle performance alerts
   * @param {Array} alerts - Performance alerts
   * @private
   */
  #handlePerformanceAlerts(alerts) {
    // console.warn("Performance alerts:", alerts);
    this.#communicationManager.sendMessage('performance_alert', { alerts });
  }


  /**
   * Get comprehensive performance metrics
   * @returns {Object} Performance metrics
   * @private
   */
  #getPerformanceMetrics() {
    return {
      frameRateController: this.#frameRateController.getStats(),
      bufferManager: this.#frameBufferManager.getStats(),
      timestampCalculator: this.#timestampCalculator.getStats(),
      qualityManager: this.#qualityManager.getQualityStats(),
      performanceMonitor: this.#performanceMonitor.getPerformanceReport(),
      worker: {
        frameCount: this.#frameCount,
        isProcessing: this.#isProcessing,
        uptime: performance.now() - this.#startTime,
        currentFPS: this.#calculateCurrentFrameRate()
      }
    };
  }

  /**
   * Handle errors with enhanced reporting
   * @param {Error} error - Error object
   * @private
   */
  #handleError(error) {
    console.error("Enhanced worker error:", error);
    
    this.#communicationManager.sendMessage('error', {
      message: error.message,
      stack: error.stack,
      timestamp: performance.now(),
      context: {
        frameCount: this.#frameCount,
        isProcessing: this.#isProcessing,
        memoryUsage: this.#frameBufferManager.getStats().memoryUsage
      }
    });
  }

  /**
   * Comprehensive cleanup of all resources
   * @private
   */
  #cleanup() {
    console.log('DemuxWorker: Starting comprehensive cleanup...');
    
    try {
      // Stop processing new frames
      this.#isProcessing = false;

      // Cleanup frame rate controller
      if (this.#frameRateController) {
        this.#frameRateController.flush(); // Output any remaining frames
        this.#frameRateController.completeCleanup();
      }

      // Cleanup frame buffer manager - use complete cleanup for shutdown
      if (this.#frameBufferManager) {
        this.#frameBufferManager.completeCleanup();
      }

      // Cleanup performance monitor
      if (this.#performanceMonitor) {
        this.#performanceMonitor.stop();
      }

      // Cleanup demuxer
      if (this.#demuxer && typeof this.#demuxer.close === 'function') {
        this.#demuxer.close();
      }

      // Cleanup communication manager
      if (this.#communicationManager) {
        this.#communicationManager.cleanup();
      }

      // Reset all counters
      this.#frameCount = 0;
      this.#startTime = 0;

      console.log('DemuxWorker: Cleanup completed successfully');
      
      // Notify main thread that cleanup is complete
      self.postMessage({
        type: 'cleanup_complete',
        timestamp: performance.now()
      });

    } catch (error) {
      console.error('Error during worker cleanup:', error);
      self.postMessage({
        type: 'cleanup_error',
        error: error.message,
        timestamp: performance.now()
      });
    }
  }

  /**
   * Public cleanup method that can be called externally
   */
  cleanup() {
    this.#cleanup();
  }
}

const worker = new DemuxWorker();
worker.setupMessageHandlers();
