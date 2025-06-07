import { StandardLayer, addElementToBackground } from './layer-common.js';
import { FrameCollection } from './frames.js';
import { fps, max_size, dpr } from '../constants.js';

export class VideoLayer extends StandardLayer {
  constructor(file) {
    super(file);
    this.framesCollection = new FrameCollection(0, 0, false);

    // Empty VideoLayers (split() requires this)
    if (file._leave_empty) {
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

  #onLoadMetadata() {
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
    this.#convertToArrayBuffer();
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

  async seek(t) {
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
      let frame = await this.seek(i / fps);
      this.framesCollection.frames.push(frame);
      this.loadUpdateListener(
          (100 * i / (d * fps)).toFixed(2),
          this.ctx
      );
    }
    this.ready = true;
    this.video.remove();
    this.video = null;
    this.loadUpdateListener(100, this.ctx);
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