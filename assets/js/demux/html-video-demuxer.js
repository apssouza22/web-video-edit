import {addElementToBackground} from '../layer/layer-common.js';
import {fps, dpr} from '../constants.js';
import {FrameCollection} from '../frame';

export class HTMLVideoDemuxer {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 30;
    this.optimizedFPS = options.optimizedFPS || 12;
    this.video = null;
    this.fileSrc = null;
    this.onProgressCallback = null;
    this.onCompleteCallback = null;
    this.onMetadataCallback = null;
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
   * @param {string} fileSrc - Video file source URL
   * @param {HTMLCanvasElement} canvas - Canvas for rendering
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {CanvasRenderingContext2D} thumbCtx - Thumbnail context
   */
  initialize(fileSrc, canvas, ctx, thumbCtx) {
    this.fileSrc = fileSrc;
    this.canvas = canvas;
    this.ctx = ctx;
    this.thumbCtx = thumbCtx;
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

        // Draw the video frame to canvas
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Update thumbnail
        this.thumbCtx.canvas.width = this.thumbCtx.canvas.clientWidth * dpr;
        this.thumbCtx.canvas.height = this.thumbCtx.canvas.clientHeight * dpr;
        this.thumbCtx.clearRect(0, 0, this.thumbCtx.canvas.clientWidth, this.thumbCtx.canvas.clientHeight);
        this.thumbCtx.scale(dpr, dpr);
        this.thumbCtx.drawImage(this.canvas, 0, 0);

        const frame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
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
    const duration = this.video.duration;
    const totalFrames = Math.floor(duration * fps);

    // Smart frame sampling - extract fewer frames initially
    const optimizedTotalFrames = Math.floor(duration * actualFps);

    const chunks = Math.ceil(optimizedTotalFrames / this.chunkSize);
    const frameInterval = duration / optimizedTotalFrames;
    console.log(`Processing ${optimizedTotalFrames} frames in ${chunks} chunks...`);

    const allFrames = [];

    for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
      const startFrame = chunkIndex * this.chunkSize;
      const endFrame = Math.min(startFrame + this.chunkSize, optimizedTotalFrames);

      console.log(`Processing chunk ${chunkIndex + 1}/${chunks} (frames ${startFrame}-${endFrame})`);
      const chunkFrames = await this.#processFramesInParallel(startFrame, endFrame, frameInterval);
      this.#updateFrameCollection(chunkFrames, startFrame, optimizedTotalFrames, allFrames);

      // Add a small delay between chunks to prevent blocking
      if (chunkIndex < chunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    const finalFrames = this.#fillMissingFrames(totalFrames, optimizedTotalFrames, allFrames);
    
    if (this.onCompleteCallback) {
      this.onCompleteCallback(finalFrames);
    }

    this.cleanup();
    console.log(`Video processing complete. Extracted ${finalFrames.length} frames.`);
  }

  #updateFrameCollection(chunkFrames, startFrame, targetFrameCount, allFrames) {
    for (let j = 0; j < chunkFrames.length; j++) {
      const result = chunkFrames[j];
      const frameIndex = startFrame + j;

      if (result.status === 'fulfilled' && result.value) {
        allFrames[frameIndex] = result.value;
      } else {
        // Add a placeholder or duplicate previous frame
        if (allFrames.length > 0) {
          const lastFrame = allFrames[allFrames.length - 1];
          allFrames[frameIndex] = lastFrame;
        }
      }

      const progress = ((startFrame + j + 1) / targetFrameCount * 100).toFixed(2);
      if (this.onProgressCallback) {
        this.onProgressCallback(parseFloat(progress));
      }
    }
  }

  async #processFramesInParallel(startFrame, endFrame, frameInterval) {
    // This parallel processing is not working due to the limitations of HTMLVideoElement
    // Without await the seek will return the same frame
    const framePromises = [];
    for (let i = startFrame; i < endFrame; i++) {
      const time = i * frameInterval;
      framePromises.push(await this.#seekWithTimeout(time));
    }
    return await Promise.allSettled(framePromises);
  }

  #fillMissingFrames(totalFrames, extractedFrames, frames) {
    if (extractedFrames >= totalFrames) {
      return frames.slice(0, totalFrames);
    }

    // Interpolate or duplicate frames to reach target frame count
    const ratio = extractedFrames / totalFrames;
    const finalFrames = [];

    for (let i = 0; i < totalFrames; i++) {
      const sourceIndex = Math.floor(i * ratio);
      const clampedIndex = Math.min(sourceIndex, frames.length - 1);
      finalFrames.push(frames[clampedIndex]);
    }

    return finalFrames;
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
    if (this.video) {
      console.log('Upgrading video quality...');
      await this.#convertToArrayBufferOptimized(fps);
    }
  }
} 