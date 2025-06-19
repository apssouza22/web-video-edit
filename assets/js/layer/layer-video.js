import {StandardLayer, addElementToBackground} from './layer-common.js';
import {FrameCollection} from '../frame';
import {fps, max_size, dpr} from '../constants.js';
import {DemuxHandler} from "../demux/demux.js";

export class VideoLayer extends StandardLayer {


  constructor(file, skipLoading = false) {
    super(file);
    this.framesCollection = new FrameCollection(0, 0, false);
    this.useWebCodecs = this.#checkWebCodecsSupport();
    this.chunkSize = 30; // Process 30 frames at a time
    this.optimizedFPS = 12;
    this.demuxHandler = new DemuxHandler();
    this.demuxHandler.addOnUpdateListener(this.#demuxUpdateListener.bind(this));

    // Empty VideoLayers (split() requires this)
    if (skipLoading) {
      return;
    }

    this.#readFile(file);
  }

  #demuxUpdateListener(message) {
    const data = message.data

    for (const key in data) {
      if (key === "onReady") {
        console.log("onReady", data[key]);
        let width = data[key].video.width;
        let height = data[key].video.height;
        let dur = data[key].duration;
        this.totalTimeInMilSeconds = dur * 1000;
        this.expectedTotalFrames = data[key].totalFrames || Math.ceil(dur * fps);
        this.framesCollection = new FrameCollection(this.totalTimeInMilSeconds, this.start_time, false);
        this.#setSize(dur, width, height);
        this.#handleVideoRatio();
      }

      if(key === "onFrame"){
        const frameData = data[key];
        
        // Convert VideoFrame to ImageData if needed
        // You can choose to store as ImageData for consistency
        const frame = this.#convertVideoFrameToImageData(frameData.frame);
        this.framesCollection.push(frame);

         // Use the isLastFrame flag to determine completion
        if (frameData.isLastFrame) {
          console.log("Last frame received! Processing complete.");
          console.log(`Processed ${frameData.frameNumber}/${frameData.totalFrames} frames`);
          this.loadUpdateListener(this, 100, this.ctx, null);
          this.ready = true;
        } else {
          // Update progress based on frame count
          const progress = Math.min(95, (frameData.frameNumber / frameData.totalFrames) * 100);
          this.loadUpdateListener(this, progress, this.ctx, null);
        }
      }
      
      if(key === "onComplete") {
        console.log("Demux completed:", data[key]);
        // Additional completion handling if needed
      }
    }
  }

  #setSize(dur, width, height) {
    let size = fps * dur * width * height;
    if (size < max_size) {
      this.width = width;
      this.height = height;
    } else {
      let scale = Math.sqrt(size / max_size);
      this.width = Math.floor(width / scale);
      this.height = Math.floor(height / scale);
    }
  }

  #checkWebCodecsSupport() {
    return typeof VideoDecoder !== 'undefined' &&
        typeof VideoFrame !== 'undefined' &&
        typeof EncodedVideoChunk !== 'undefined';
  }

  async #initializeWithWebCodecs(file) {
    try {
      await this.#processVideoWithWebCodecs();
      // this.#initializeWithHTMLVideo();
    } catch (error) {
      console.warn('WebCodecs failed, falling back to HTML video:', error);
      this.#initializeWithHTMLVideo();
    }
  }

  #initializeWithHTMLVideo() {
    /**
     * @type {HTMLVideoElement}
     */
    this.video = document.createElement('video');
    this.video.setAttribute('autoplay', false);
    this.video.setAttribute('loop', false);
    this.video.setAttribute('playsinline', true);
    this.video.setAttribute('muted', true);
    this.video.setAttribute('preload', 'metadata');
    addElementToBackground(this.video);
    this.video.addEventListener('loadedmetadata', this.#onLoadMetadata.bind(this));
    this.video.src = this.fileSrc
  }

  #readFile(file) {
    this.reader = new FileReader();
    this.reader.addEventListener("load", (function () {
      this.fileSrc = this.reader.result;
      if (this.useWebCodecs && file.type.startsWith('video/')) {
        this.#initializeWithWebCodecs(file).then(r => {
        });
      } else {
        this.#initializeWithHTMLVideo(file);
      }
    }).bind(this), false);

    this.reader.readAsDataURL(file);
  }

  async #processVideoWithWebCodecs() {
    this.demuxHandler.start(await this.file.arrayBuffer(), "2d");
  }

  /**
   * Removes a video interval by removing frames from the layer
   * @param {number} startTime - Start time in seconds to remove
   * @param {number} endTime - End time in seconds to remove
   * @returns {boolean} True if the interval was removed successfully
   */
  removeInterval(startTime, endTime) {
    const success = this.framesCollection.removeInterval(startTime, endTime);
    if (success) {
      this.totalTimeInMilSeconds = this.framesCollection.getTotalTimeInMilSec();
    }
    return success;
  }

  async #onLoadMetadata() {
    let width = this.video.videoWidth;
    let height = this.video.videoHeight;
    let dur = this.video.duration;
    this.totalTimeInMilSeconds = dur * 1000;
    this.framesCollection = new FrameCollection(this.totalTimeInMilSeconds, this.start_time, false);

    this.#setSize(dur, width, height);
    this.#handleVideoRatio();
    await this.#convertToArrayBufferOptimized();
  }

  #handleVideoRatio() {
    const playerRatio = this.canvas.width / this.canvas.height;
    const videoRatio = this.width / this.height;
    if (videoRatio > playerRatio) {
      let scale = videoRatio / playerRatio;
      this.height *= scale;
    } else {
      let scale = playerRatio / videoRatio;
      this.width *= scale;
    }
    this.canvas.height = this.height;
    this.canvas.width = this.width;
  }

  async #seekWithTimeout(time, timeout = 500) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Seek timeout for time ${time}`));
      }, timeout);

      const onSeeked = () => {
        clearTimeout(timeoutId);
        this.video.removeEventListener('seeked', onSeeked);

        this.drawScaled(this.video, this.ctx, true);
        this.thumb_ctx.canvas.width = this.thumb_ctx.canvas.clientWidth * dpr;
        this.thumb_ctx.canvas.height = this.thumb_ctx.canvas.clientHeight * dpr;
        this.thumb_ctx.clearRect(0, 0, this.thumb_ctx.canvas.clientWidth, this.thumb_ctx.canvas.clientHeight);
        this.thumb_ctx.scale(dpr, dpr);
        this.drawScaled(this.ctx, this.thumb_ctx);

        let frame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        resolve(frame);
      };

      this.video.addEventListener('seeked', onSeeked, {once: true});
      this.video.currentTime = time;
      this.video.pause();
    });
  }

  async #convertToArrayBufferOptimized(optimizedFps = 12) {
    this.video.pause();
    const duration = this.video.duration;
    const totalFrames = Math.floor(duration * fps);

    // Smart frame sampling - extract fewer frames initially
    const optimizedTotalFrames = Math.floor(duration * optimizedFps);

    const chunks = Math.ceil(optimizedTotalFrames / this.chunkSize);
    const frameInterval = duration / optimizedTotalFrames;
    console.log(`Processing ${optimizedTotalFrames} frames in ${chunks} chunks...`);

    for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
      const startFrame = chunkIndex * this.chunkSize;
      const endFrame = Math.min(startFrame + this.chunkSize, optimizedTotalFrames);

      console.log(`Processing chunk ${chunkIndex + 1}/${chunks} (frames ${startFrame}-${endFrame})`);
      const chunkFrames = await this.#processFramesInParallel(startFrame, endFrame, frameInterval);
      this.#updateFrameCollection(chunkFrames, startFrame, optimizedTotalFrames);

      // Add a small delay between chunks to prevent blocking
      if (chunkIndex < chunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    this.#fillMissingFrames(totalFrames, optimizedTotalFrames);
    this.loadUpdateListener(this, 100, this.ctx, null);
    this.ready = true;
    if (optimizedFps < fps) {
      // await this.upgradeQuality()
    }
    this.video.remove();
    this.video = null;

    console.log(`Video processing complete. Extracted ${this.framesCollection.frames.length} frames.`);
  }

  #updateFrameCollection(chunkFrames, startFrame, targetFrameCount) {
    for (let j = 0; j < chunkFrames.length; j++) {
      const result = chunkFrames[j];
      const frameIndex = startFrame + j;

      if (result.status === 'fulfilled' && result.value) {
        this.framesCollection.update(frameIndex, result.value);
      } else {
        // Add a placeholder or duplicate previous frame
        if (this.framesCollection.frames.length > 0) {
          const lastFrame = this.framesCollection.frames[this.framesCollection.frames.length - 1];
          this.framesCollection.update(frameIndex, lastFrame);
        }
      }

      const progress = ((startFrame + j + 1) / targetFrameCount * 100).toFixed(2);
      this.loadUpdateListener(this, progress, this.ctx);
    }
  }

  async #processFramesInParallel(startFrame, endFrame, frameInterval) {
    // This parallel processing is not working due to the limitations of HTMLVideoElement
    // Without await the seek will return the same frame
    //TODO: Try web codec API for better performance
    const framePromises = [];
    for (let i = startFrame; i < endFrame; i++) {
      const time = i * frameInterval;
      framePromises.push(await this.#seekWithTimeout(time));
    }
    return await Promise.allSettled(framePromises);
  }

  #fillMissingFrames(totalFrames, extractedFrames) {
    if (extractedFrames >= totalFrames) {
      return;
    }

    // Interpolate or duplicate frames to reach target frame count
    const ratio = extractedFrames / totalFrames;
    const originalFrames = this.framesCollection.copy();
    this.framesCollection.frames = [];

    for (let i = 0; i < totalFrames; i++) {
      const sourceIndex = Math.floor(i * ratio);
      const clampedIndex = Math.min(sourceIndex, originalFrames.length - 1);
      this.framesCollection.frames.push(originalFrames[clampedIndex]);
    }
  }

  render(ctxOut, currentTime, playing = false) {
    if (!this.ready) {
      return;
    }
    if (!this.isLayerVisible(currentTime)) {
      return;
    }

    // Check if we need to re-render this frame
    if (!this.shouldRender(currentTime, playing)) {
      this.drawScaled(this.ctx, ctxOut);
      return;
    }

    let index = this.framesCollection.getIndex(currentTime, this.start_time);
    if (index < 0 || index >= this.framesCollection.getLength()) {
      return;
    }

    const frame = this.framesCollection.frames[index];
    if (frame instanceof ImageData) {
      this.ctx.putImageData(frame, 0, 0);
      this.drawScaled(this.ctx, ctxOut);
      this.updateRenderCache(currentTime, playing);
      return;
    }

    // Legacy support for VideoFrame objects (if any remain unconverted)
    if(frame instanceof VideoFrame) {
      // Convert VideoFrame to ImageData on-the-fly if needed
      const imageData = this.#convertVideoFrameToImageData(frame);
      this.ctx.putImageData(imageData, 0, 0);
      this.drawScaled(this.ctx, ctxOut);
      this.updateRenderCache(currentTime, playing);
    }
  }

  // Method to upgrade video quality on demand
  async upgradeQuality() {
    if (this.video) {
      console.log('Upgrading video quality...');
      // Re-process with higher frame rate or quality
      await this.#convertToArrayBufferOptimized(fps);
    }
  }

  /**
   * Converts a VideoFrame to ImageData
   * @param {VideoFrame} videoFrame - The VideoFrame to convert
   * @returns {ImageData} The converted ImageData
   */
  #convertVideoFrameToImageData(videoFrame) {
    // Create a temporary canvas for conversion
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Set canvas dimensions to match this layer's canvas size
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    
    // Draw the VideoFrame scaled to fit the canvas dimensions
    tempCtx.drawImage(videoFrame, 0, 0, this.canvas.width, this.canvas.height);
    
    // Extract ImageData from the canvas
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    videoFrame.close();
    
    return imageData;
  }

}
