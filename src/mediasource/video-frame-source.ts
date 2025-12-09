import {VideoData} from "@/mediaclip/frame";
import {VideoStreaming} from "@/video";
import {FrameSource, FrameSourceMetadata} from "./types";

export class VideoFrameSource implements FrameSource {
  private videoStreaming: VideoStreaming;
  readonly metadata: FrameSourceMetadata;

  constructor(videoStreaming: VideoStreaming, metadata: FrameSourceMetadata) {
    this.videoStreaming = videoStreaming;
    this.metadata = metadata;
  }

  async getFrameAtIndex(index: number): Promise<VideoData | null> {
    if (!this.videoStreaming) {
      return null;
    }
    return await this.videoStreaming.getFrameAtIndex(index);
  }

  cleanup(): void {
    this.videoStreaming.cleanup();
  }
}

