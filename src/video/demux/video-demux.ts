import {HTMLVideoDemuxer} from "./htmldemuxer/html-video-demuxer";
import {MediaBunnyDemuxer} from "./mediabunny-demuxer";
import {CodecDemuxer} from "./mp4boxdemuxer/codec-demuxer";
import {Canvas2DRender} from "@/common/render-2d";
import {VideoMetadata} from "@/medialayer/types";
import {VideoStreaming} from "@/video";
import {CompleteCallback, MetadataCallback, ProgressCallback} from "@/video/demux/types";


export class VideoDemuxService {
  private mediaBunnyDemuxer: MediaBunnyDemuxer;
  private mp4CodecDemuxer: CodecDemuxer;
  private htmlVideoDemuxer: HTMLVideoDemuxer;

  constructor(mp4CodecDemuxer: MediaBunnyDemuxer, mediaBunnyDemuxer: CodecDemuxer, htmlVideoDemuxer: HTMLVideoDemuxer) {
    this.mediaBunnyDemuxer = mp4CodecDemuxer;
    this.mp4CodecDemuxer = mediaBunnyDemuxer;
    this.htmlVideoDemuxer = htmlVideoDemuxer;
  }

  setOnProgressCallback(callback: ProgressCallback): void {
    this.mediaBunnyDemuxer.setOnProgressCallback(callback);
    this.mp4CodecDemuxer.setOnProgressCallback(callback);
    this.htmlVideoDemuxer.setOnProgressCallback(callback);
  }

  setOnCompleteCallback(callback: CompleteCallback): void {
    this.mediaBunnyDemuxer.setOnCompleteCallback(callback);
    this.mp4CodecDemuxer.setOnCompleteCallback(callback);
    this.htmlVideoDemuxer.setOnCompleteCallback(callback);
  }

  setOnMetadataCallback(callback: MetadataCallback): void {
    this.mediaBunnyDemuxer.setOnMetadataCallback(callback);
    this.mp4CodecDemuxer.setOnMetadataCallback(callback);
    this.htmlVideoDemuxer.setOnMetadataCallback(callback);
  }

  async initDemux(file: File, renderer: Canvas2DRender): Promise<void> {
    if (!this.#checkWebCodecsSupport()) {
      this.htmlVideoDemuxer.initialize(file, renderer);
      return;
    }
    if (this.#shouldUseMediaBunny(file)) {
      await this.mediaBunnyDemuxer.initialize(file, renderer);
      return;
    }
    await this.mp4CodecDemuxer.initialize(file, renderer);
  }

  cleanup(): void {
    this.mediaBunnyDemuxer.cleanup();
    this.mp4CodecDemuxer.cleanup();
  }

  #shouldUseMediaBunny(file: File): boolean {
    const supportedExtensions = ['.mp4', '.webm', '.mkv', '.mov', '.avi'];
    const fileName = file.name.toLowerCase();
    return supportedExtensions.some(ext => fileName.endsWith(ext));
  }

  #checkWebCodecsSupport() {
    return typeof VideoDecoder !== 'undefined' &&
        typeof VideoFrame !== 'undefined' &&
        typeof EncodedVideoChunk !== 'undefined';
  }
}

