import {fps, max_size} from '../constants.js';
import {createDemuxer} from "../demux/index.js";
import {createFrameService} from '../frame/index.js';
import {StandardLayer} from './layer-common.js';

export class VideoLayer extends StandardLayer {

  constructor(file, skipLoading = false) {
    super(file);
    this.framesCollection = createFrameService(0, 0, false);
    this.videoDemuxer = createDemuxer(this.renderer);
    this.#setupDemuxerCallbacks();

    // Empty VideoLayers (split() requires this)
    if (skipLoading) {
      return;
    }

    this.#readFile(file);
  }

  #setupDemuxerCallbacks() {
    this.videoDemuxer.setOnProgressCallback((progress) => {
      this.loadUpdateListener(this, progress, this.ctx);
    });

    this.videoDemuxer.setOnCompleteCallback((frames) => {
      frames.forEach((frame, index) => {
        this.framesCollection.update(index, frame);
      });
      this.loadUpdateListener(this, 100, this.ctx, null);
      this.ready = true;
    });

    this.videoDemuxer.setOnMetadataCallback((metadata) => {
      this.totalTimeInMilSeconds = metadata.totalTimeInMilSeconds;
      this.framesCollection = createFrameService(this.totalTimeInMilSeconds, this.start_time, false);
      console.log("Video metadata:", metadata);
      this.width = metadata.width;
      this.height = metadata.height;
      this.#handleVideoRatio();
    });
  }

  #readFile(file) {
    if(file.uri !== null && file.uri !== undefined) {
      this.videoDemuxer.initDemux(file, this.renderer);
      return;
    }

    this.reader = new FileReader();
    this.reader.addEventListener("load", (function () {
      file.uri = this.reader.result;
      this.videoDemuxer.initDemux(file, this.renderer);
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
    this.renderer.drawImage(frame, 0, 0);
    this.drawScaled(this.renderer.context, ctxOut);
    this.updateRenderCache(currentTime);
  }

}
