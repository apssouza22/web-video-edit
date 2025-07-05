/**
 * FrameBufferManager - Efficient memory management for VideoFrame objects
 * Provides frame pooling, memory monitoring, and intelligent buffer management
 */
class FrameBufferManager {
  #framePool = [];
  #maxPoolSize = 20;
  #activeFrames = new Set();
  #memoryUsage = 0;
  #maxMemoryUsage = 100 * 1024 * 1024; // 100MB default limit
  #frameCounter = 0;
  #onMemoryWarning = null;

  constructor(maxPoolSize = 20, maxMemoryMB = 100) {
    this.#maxPoolSize = maxPoolSize;
    this.#maxMemoryUsage = maxMemoryMB * 1024 * 1024;
  }

  /**
   * Set callback for memory warning events
   * @param {Function} callback - Memory warning callback
   */
  setOnMemoryWarning(callback) {
    this.#onMemoryWarning = callback;
  }

  /**
   * Acquire a frame from the pool or create a new one
   * @param {VideoFrame} sourceFrame - Source frame to clone or reference
   * @param {Object} options - Frame creation options
   * @returns {Object} Managed frame object with metadata
   */
  acquireFrame(sourceFrame, options = {}) {
    const frameId = ++this.#frameCounter;
    const estimatedSize = this.#estimateFrameSize(sourceFrame);

    // Check memory limits
    if (this.#memoryUsage + estimatedSize > this.#maxMemoryUsage) {
      this.#performMemoryCleanup();
      
      // If still over limit, trigger warning
      if (this.#memoryUsage + estimatedSize > this.#maxMemoryUsage && this.#onMemoryWarning) {
        this.#onMemoryWarning({
          currentUsage: this.#memoryUsage,
          maxUsage: this.#maxMemoryUsage,
          requestedSize: estimatedSize
        });
      }
    }

    // Create managed frame object
    const managedFrame = {
      id: frameId,
      frame: sourceFrame,
      timestamp: sourceFrame.timestamp,
      size: estimatedSize,
      createdAt: performance.now(),
      lastAccessed: performance.now(),
      refCount: 1,
      metadata: { ...options },
      inUse: false // Add inUse flag
    };

    // Track the frame
    this.#activeFrames.add(managedFrame);
    this.#memoryUsage += estimatedSize;

    return managedFrame;
  }

  /**
   * Release a managed frame and return it to the pool if possible
   * @param {Object} managedFrame - Managed frame object to release
   */
  releaseFrame(managedFrame) {
    if (!managedFrame || !this.#activeFrames.has(managedFrame)) {
      return;
    }

    managedFrame.refCount--;
    
    if (managedFrame.refCount <= 0) {
      // Remove from active tracking
      this.#activeFrames.delete(managedFrame);
      this.#memoryUsage -= managedFrame.size;

      // Only close the frame if it's not marked as in use by other systems
      if (managedFrame.frame && typeof managedFrame.frame.close === 'function') {
        // Check if frame is still valid before closing
        try {
          if (managedFrame.frame.format !== null) {
            managedFrame.frame.close();
          }
        } catch (error) {
          // Frame might already be closed, ignore the error
          console.debug('Frame already closed or invalid:', error.message);
        }
      }

      // Add to pool for potential reuse (metadata only)
      if (this.#framePool.length < this.#maxPoolSize) {
        this.#framePool.push({
          size: managedFrame.size,
          metadata: managedFrame.metadata,
          pooledAt: performance.now()
        });
      }
    }
  }

  /**
   * Increment reference count for a managed frame
   * @param {Object} managedFrame - Managed frame to reference
   */
  addReference(managedFrame) {
    if (managedFrame && this.#activeFrames.has(managedFrame)) {
      managedFrame.refCount++;
      managedFrame.lastAccessed = performance.now();
    }
  }

  /**
   * Mark a frame as in use by other systems
   * @param {Object} managedFrame - Managed frame to mark
   */
  markFrameInUse(managedFrame) {
    if (managedFrame && this.#activeFrames.has(managedFrame)) {
      managedFrame.inUse = true;
    }
  }

  /**
   * Unmark a frame as in use by other systems
   * @param {Object} managedFrame - Managed frame to unmark
   */
  unmarkFrameInUse(managedFrame) {
    if (managedFrame && this.#activeFrames.has(managedFrame)) {
      managedFrame.inUse = false;
    }
  }

  /**
   * Estimate the memory size of a VideoFrame
   * @param {VideoFrame} frame - Frame to estimate
   * @returns {number} Estimated size in bytes
   * @private
   */
  #estimateFrameSize(frame) {
    if (!frame) return 0;
    
    // Estimate based on frame dimensions and format
    const width = frame.displayWidth || frame.codedWidth || 1920;
    const height = frame.displayHeight || frame.codedHeight || 1080;
    
    // Assume 4 bytes per pixel for RGBA (conservative estimate)
    return width * height * 4;
  }

  /**
   * Perform memory cleanup by releasing old or unused frames
   * @private
   */
  #performMemoryCleanup() {
    const now = performance.now();
    const maxAge = 5000; // 5 seconds
    const framesToRelease = [];

    // Find frames that haven't been accessed recently and are safe to release
    for (const frame of this.#activeFrames) {
      const frameAge = now - frame.lastAccessed;
      const isOld = frameAge > maxAge;
      const isSafeToRelease = frame.refCount === 1 && !frame.inUse;
      
      if (isOld && isSafeToRelease) {
        framesToRelease.push(frame);
      }
    }

    // Release old frames
    framesToRelease.forEach(frame => {
      this.releaseFrame(frame);
    });

    // Clean up frame pool
    this.#framePool = this.#framePool.filter(pooledFrame => {
      return now - pooledFrame.pooledAt < maxAge;
    });

    console.log(`FrameBufferManager: Cleaned up ${framesToRelease.length} frames, freed ~${framesToRelease.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024}MB`);
  }

  /**
   * Perform gentle memory cleanup by releasing old or unused frames
   */
  gentleCleanup() {
    this.#performMemoryCleanup();
  }

  /**
   * Force cleanup of all frames (emergency cleanup)
   */
  forceCleanup() {
    console.log('FrameBufferManager: Performing force cleanup');
    
    // Only release frames that are safe to release
    const activeFrames = Array.from(this.#activeFrames);
    activeFrames.forEach(frame => {
      // Only force cleanup frames that aren't currently in use
      if (!frame.inUse && frame.refCount <= 1) {
        frame.refCount = 1; // Reset ref count to allow release
        this.releaseFrame(frame);
      }
    });

    // Clear pool
    this.#framePool = [];
    
    // Recalculate memory usage
    let actualMemoryUsage = 0;
    for (const frame of this.#activeFrames) {
      actualMemoryUsage += frame.size;
    }
    this.#memoryUsage = actualMemoryUsage;
  }

  /**
   * Complete cleanup - closes ALL frames regardless of status (for shutdown)
   */
  completeCleanup() {
    console.log('FrameBufferManager: Performing complete cleanup for shutdown');
    
    let closedFrames = 0;
    
    // Force close all active frames
    const activeFrames = Array.from(this.#activeFrames);
    activeFrames.forEach(frame => {
      try {
        if (frame.frame && typeof frame.frame.close === 'function') {
          // Check if frame is still valid before closing
          if (frame.frame.format !== null) {
            frame.frame.close();
            closedFrames++;
          }
        }
      } catch (error) {
        // Frame might already be closed, ignore the error
        console.debug('Frame already closed during complete cleanup:', error.message);
      }
    });

    // Clear all collections
    this.#activeFrames.clear();
    this.#framePool = [];
    this.#memoryUsage = 0;
    this.#frameCounter = 0;

    console.log(`FrameBufferManager: Complete cleanup finished - closed ${closedFrames} frames`);
  }

  /**
   * Get current memory and performance statistics
   * @returns {Object} Buffer manager statistics
   */
  getStats() {
    return {
      activeFrames: this.#activeFrames.size,
      pooledFrames: this.#framePool.length,
      memoryUsage: this.#memoryUsage,
      memoryUsageMB: (this.#memoryUsage / 1024 / 1024).toFixed(2),
      maxMemoryMB: (this.#maxMemoryUsage / 1024 / 1024).toFixed(2),
      memoryUtilization: ((this.#memoryUsage / this.#maxMemoryUsage) * 100).toFixed(1),
      totalFramesCreated: this.#frameCounter
    };
  }


  /**
   * Get frames that are candidates for cleanup
   * @returns {Array} Array of frame objects that can be cleaned up
   */
  getCleanupCandidates() {
    const now = performance.now();
    const candidates = [];

    for (const frame of this.#activeFrames) {
      const frameAge = now - frame.lastAccessed;
      const isOld = frameAge > 1000; // 1 second old
      const isSafeToRelease = frame.refCount === 1 && !frame.inUse;
      
      if (isOld && isSafeToRelease) {
        candidates.push({
          id: frame.id,
          age: frameAge,
          size: frame.size,
          refCount: frame.refCount
        });
      }
    }

    return candidates.sort((a, b) => b.age - a.age); // Oldest first
  }

  /**
   * Monitor memory usage and trigger warnings
   * @private
   */
  #monitorMemory() {
    const utilizationPercent = (this.#memoryUsage / this.#maxMemoryUsage) * 100;
    
    if (utilizationPercent > 80 && this.#onMemoryWarning) {
      this.#onMemoryWarning({
        type: 'high_usage',
        utilization: utilizationPercent,
        currentUsage: this.#memoryUsage,
        maxUsage: this.#maxMemoryUsage
      });
    }
  }
}

// Make the class available globally for worker
globalThis.FrameBufferManager = FrameBufferManager;
