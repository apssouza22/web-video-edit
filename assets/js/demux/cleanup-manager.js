/**
 * CleanupManager - Global cleanup utility for managing resource cleanup
 * Ensures all VideoFrames and workers are properly cleaned up on page unload
 */
class CleanupManager {
  #cleanupTasks = new Set();
  #isSetup = false;
  #isCleaningUp = false;

  constructor() {
    this.#setupGlobalHandlers();
  }

  /**
   * Setup global cleanup handlers
   * @private
   */
  #setupGlobalHandlers() {
    if (this.#isSetup) return;

    // Handle page unload events
    window.addEventListener('beforeunload', () => {
      this.#performCleanup();
    });

    window.addEventListener('unload', () => {
      this.#performCleanup();
    });

    // Handle page visibility changes (mobile browsers)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.#performCleanup();
      }
    });

    // Handle browser tab close
    window.addEventListener('pagehide', () => {
      this.#performCleanup();
    });

    this.#isSetup = true;
    console.log('CleanupManager: Global cleanup handlers setup complete');
  }

  /**
   * Register a cleanup task
   * @param {Function} cleanupFn - Cleanup function to execute
   * @param {string} name - Name for the cleanup task (for debugging)
   */
  registerCleanupTask(cleanupFn, name = 'unnamed') {
    if (typeof cleanupFn !== 'function') {
      console.warn('CleanupManager: Invalid cleanup function provided');
      return;
    }

    const task = {
      fn: cleanupFn,
      name: name,
      registered: Date.now()
    };

    this.#cleanupTasks.add(task);
    console.log(`CleanupManager: Registered cleanup task '${name}'`);
  }

  /**
   * Unregister a cleanup task
   * @param {Function} cleanupFn - Cleanup function to remove
   */
  unregisterCleanupTask(cleanupFn) {
    for (const task of this.#cleanupTasks) {
      if (task.fn === cleanupFn) {
        this.#cleanupTasks.delete(task);
        console.log(`CleanupManager: Unregistered cleanup task '${task.name}'`);
        break;
      }
    }
  }

  /**
   * Perform all registered cleanup tasks
   * @private
   */
  #performCleanup() {
    if (this.#isCleaningUp) {
      console.log('CleanupManager: Cleanup already in progress');
      return;
    }

    this.#isCleaningUp = true;
    console.log(`CleanupManager: Starting cleanup of ${this.#cleanupTasks.size} tasks`);

    const startTime = performance.now();
    let completedTasks = 0;
    let failedTasks = 0;

    // Execute all cleanup tasks
    for (const task of this.#cleanupTasks) {
      try {
        console.log(`CleanupManager: Executing cleanup task '${task.name}'`);
        task.fn();
        completedTasks++;
      } catch (error) {
        console.error(`CleanupManager: Error in cleanup task '${task.name}':`, error);
        failedTasks++;
      }
    }

    const duration = performance.now() - startTime;
    console.log(`CleanupManager: Cleanup completed in ${duration.toFixed(2)}ms - ${completedTasks} successful, ${failedTasks} failed`);

    // Clear all tasks after cleanup
    this.#cleanupTasks.clear();
  }

  /**
   * Force immediate cleanup (for manual cleanup)
   */
  forceCleanup() {
    console.log('CleanupManager: Force cleanup requested');
    this.#performCleanup();
  }

  /**
   * Get cleanup statistics
   * @returns {Object} Cleanup statistics
   */
  getStats() {
    return {
      registeredTasks: this.#cleanupTasks.size,
      isSetup: this.#isSetup,
      isCleaningUp: this.#isCleaningUp,
      tasks: Array.from(this.#cleanupTasks).map(task => ({
        name: task.name,
        registered: task.registered
      }))
    };
  }

  /**
   * Register a CodecDemuxer for cleanup
   * @param {CodecDemuxer} demuxer - Demuxer instance
   */
  registerDemuxer(demuxer) {
    this.registerCleanupTask(() => {
      if (demuxer && typeof demuxer.cleanup === 'function') {
        demuxer.cleanup();
      }
    }, 'CodecDemuxer');
  }

  /**
   * Register a worker for cleanup
   * @param {Worker} worker - Worker instance
   * @param {string} name - Worker name
   */
  registerWorker(worker, name = 'Worker') {
    this.registerCleanupTask(() => {
      if (worker) {
        try {
          worker.postMessage({ task: 'cleanup' });
          setTimeout(() => {
            worker.terminate();
          }, 500);
        } catch (error) {
          console.warn(`CleanupManager: Error cleaning up worker '${name}':`, error);
        }
      }
    }, `Worker-${name}`);
  }

  /**
   * Register VideoFrames for cleanup
   * @param {Array<VideoFrame>} frames - Array of VideoFrame objects
   * @param {string} name - Name for the frame collection
   */
  registerFrames(frames, name = 'VideoFrames') {
    this.registerCleanupTask(() => {
      if (Array.isArray(frames)) {
        let closedCount = 0;
        frames.forEach((frame, index) => {
          try {
            if (frame && typeof frame.close === 'function' && frame.format !== null) {
              frame.close();
              closedCount++;
            }
          } catch (error) {
            console.debug(`CleanupManager: Frame ${index} already closed:`, error.message);
          }
        });
        console.log(`CleanupManager: Closed ${closedCount} frames from '${name}'`);
      }
    }, `Frames-${name}`);
  }
}

// Create global instance
const cleanupManager = new CleanupManager();

// Make available globally
globalThis.CleanupManager = CleanupManager;
globalThis.cleanupManager = cleanupManager;
