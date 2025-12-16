import {VideoData} from "@/mediaclip/frame";

export interface FrameSourceMetadata {
  width: number;
  height: number;
  totalTimeInMilSeconds: number;
  timestamps: number[]; // Actual frame timestamps in seconds
}

export interface FrameSource {
  readonly metadata: FrameSourceMetadata;

  getFrameAtIndex(index: number, preFetch: boolean): Promise<VideoData | null>;

  cleanup(): void;
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

