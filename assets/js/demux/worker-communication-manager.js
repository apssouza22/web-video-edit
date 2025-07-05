/**
 * WorkerCommunicationManager - Enhanced communication system for frame processing workers
 * Handles bidirectional communication with performance monitoring and frame rate feedback
 */
class WorkerCommunicationManager {
  #messageHandlers = new Map();
  #pendingRequests = new Map();
  #requestCounter = 0;
  #performanceMetrics = {
    messagesReceived: 0,
    messagesSent: 0,
    averageResponseTime: 0,
    lastMessageTime: 0,
    frameProcessingRate: 0,
    memoryUsage: 0
  };
  #frameRateCallbacks = new Set();
  #qualityCallbacks = new Set();
  #errorCallbacks = new Set();

  constructor() {
    this.#setupMessageHandlers();
  }

  /**
   * Setup default message handlers
   * @private
   */
  #setupMessageHandlers() {
    // Frame processing messages
    this.registerHandler('frame_processed', (data) => {
      this.#updateFrameProcessingMetrics(data);
      this.#notifyFrameRateCallbacks(data);
    });

    this.registerHandler('quality_update', (data) => {
      this.#notifyQualityCallbacks(data);
    });

    this.registerHandler('performance_metrics', (data) => {
      this.#updatePerformanceMetrics(data);
    });

    this.registerHandler('error', (data) => {
      this.#notifyErrorCallbacks(data);
    });

    this.registerHandler('worker_ready', (data) => {
      console.log('WorkerCommunicationManager: Worker ready', data);
    });
  }

  /**
   * Register a message handler for a specific message type
   * @param {string} messageType - Type of message to handle
   * @param {Function} handler - Handler function
   */
  registerHandler(messageType, handler) {
    if (!this.#messageHandlers.has(messageType)) {
      this.#messageHandlers.set(messageType, new Set());
    }
    this.#messageHandlers.get(messageType).add(handler);
  }


  /**
   * Process incoming message from worker
   * @param {Object} messageData - Message data from worker
   */
  handleMessage(messageData) {
    this.#performanceMetrics.messagesReceived++;
    this.#performanceMetrics.lastMessageTime = performance.now();

    const { type, data, requestId } = messageData;

    // Handle response to pending request
    if (requestId && this.#pendingRequests.has(requestId)) {
      const { resolve, timestamp } = this.#pendingRequests.get(requestId);
      const responseTime = performance.now() - timestamp;
      this.#updateAverageResponseTime(responseTime);
      resolve(data);
      this.#pendingRequests.delete(requestId);
      return;
    }

    if (this.#messageHandlers.has(type)) {
      const handlers = this.#messageHandlers.get(type);
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in message handler for ${type}:`, error);
        }
      });
    } else {
      console.warn(`No handler registered for message type: ${type}`);
    }
  }

  /**
   * Send message to worker
   * @param {string} type - Message type
   * @param {Object} data - Message data
   * @param {boolean} expectResponse - Whether to expect a response
   * @returns {Promise|void} Promise if expecting response
   */
  sendMessage(type, data = {}, expectResponse = false) {
    const message = {
      type: type,
      data: data,
      timestamp: performance.now()
    };

    if (expectResponse) {
      const requestId = ++this.#requestCounter;
      message.requestId = requestId;

      return new Promise((resolve, reject) => {
        this.#pendingRequests.set(requestId, {
          resolve,
          reject,
          timestamp: performance.now()
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.#pendingRequests.has(requestId)) {
            this.#pendingRequests.delete(requestId);
            reject(new Error(`Request ${requestId} timed out`));
          }
        }, 10000);

        this.#postMessage(message);
      });
    } else {
      this.#postMessage(message);
    }
  }

  /**
   * Post message to worker (to be overridden by implementation)
   * @param {Object} message - Message to send
   * @private
   */
  #postMessage(message) {
    // This should be overridden by the actual implementation
    if (typeof self !== 'undefined' && self.postMessage) {
      self.postMessage(message);
    } else {
      console.warn('No postMessage method available');
    }
    
    this.#performanceMetrics.messagesSent++;
  }


  /**
   * Send frame processing configuration
   * @param {Object} config - Frame processing configuration
   */
  async configureFrameProcessing(config) {
    return this.sendMessage('configure_frame_processing', config, true);
  }

  /**
   * Request frame rate adjustment
   * @param {number} targetFPS - Target frame rate
   */
  async setTargetFrameRate(targetFPS) {
    return this.sendMessage('set_target_fps', { fps: targetFPS }, true);
  }

  /**
   * Request performance metrics from worker
   */
  async requestPerformanceMetrics() {
    return this.sendMessage('get_performance_metrics', {}, true);
  }

  /**
   * Send memory limit configuration
   * @param {number} limitMB - Memory limit in MB
   */
  sendMemoryLimit(limitMB) {
    this.sendMessage('set_memory_limit', { limitMB });
  }

  /**
   * Register callback for frame rate updates
   * @param {Function} callback - Callback function
   */
  onFrameRateUpdate(callback) {
    this.#frameRateCallbacks.add(callback);
  }

  /**
   * Register callback for quality updates
   * @param {Function} callback - Callback function
   */
  onQualityUpdate(callback) {
    this.#qualityCallbacks.add(callback);
  }

  /**
   * Register callback for error notifications
   * @param {Function} callback - Callback function
   */
  onError(callback) {
    this.#errorCallbacks.add(callback);
  }

  /**
   * Update frame processing metrics
   * @param {Object} data - Frame processing data
   * @private
   */
  #updateFrameProcessingMetrics(data) {
    if (data.frameRate) {
      this.#performanceMetrics.frameProcessingRate = data.frameRate;
    }
    if (data.memoryUsage) {
      this.#performanceMetrics.memoryUsage = data.memoryUsage;
    }
  }

  /**
   * Update performance metrics
   * @param {Object} data - Performance data
   * @private
   */
  #updatePerformanceMetrics(data) {
    Object.assign(this.#performanceMetrics, data);
  }

  /**
   * Update average response time
   * @param {number} responseTime - Latest response time
   * @private
   */
  #updateAverageResponseTime(responseTime) {
    const currentAvg = this.#performanceMetrics.averageResponseTime;
    const count = this.#performanceMetrics.messagesReceived;
    
    // Calculate rolling average
    this.#performanceMetrics.averageResponseTime = 
      (currentAvg * (count - 1) + responseTime) / count;
  }

  /**
   * Notify frame rate callbacks
   * @param {Object} data - Frame rate data
   * @private
   */
  #notifyFrameRateCallbacks(data) {
    this.#frameRateCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in frame rate callback:', error);
      }
    });
  }

  /**
   * Notify quality callbacks
   * @param {Object} data - Quality data
   * @private
   */
  #notifyQualityCallbacks(data) {
    this.#qualityCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in quality callback:', error);
      }
    });
  }

  /**
   * Notify error callbacks
   * @param {Object} data - Error data
   * @private
   */
  #notifyErrorCallbacks(data) {
    this.#errorCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in error callback:', error);
      }
    });
  }

  /**
   * Get current performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.#performanceMetrics,
      pendingRequests: this.#pendingRequests.size,
      registeredHandlers: this.#messageHandlers.size,
      uptime: performance.now()
    };
  }

  /**
   * Create a frame processing status message
   * @param {Object} frameData - Frame processing data
   * @returns {Object} Status message
   */
  createFrameProcessingStatus(frameData) {
    return {
      type: 'frame_processed',
      data: {
        frameIndex: frameData.frameIndex,
        timestamp: frameData.timestamp,
        quality: frameData.quality,
        processingTime: frameData.processingTime,
        memoryUsage: frameData.memoryUsage,
        frameRate: frameData.frameRate,
        bufferSize: frameData.bufferSize
      }
    };
  }

  /**
   * Create a quality update message
   * @param {Object} qualityData - Quality update data
   * @returns {Object} Quality message
   */
  createQualityUpdateMessage(qualityData) {
    return {
      type: 'quality_update',
      data: {
        averageQuality: qualityData.averageQuality,
        qualityDistribution: qualityData.qualityDistribution,
        upgradeProgress: qualityData.upgradeProgress,
        recommendedActions: qualityData.recommendedActions
      }
    };
  }

  /**
   * Reset communication manager state
   */
  reset() {
    // Clear pending requests
    this.#pendingRequests.clear();
    
    // Reset metrics
    this.#performanceMetrics = {
      messagesReceived: 0,
      messagesSent: 0,
      averageResponseTime: 0,
      lastMessageTime: 0,
      frameProcessingRate: 0,
      memoryUsage: 0
    };
    
    console.log('WorkerCommunicationManager: Reset completed');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.#frameRateCallbacks.clear();
    this.#qualityCallbacks.clear();
    this.#errorCallbacks.clear();
    this.reset();
  }
}

// Make the class available globally for worker
globalThis.WorkerCommunicationManager = WorkerCommunicationManager;
