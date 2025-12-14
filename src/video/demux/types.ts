import { VideoMetadata } from '@/mediaclip/types';

export interface VideoStreamingInterface {
  getFrameAtIndex(index: number): Promise<VideoFrame | null>;
  cleanup(): void;
}

export type ProgressCallback = (progress: number) => void;
export type CompleteCallback = (frames: VideoStreamingInterface) => void;
export type MetadataCallback = (metadata: VideoMetadata) => void;
