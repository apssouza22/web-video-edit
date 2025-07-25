import {HTMLVideoDemuxer} from "./html-video-demuxer.js";
import {CodecDemuxer} from "./codec-demuxer.js";

/**
 * Service for video demuxing
 */
export class VideoDemuxService {
  useHtmlDemux;

  /**
   * Create a new VideoDemuxService instance
   * @param {HTMLVideoDemuxer} htmlVideoDemuxer
   * @param {CodecDemuxer} codecDemuxer
   */
  constructor(htmlVideoDemuxer, codecDemuxer, useHtmlDemux = false) {
    this.htmlVideoDemuxer = htmlVideoDemuxer;
    this.codecDemuxer = codecDemuxer;
    this.useHtmlDemux = useHtmlDemux;
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
    if (!this.#checkWebCodecsSupport()) {
      this.htmlVideoDemuxer.initialize(file, renderer);
      return;
    }
    await this.codecDemuxer.initialize(file, renderer);
  }

  cleanup() {
    this.htmlVideoDemuxer.cleanup();
    this.codecDemuxer.cleanup();
  }

  #checkWebCodecsSupport() {
    if( this.useHtmlDemux) {
      return false; // Force HTML demuxer if specified
    }
    return typeof VideoDecoder !== 'undefined' &&
        typeof VideoFrame !== 'undefined' &&
        typeof EncodedVideoChunk !== 'undefined';
  }
}