import {addElementToBackground} from '../layer/index.js';
import {fps} from '../constants.js';
import{Canvas2DRender} from "../common/render-2d.js";
import {FrameQuality, FrameMetadata} from '../frame/frame-quality.js';

export class HTMLVideoDemuxer {
  constructor() {
    this.chunkSize =  30;
    this.optimizedFPS = 12;
    this.video = null;
    this.fileSrc = null;
    this.onProgressCallback = null;
    this.onCompleteCallback = null;
    this.onMetadataCallback = null;
    this.onQualityUpgradeCallback = null;
    this.isUpgrading = false;
    this.frameMetadata = [];
  }

  /**
   * Set callback for progress updates
   * @param {Function} callback - Progress callback function
   */
  setOnProgressCallback(callback) {
    this.onProgressCallback = callback;
  }

  /**
   * Set callback for completion
   * @param {Function} callback - Completion callback function
   */
  setOnCompleteCallback(callback) {
    this.onCompleteCallback = callback;
  }

  /**
   * Set callback for metadata loading
   * @param {Function} callback - Metadata callback function
   */
  setOnMetadataCallback(callback) {
    this.onMetadataCallback = callback;
  }

  /**
   * Set callback for quality upgrade progress
   * @param {Function} callback - Quality upgrade callback function
   */
  setOnQualityUpgradeCallback(callback) {
    this.onQualityUpgradeCallback = callback;
  }

  /**
   * Initialize HTML video processing
   * @param {string} fileSrc - Video file source URL
   * @param {Canvas2DRender} renderer - Renderer
   */
  initialize(fileSrc, renderer) {
    this.fileSrc = fileSrc;
    this.renderer = renderer;
    this.#createVideoElement();
  }

  #createVideoElement() {
    this.video = document.createElement('video');
    this.video.setAttribute('autoplay', false);
    this.video.setAttribute('loop', false);
    this.video.setAttribute('playsinline', true);
    this.video.setAttribute('muted', true);
    this.video.setAttribute('preload', 'metadata');
    addElementToBackground(this.video);
    this.video.addEventListener('loadedmetadata', this.#onLoadMetadata.bind(this));
    this.video.src = this.fileSrc;
  }

  async #onLoadMetadata() {
    const width = this.video.videoWidth;
    const height = this.video.videoHeight;
    const duration = this.video.duration;
    console.log(`Video metadata loaded: ${width}x${height}, duration: ${duration}s`);

    const totalFramesTarget = Math.floor(duration * fps);
    this.frameMetadata = [];
    for (let i = 0; i < totalFramesTarget; i++) {
      const timestamp = i / fps;
      this.frameMetadata.push(new FrameMetadata(null, FrameQuality.EMPTY, timestamp));
    }
    
    if (this.onMetadataCallback) {
      this.onMetadataCallback({
        width,
        height,
        duration,
        totalTimeInMilSeconds: duration * 1000
      });
    }

    await this.#convertToArrayBufferOptimized();
  }

  async #seekWithTimeout(time, timeout = 500) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Seek timeout for time ${time}`));
      }, timeout);

      const onSeeked = () => {
        clearTimeout(timeoutId);
        this.video.removeEventListener('seeked', onSeeked);
        Canvas2DRender.drawScaled(this.video, this.renderer.context, true);
        const frame = this.renderer.getImageData(0, 0);
        resolve(frame);
      };

      this.video.addEventListener('seeked', onSeeked, {once: true});
      this.video.currentTime = time;
      this.video.pause();
    });
  }

  async #convertToArrayBufferOptimized(optimizedFps = null) {
    const actualFps = optimizedFps || this.optimizedFPS;
    const isUpgradePhase = optimizedFps && optimizedFps > this.optimizedFPS;
    
    this.video.pause();
    const duration = this.video.duration;
    
    if (isUpgradePhase) {
      console.log('Starting quality upgrade to full FPS...');
      this.isUpgrading = true;
      await this.#upgradeFrameQuality();
    } else {
      console.log(`Starting initial load at ${actualFps} FPS...`);
      await this.#loadInitialFrames(actualFps, duration);
    }
  }

  /**
   * Load initial frames at reduced FPS for immediate playback
   */
  async #loadInitialFrames(targetFps, duration) {
    const frameInterval = 1 / targetFps;
    const optimizedFrameCount = Math.floor(duration * targetFps);
    const chunks = Math.ceil(optimizedFrameCount / this.chunkSize);
    
    console.log(`Loading ${optimizedFrameCount} initial frames in ${chunks} chunks...`);

    for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
      const startFrame = chunkIndex * this.chunkSize;
      const endFrame = Math.min(startFrame + this.chunkSize, optimizedFrameCount);

      console.log(`Processing initial chunk ${chunkIndex + 1}/${chunks} (frames ${startFrame}-${endFrame})`);
      await this.#processInitialFrameChunk(startFrame, endFrame, frameInterval, targetFps);

      // Add a small delay between chunks to prevent blocking
      if (chunkIndex < chunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    this.#fillInterpolatedFrames();
    const legacyFrames = this.#convertToLegacyFormat();

    this.onCompleteCallback(legacyFrames);
    console.log(`Initial video processing complete. Loaded ${optimizedFrameCount} frames at ${targetFps} FPS.`);
    
    // Start background upgrade after a short delay
    setTimeout(() => this.#startBackgroundUpgrade(), 1000);
  }

  /**
   * Process a chunk of initial frames
   */
  async #processInitialFrameChunk(startFrame, endFrame, frameInterval, targetFps) {
    for (let i = startFrame; i < endFrame; i++) {
      const time = i * frameInterval;
      const targetIndex = Math.floor(time * fps); // Map to full FPS index
      
      try {
        const frameData = await this.#seekWithTimeout(time);
        if (frameData && targetIndex < this.frameMetadata.length) {
          this.frameMetadata[targetIndex].data = frameData;
          this.frameMetadata[targetIndex].quality = FrameQuality.LOW_RES;
          this.frameMetadata[targetIndex].timestamp = time;
        }
      } catch (error) {
        console.warn(`Failed to extract frame at ${time}s:`, error);
      }

      // Update progress
      const progress = ((i + 1) / Math.floor(this.video.duration * targetFps) * 100);
      if (this.onProgressCallback) {
        this.onProgressCallback(Math.min(progress, 100));
      }
    }
  }

  /**
   * Fill gaps between extracted frames with interpolated references
   */
  #fillInterpolatedFrames() {
    let lastRealFrameIndex = -1;
    
    for (let i = 0; i < this.frameMetadata.length; i++) {
      const frame = this.frameMetadata[i];
      
      if (frame.hasRealData()) {
        lastRealFrameIndex = i;
      } else if (lastRealFrameIndex >= 0) {
        // Mark as interpolated and point to nearest real frame
        frame.quality = FrameQuality.INTERPOLATED;
        frame.sourceIndex = lastRealFrameIndex;
      }
    }
  }

  /**
   * Convert frame metadata to legacy format for compatibility
   */
  #convertToLegacyFormat() {
    return this.frameMetadata.map(frameMetadata => {
      return frameMetadata.getDisplayData(this.frameMetadata);
    }).filter(data => data !== null);
  }

  /**
   * Start background quality upgrade
   */
  async #startBackgroundUpgrade() {
    if (this.isUpgrading) return;
    
    console.log('Starting background quality upgrade...');
    this.isUpgrading = true;
    this.onQualityUpgradeCallback({ phase: 'start', progress: 0 });
    await this.#upgradeFrameQuality();
  }

  /**
   * Upgrade frame quality by filling missing frames
   */
  async #upgradeFrameQuality() {
    const framesToUpgrade = this.frameMetadata
      .map((frame, index) => ({ frame, index }))
      .filter(({ frame }) => frame.needsUpgrade());
    
    if (framesToUpgrade.length === 0) {
      console.log('No frames need quality upgrade');
      this.isUpgrading = false;
      return;
    }
    
    console.log(`Upgrading ${framesToUpgrade.length} frames to full quality...`);
    
    const chunks = Math.ceil(framesToUpgrade.length / this.chunkSize);
    
    for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
      const startIdx = chunkIndex * this.chunkSize;
      const endIdx = Math.min(startIdx + this.chunkSize, framesToUpgrade.length);
      
      console.log(`Upgrading chunk ${chunkIndex + 1}/${chunks}`);
      
      for (let i = startIdx; i < endIdx; i++) {
        const { frame, index } = framesToUpgrade[i];
        const timestamp = index / fps;
        
        try {
          const frameData = await this.#seekWithTimeout(timestamp);
          if (frameData) {
            frame.data = frameData;
            frame.quality = FrameQuality.HIGH_RES;
            frame.timestamp = timestamp;
            frame.sourceIndex = null; // No longer needs interpolation
          }
        } catch (error) {
          console.warn(`Failed to upgrade frame at ${timestamp}s:`, error);
        }

        const progress = ((i + 1) / framesToUpgrade.length * 100);
        this.onQualityUpgradeCallback({ phase: 'progress', progress });
      }
      
      // Small delay between chunks
      if (chunkIndex < chunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    this.isUpgrading = false;
    console.log('Quality upgrade completed');
    
    this.onQualityUpgradeCallback({ phase: 'complete', progress: 100 });
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.video) {
      this.video.remove();
      this.video = null;
    }
  }

  /**
   * Upgrade video quality by re-processing with higher frame rate
   */
  async upgradeQuality() {
    if (this.isUpgrading) {
      console.log('Quality upgrade already in progress');
      return;
    }
    
    if (!this.video || this.frameMetadata.length === 0) {
      console.warn('Cannot upgrade quality: video not loaded');
      return;
    }
    await this.#startBackgroundUpgrade();
  }

  /**
   * Get current loading statistics
   */
  getLoadingStats() {
    if (this.frameMetadata.length === 0) {
      return { total: 0, lowRes: 0, highRes: 0, interpolated: 0, empty: 0 };
    }
    
    const stats = {
      total: this.frameMetadata.length,
      lowRes: 0,
      highRes: 0,
      interpolated: 0,
      empty: 0
    };
    
    this.frameMetadata.forEach(frame => {
      switch (frame.quality) {
        case FrameQuality.LOW_RES:
          stats.lowRes++;
          break;
        case FrameQuality.HIGH_RES:
          stats.highRes++;
          break;
        case FrameQuality.INTERPOLATED:
          stats.interpolated++;
          break;
        case FrameQuality.EMPTY:
          stats.empty++;
          break;
      }
    });
    
    return stats;
  }
} 