import {HTMLVideoDemuxer} from "../demux/html-video-demuxer.js";
import {MediaBunnyDemuxer} from "./mediabunny-demuxer";
import {Canvas2DRender} from "@/common/render-2d";
import {VideoMetadata} from "@/media/types";
import {CodecDemuxer} from "@/video/demux/codec-demuxer";

export type ProgressCallback = (progress: number) => void;

export type CompleteCallback = (frames: any[]) => void;

export type MetadataCallback = (metadata: VideoMetadata) => void;

export class VideoDemuxService {
  private mediaBunnyDemuxer: MediaBunnyDemuxer;
  private mp4CodecDemuxer: CodecDemuxer;

  constructor(htmlVideoDemuxer: MediaBunnyDemuxer, mediaBunnyDemuxer: CodecDemuxer) {
    this.mediaBunnyDemuxer = htmlVideoDemuxer;
    this.mp4CodecDemuxer = mediaBunnyDemuxer;
  }

  setOnProgressCallback(callback: ProgressCallback): void {
    this.mediaBunnyDemuxer.setOnProgressCallback(callback);
    this.mp4CodecDemuxer.setOnProgressCallback(callback);
  }

  setOnCompleteCallback(callback: CompleteCallback): void {
    this.mediaBunnyDemuxer.setOnCompleteCallback(callback);
    this.mp4CodecDemuxer.setOnCompleteCallback(callback);
  }

  setOnMetadataCallback(callback: MetadataCallback): void {
    this.mediaBunnyDemuxer.setOnMetadataCallback(callback);
    this.mp4CodecDemuxer.setOnMetadataCallback(callback);
  }

  async initDemux(file: File, renderer: Canvas2DRender): Promise<void> {
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
    const supportedExtensions = ['.mp4','.webm', '.mkv', '.mov', '.avi'];
    const fileName = file.name.toLowerCase();
    return supportedExtensions.some(ext => fileName.endsWith(ext));
  }
}

