import {addElementToBackground} from '../layer/index.js';
import {fps} from '../constants.js';
import{Canvas2DRender} from "../common/render-2d.js";
import {FrameQuality, FrameMetadata} from './frame-quality.js';

export class HTMLVideoDemuxer {
  constructor() {
    this.chunkSize =  30;
    this.optimizedFPS = 12;
    this.video = null;
    this.fileSrc = null;
    this.onProgressCallback = null;
    this.onCompleteCallback = (frames) => {};
    this.onMetadataCallback = null;
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
   * Initialize HTML video processing
   * @param {File} file - Video file source URL
   * @param {Canvas2DRender} renderer - Renderer
   */
  initialize(file, renderer) {
    this.fileSrc = file.uri;
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
    this.video.pause();
    await this.#loadInitialFrames(actualFps, this.video.duration);
  }

  /**
   * Load initial frames at reduced FPS for immediate playback
   */
  async #loadInitialFrames(targetFps, duration) {
    const frameInterval = 1 / targetFps;
    const optimizedFrameCount = Math.floor(duration * targetFps);
    const chunks = Math.ceil(optimizedFrameCount / this.chunkSize);
    
    console.log(`Loading ${optimizedFrameCount} initial frames in ${chunks} chunks...`);
    const startTime = Date.now();
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
    this.onCompleteCallback(this.#convertToLegacyFormat());
    const elapsed = Date.now() - startTime;
    console.log('Initial video processing complete. Took', elapsed/1000, 'seconds ')
    setTimeout(() => this.#startBackgroundUpgrade(), 1000);
  }
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
      const progress = ((i + 1) / Math.floor(this.video.duration * targetFps) * 100);
      this.onProgressCallback(Math.min(progress, 100));
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

  #convertToLegacyFormat() {
    return this.frameMetadata.map(frameMetadata => {
      return frameMetadata.getDisplayData(this.frameMetadata);
    }).filter(data => data !== null);
  }

  async #startBackgroundUpgrade() {
    if (this.isUpgrading) return;
    console.log('Starting background quality upgrade... Status: ', this.#getLoadingStats());
    this.isUpgrading = true;
    const now = Date.now();
    await this.#upgradeFrameQuality();
    const elapsed = Date.now() - now;
    this.onCompleteCallback(this.#convertToLegacyFormat());
    this.#cleanup()
    console.log('Finished background quality upgrade. Took', elapsed/1000, 'ms. ');
  }

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
      await this.#chunkUpgrade(startIdx, endIdx, framesToUpgrade);

      if (chunkIndex < chunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    this.isUpgrading = false;
  }
  async #chunkUpgrade(startIdx, endIdx, framesToUpgrade) {
    for (let i = startIdx; i < endIdx; i++) {
      const {frame, index} = framesToUpgrade[i];
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
    }
  }
  #cleanup() {
    if (this.video) {
      this.video.remove();
      this.video = null;
    }
    this.frameMetadata = null;
  }
  #getLoadingStats() {
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