import {VideoDemuxService} from "@/video/demux/video-demux";
import {createDemuxer} from "@/video/demux";
import {VideoMetadata, LayerFile} from "@/media/types";
import {Canvas2DRender} from "@/common/render-2d";

type Callback = (progress: number, metadata: VideoMetadata | null) => void;

export class VideoLoader {
  private videoDemuxer: VideoDemuxService;
  private reader?: FileReader;
  private callback: Callback = (progress: number, metadata: VideoMetadata | null) => {};
  private metadata: VideoMetadata | null = null;
  private renderer = new Canvas2DRender();

  constructor() {
    this.videoDemuxer = createDemuxer();
    this.#setupDemuxerCallbacks();
  }

  #setupDemuxerCallbacks(): void {
    this.videoDemuxer.setOnProgressCallback((progress: number) => {
      this.callback(progress, this.metadata);
    });

    this.videoDemuxer.setOnCompleteCallback((frames: any[]) => {
      this.metadata!.frames = frames;
      this.callback(100, this.metadata);
    });

    this.videoDemuxer.setOnMetadataCallback((metadata: VideoMetadata) => {
      this.metadata = metadata;
    });
  }

  async loadVideo(file: LayerFile, callback: Callback): Promise<void> {
    this.callback = callback;
    if (file.uri !== null && file.uri !== undefined) {
      await this.videoDemuxer.initDemux(file, this.renderer);
      return;
    }

    this.reader = new FileReader();
    this.reader.addEventListener("load", ((): void => {
      if (this.reader && typeof this.reader.result === 'string') {
        file.uri = this.reader.result;
        this.videoDemuxer.initDemux(file, this.renderer);
      }
    }).bind(this), false);

    this.reader.readAsDataURL(file as File);
  }

}