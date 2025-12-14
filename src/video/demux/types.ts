import { VideoMetadata } from '@/mediaclip/types';
import { VideoData } from '@/mediaclip/frame';

export interface VideoStreamingInterface {
  getFrameAtIndex(index: number): Promise<VideoData | null>;
  cleanup(): void;
}

export type ProgressCallback = (progress: number) => void;
export type CompleteCallback = (frames: VideoStreamingInterface) => void;
export type MetadataCallback = (metadata: VideoMetadata) => void;
