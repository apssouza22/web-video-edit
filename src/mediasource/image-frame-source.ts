import {VideoData} from "@/medialayer/frame";
import {FrameSource, FrameSourceMetadata} from "./types";

export class ImageFrameSource implements FrameSource {
  private image: HTMLImageElement;
  readonly metadata: FrameSourceMetadata;

  constructor(image: HTMLImageElement) {
    this.image = image;
    this.metadata = {
      width: image.naturalWidth,
      height: image.naturalHeight,
      totalTimeInMilSeconds: 2000
    };
  }

  async getFrameAtIndex(_index: number): Promise<VideoData | null> {
    return this.image;
  }

  cleanup(): void {
    this.image.src = '';
  }
}

