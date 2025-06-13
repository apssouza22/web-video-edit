import { StandardLayer, addElementToBackground } from './layer-common.js';
import { FrameCollection } from './frames.js';
import { fps, max_size, dpr } from '../constants.js';

export class VideoLayer extends StandardLayer {
  constructor(file, skipLoading = false) {
    super(file);
    this.framesCollection = new FrameCollection(0, 0, false);

    // Empty VideoLayers (split() requires this)
    if (skipLoading) {
      return;
    }
    /**
     * @type {HTMLVideoElement}
     */
    this.video = document.createElement('video');
    this.video.setAttribute('autoplay', true);
    this.video.setAttribute('loop', true);
    this.video.setAttribute('playsinline', true);
    this.video.setAttribute('muted', true);
    this.video.setAttribute('controls', true);
    addElementToBackground(this.video);

    this.reader = new FileReader();
    this.reader.addEventListener("load", (function () {
      this.video.addEventListener('loadedmetadata', this.#onLoadMetadata.bind(this));
      this.video.src = this.reader.result;
    }).bind(this), false);
    this.reader.readAsDataURL(file);
  }

  /**
   * Removes a video interval by removing frames from the layer
   * @param {number} startTime - Start time in seconds to remove
   * @param {number} endTime - End time in seconds to remove
   * @returns {boolean} True if the interval was removed successfully
   */
  removeInterval(startTime, endTime) {
    if (!this.framesCollection || startTime >= endTime || startTime < 0) {
      console.error('Invalid parameters for removeInterval on VideoLayer');
      return false;
    }

    const totalDuration = this.totalTimeInMilSeconds / 1000;
    
    // Clamp times to valid ranges
    const clampedStartTime = Math.max(0, Math.min(startTime, totalDuration));
    const clampedEndTime = Math.max(clampedStartTime, Math.min(endTime, totalDuration));
    
    // Convert time to frame indices
    const startFrameIndex = Math.floor(clampedStartTime * fps);
    const endFrameIndex = Math.ceil(clampedEndTime * fps);
    
    // Clamp to valid frame ranges
    const totalFrames = this.framesCollection.getLength();
    const clampedStartFrame = Math.max(0, Math.min(startFrameIndex, totalFrames));
    const clampedEndFrame = Math.max(clampedStartFrame, Math.min(endFrameIndex, totalFrames));
    
    const framesToRemove = clampedEndFrame - clampedStartFrame;
    
    if (framesToRemove <= 0) {
      console.log(`No frames to remove from video layer: "${this.name}"`);
      return false;
    }
    
    if (framesToRemove >= totalFrames) {
      console.warn(`Removing interval would result in empty video layer: "${this.name}"`);
      // Keep at least one frame to avoid empty layer
      this.framesCollection.slice(1, totalFrames - 1);
      this.totalTimeInMilSeconds = 1000 / fps; // Duration of one frame
      return true;
    }
    
    // Remove the frames from the collection
    this.framesCollection.slice(clampedStartFrame, framesToRemove);
    
    // Update the total time
    const removedDuration = (clampedEndTime - clampedStartTime) * 1000;
    this.totalTimeInMilSeconds = Math.max(0, this.totalTimeInMilSeconds - removedDuration);
    
    console.log(`Removed video interval ${clampedStartTime}s-${clampedEndTime}s from "${this.name}". Removed ${framesToRemove} frames. New duration: ${this.totalTimeInMilSeconds / 1000}s`);
    
    return true;
  }

  async #onLoadMetadata() {
    let width = this.video.videoWidth;
    let height = this.video.videoHeight;
    let dur = this.video.duration;
    this.totalTimeInMilSeconds = dur * 1000;
    this.framesCollection = new FrameCollection(dur, this.start_time, false)
    let size = fps * dur * width * height;
    if (size < max_size) {
      this.width = width;
      this.height = height;
    } else {
      let scale = size / max_size;
      this.width = Math.floor(width / scale);
      this.height = Math.floor(height / scale);
    }

    this.#handleVideoRatio();
    await this.#convertToArrayBuffer();
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

  async #seek(t) {
    return await (new Promise((function (resolve, reject) {
      this.video.currentTime = t;
      this.video.pause();
      this.video.addEventListener('seeked', (function (ev) {
        this.drawScaled(this.video, this.ctx, true);
        this.thumb_ctx.canvas.width = this.thumb_ctx.canvas.clientWidth * dpr;
        this.thumb_ctx.canvas.height = this.thumb_ctx.canvas.clientHeight * dpr;
        this.thumb_ctx.clearRect(0, 0, this.thumb_ctx.canvas.clientWidth, this.thumb_ctx.canvas.clientHeight);
        this.thumb_ctx.scale(dpr, dpr);
        this.drawScaled(this.ctx, this.thumb_ctx);
        let frame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        resolve(frame);
      }).bind(this), {
        once: true
      });
    }).bind(this)));
  }

  async #convertToArrayBuffer() {
    this.video.pause();
    let d = this.video.duration;
    for (let i = 0; i < d * fps; ++i) {
      let frame = await this.#seek(i / fps);
      this.framesCollection.frames.push(frame);
      this.loadUpdateListener(
        this,
        (100 * i / (d * fps)).toFixed(2),
        this.ctx
      );
    }
    this.ready = true;
    this.video.remove();
    this.video = null;
    this.loadUpdateListener(this, 100, this.ctx, null);
  }

  render(ctxOut, currentTime, playing = false) {
    if (!this.ready) {
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

    if (!(frame instanceof ImageData)) {
      console.error("Invalid frame data at index", index, "for VideoLayer", this.name);
      return;
    }
    this.ctx.putImageData(frame, 0, 0);
    this.drawScaled(this.ctx, ctxOut);
    this.updateRenderCache(currentTime, playing);

  }
}