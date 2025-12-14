import {MediaBunnyDemuxer} from "./mediabunny-demuxer";
import {Canvas2DRender} from "@/common/render-2d";
import {CompleteCallback, MetadataCallback, ProgressCallback} from "@/video/demux/types";


export class VideoDemuxService {
  private mediaBunnyDemuxer: MediaBunnyDemuxer;

  constructor(mp4CodecDemuxer: MediaBunnyDemuxer) {
    this.mediaBunnyDemuxer = mp4CodecDemuxer;
  }

  setOnProgressCallback(callback: ProgressCallback): void {
    this.mediaBunnyDemuxer.setOnProgressCallback(callback);
  }

  setOnCompleteCallback(callback: CompleteCallback): void {
    this.mediaBunnyDemuxer.setOnCompleteCallback(callback);
  }

  setOnMetadataCallback(callback: MetadataCallback): void {
    this.mediaBunnyDemuxer.setOnMetadataCallback(callback);
  }

  async initDemux(file: File, renderer: Canvas2DRender): Promise<void> {
    await this.mediaBunnyDemuxer.initialize(file, renderer);
  }

  cleanup(): void {
    this.mediaBunnyDemuxer.cleanup();
  }
}

