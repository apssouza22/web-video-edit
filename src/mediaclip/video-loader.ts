import {createDemuxer} from '@/video/demux';
import {LayerFile, VideoMetadata} from '@/mediaclip/types';
import {MediaBunnyDemuxer} from "@/video/demux/mediabunny-demuxer";

type Callback = (progress: number, metadata: VideoMetadata | null) => void;

export class VideoLoader {
  private videoDemuxer: MediaBunnyDemuxer;
  private callback: Callback = () => {};

  constructor() {
    this.videoDemuxer = createDemuxer();
    this.#setupDemuxerCallbacks();
  }

  #setupDemuxerCallbacks(): void {
    this.videoDemuxer.setOnProgressCallback((progress: number) => {
      this.callback(progress, null);
    });

    this.videoDemuxer.setOnCompleteCallback((metadata: VideoMetadata) => {
      this.callback(100, metadata);
    });
  }

  async loadVideo(file: LayerFile, callback: Callback): Promise<void> {
    this.callback = callback;
    const reader = new FileReader();
    reader.addEventListener("load", ((): void => {
      if (reader && typeof reader.result === 'string') {
        file.uri = reader.result;
        this.videoDemuxer.initialize(file);
      }
    }).bind(this), false);

    reader.readAsDataURL(file as File);
  }

}