import { HTMLVideoDemuxer } from "../demux/html-video-demuxer.js";
import { CodecDemuxer } from "../demux/codec-demuxer.js";
import { Canvas2DRender } from "@/common/render-2d";
import {VideoMetadata} from "@/media/types";

export type ProgressCallback = (progress: number) => void;

export type CompleteCallback = (frames: any[]) => void;

export type MetadataCallback = (metadata: VideoMetadata) => void;

export class VideoDemuxService {
  private htmlVideoDemuxer: HTMLVideoDemuxer;
  private codecDemuxer: CodecDemuxer;

  constructor(htmlVideoDemuxer: HTMLVideoDemuxer, codecDemuxer: CodecDemuxer) {
    this.htmlVideoDemuxer = htmlVideoDemuxer;
    this.codecDemuxer = codecDemuxer;
  }

  setOnProgressCallback(callback: ProgressCallback): void {
    this.htmlVideoDemuxer.setOnProgressCallback(callback);
    this.codecDemuxer.setOnProgressCallback(callback);
  }

  setOnCompleteCallback(callback: CompleteCallback): void {
    this.htmlVideoDemuxer.setOnCompleteCallback(callback);
    this.codecDemuxer.setOnCompleteCallback(callback);
  }

  setOnMetadataCallback(callback: MetadataCallback): void {
    this.htmlVideoDemuxer.setOnMetadataCallback(callback);
    this.codecDemuxer.setOnMetadataCallback(callback);
  }

  async initDemux(file: File, renderer: Canvas2DRender): Promise<void> {
    if (this.#checkWebCodecsSupport() && file.name.endsWith('.mp4')) {
      await this.codecDemuxer.initialize(file, renderer);
      return;
    }
    this.htmlVideoDemuxer.initialize(file, renderer);
  }

  cleanup(): void {
    this.htmlVideoDemuxer.cleanup();
    this.codecDemuxer.cleanup();
  }

  #checkWebCodecsSupport(): boolean {
    return typeof VideoDecoder !== 'undefined' &&
        typeof VideoFrame !== 'undefined' &&
        typeof EncodedVideoChunk !== 'undefined';
  }
}

