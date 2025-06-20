import {StandardLayer, addElementToBackground} from './layer-common.js';
import {FrameCollection} from '../frame';
import {fps, max_size, dpr} from '../constants.js';
import {DemuxHandler} from "../demux/demux.js";
import {HTMLVideoDemuxer} from "../demux/html-video-demuxer.js";
import {Canvas2DRender} from '../common/render-2d.js';

export class VideoLayer extends StandardLayer {

  constructor(file, skipLoading = false) {
    super(file);
    this.framesCollection = new FrameCollection(0, 0, false);
    this.useWebCodecs = this.#checkWebCodecsSupport();
    this.demuxHandler = new DemuxHandler();
    this.demuxHandler.addOnUpdateListener(this.#demuxUpdateListener.bind(this));
    this.htmlVideoDemuxer = new HTMLVideoDemuxer();
    this.#setupDemuxerCallbacks();

    // Empty VideoLayers (split() requires this)
    if (skipLoading) {
      return;
    }

    this.#readFile(file);
  }

  #setupDemuxerCallbacks() {
    this.htmlVideoDemuxer.setOnProgressCallback((progress) => {
      this.loadUpdateListener(this, progress, this.ctx);
    });

    this.htmlVideoDemuxer.setOnCompleteCallback((frames) => {
      // Update frames collection with the processed frames
      frames.forEach((frame, index) => {
        this.framesCollection.update(index, frame);
      });
      this.loadUpdateListener(this, 100, this.ctx, null);
      this.ready = true;
    });

    this.htmlVideoDemuxer.setOnMetadataCallback((metadata) => {
      this.totalTimeInMilSeconds = metadata.totalTimeInMilSeconds;
      this.expectedTotalFrames = Math.ceil(metadata.duration * fps);
      this.framesCollection = new FrameCollection(this.totalTimeInMilSeconds, this.start_time, false);
      this.#setSize(metadata.duration, metadata.width, metadata.height);
      this.#handleVideoRatio();
    });
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

      if (key === "onFrame") {
        const frameData = data[key];

        // Convert VideoFrame to ImageData if needed
        // You can choose to store as ImageData for consistency
        const frame = this.#convertVideoFrameToImageData(frameData.frame);
        this.framesCollection.push(frame);

        // Update progress based on frame count
        const progress = Math.min(95, (frameData.frameNumber / frameData.totalFrames) * 100);
        this.loadUpdateListener(this, progress, this.ctx, null);

      }

      if (key === "onComplete") {
        console.log("Demux completed:", data[key]);
        console.log(`Processed ${this.framesCollection.getLength()}frames`);
        this.loadUpdateListener(this, 100, this.ctx, null);
        this.ready = true;
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
      // await this.#processVideoWithWebCodecs();
      this.#initializeWithHTMLVideo();
    } catch (error) {
      console.warn('WebCodecs failed, falling back to HTML video:', error);
      this.#initializeWithHTMLVideo();
    }
  }

  #initializeWithHTMLVideo() {
    this.htmlVideoDemuxer.initialize(this.fileSrc, this.renderer);
  }

  #readFile(file) {
    this.reader = new FileReader();
    this.reader.addEventListener("load", (function () {
      this.fileSrc = this.reader.result;
      if (this.useWebCodecs && file.type.startsWith('video/')) {
        this.#initializeWithWebCodecs(file).then(r => {
        });
      } else {
        this.#initializeWithHTMLVideo();
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
    this.renderer.setSize(this.width, this.height);
  }

  render(ctxOut, currentTime, playing = false) {
    if (!this.ready) {
      return;
    }
    if (!this.isLayerVisible(currentTime)) {
      return;
    }

    // Check if we need to re-render this frame
    if (!this.shouldReRender(currentTime)) {
      this.drawScaled(this.ctx, ctxOut);
      return;
    }

    let index = this.framesCollection.getIndex(currentTime, this.start_time);
    if (index < 0 || index >= this.framesCollection.getLength()) {
      return;
    }

    const frame = this.framesCollection.frames[index];
    this.renderer.putImageData(frame, 0, 0);
    this.drawScaled(this.ctx, ctxOut);
    this.updateRenderCache(currentTime);
  }

  // Method to upgrade video quality on demand
  async upgradeQuality() {
    console.log('Upgrading video quality...');
    await this.htmlVideoDemuxer.upgradeQuality();
  }

  /**
   * Converts a VideoFrame to ImageData
   * @param {VideoFrame} videoFrame - The VideoFrame to convert
   * @returns {ImageData} The converted ImageData
   */
  #convertVideoFrameToImageData(videoFrame) {
    this.renderer.drawImage(videoFrame, 0, 0);
    const frame = this.renderer.getImageData(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);
    videoFrame.close();
    return frame;
  }

}
