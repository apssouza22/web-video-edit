import {HTMLVideoDemuxer} from "./html-video-demuxer.js";

/**
 * Service for video demuxing
 */
export class VideoDemuxService {

  constructor() {
    this.htmlVideoDemuxer = new HTMLVideoDemuxer();
  }

  /**
   * Set callback for progress updates
   * @param {Function} callback - Progress callback function
   */
  setOnProgressCallback(callback) {
    this.htmlVideoDemuxer.setOnProgressCallback(callback);
  }

  /**
   * Set callback for completion
   * @param {Function} callback - Completion callback function
   */
  setOnCompleteCallback(callback) {
    this.htmlVideoDemuxer.setOnCompleteCallback(callback);
  }

  /**
   * Set callback for metadata loading
   * @param {Function} callback - Metadata callback function
   */
  setOnMetadataCallback(callback) {
    this.htmlVideoDemuxer.setOnMetadataCallback(callback);
  }

  /**
   * Initialize HTML video processing
   * @param {string} fileSrc - Video file source URL
   * @param {Canvas2DRender} renderer - Renderer
   */
  initDemux(fileSrc, renderer) {
    this.htmlVideoDemuxer.initialize(fileSrc, renderer);
  }

  #checkWebCodecsSupport() {
    return false;
    // return typeof VideoDecoder !== 'undefined' &&
    //     typeof VideoFrame !== 'undefined' &&
    //     typeof EncodedVideoChunk !== 'undefined';
  }
}