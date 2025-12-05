import {VideoData} from "@/medialayer/frame";
import {VideoStreaming} from "@/video";

export interface FrameSourceMetadata {
  width: number;
  height: number;
  totalTimeInMilSeconds: number;
}

export interface FrameSource {
  readonly metadata: FrameSourceMetadata;
  getFrameAtIndex(index: number): Promise<VideoData | null>;
  cleanup(): void;
}

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

export interface AudioSourceMetadata {
  totalTimeInMilSeconds: number;
  sampleRate: number;
  numberOfChannels: number;
}

export interface AudioFrameSource {
  readonly metadata: AudioSourceMetadata;
  readonly audioBuffer: AudioBuffer;
  cleanup(): void;
}

export class AudioBufferSource implements AudioFrameSource {
  readonly metadata: AudioSourceMetadata;
  readonly audioBuffer: AudioBuffer;

  constructor(audioBuffer: AudioBuffer) {
    this.audioBuffer = audioBuffer;
    this.metadata = {
      totalTimeInMilSeconds: audioBuffer.duration * 1000,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels
    };
  }

  cleanup(): void {
    // AudioBuffer doesn't need explicit cleanup
  }
}
