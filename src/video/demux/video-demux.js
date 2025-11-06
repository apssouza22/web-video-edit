import {HTMLVideoDemuxer} from "./html-video-demuxer.js";
import {CodecDemuxer} from "./codec-demuxer.js";

/**
 * Service for video demuxing
 */
export class VideoDemuxService {

  /**
   * Create a new VideoDemuxService instance
   * @param {HTMLVideoDemuxer} htmlVideoDemuxer
   * @param {CodecDemuxer} codecDemuxer
   */
  constructor(htmlVideoDemuxer, codecDemuxer) {
    this.htmlVideoDemuxer = htmlVideoDemuxer;
    this.codecDemuxer = codecDemuxer;
  }

  /**
   * Set callback for progress updates
   * @param {Function} callback - Progress callback function
   */
  setOnProgressCallback(callback) {
    this.htmlVideoDemuxer.setOnProgressCallback(callback);
    this.codecDemuxer.setOnProgressCallback(callback);
  }


  /**
   * Set callback for completion
   * @param {Function} callback - Completion callback function
   */
  setOnCompleteCallback(callback) {
    this.htmlVideoDemuxer.setOnCompleteCallback(callback);
    this.codecDemuxer.setOnCompleteCallback(callback);
  }

  /**
   * Set callback for metadata loading
   * @param {Function} callback - Metadata callback function
   */
  setOnMetadataCallback(callback) {
    this.htmlVideoDemuxer.setOnMetadataCallback(callback);
    this.codecDemuxer.setOnMetadataCallback(callback);
  }

  /**
   * Initialize HTML video processing
   * @param {File} file - Video file source URL
   * @param {Canvas2DRender} renderer - Renderer
   */
  async initDemux(file, renderer) {
    if (this.#checkWebCodecsSupport() && file.name.endsWith('.mp4')) {
      await this.codecDemuxer.initialize(file, renderer);
      return;
    }
    this.htmlVideoDemuxer.initialize(file, renderer);
  }

  cleanup() {
    this.htmlVideoDemuxer.cleanup();
    this.codecDemuxer.cleanup();
  }

  #checkWebCodecsSupport() {
    return typeof VideoDecoder !== 'undefined' &&
        typeof VideoFrame !== 'undefined' &&
        typeof EncodedVideoChunk !== 'undefined';
  }
}