import {VideoMetadata} from "@/mediaclip/types";
import {VideoStreaming} from "@/video";


export type ProgressCallback = (progress: number) => void;
export type CompleteCallback = (frames: VideoStreaming) => void;
export type MetadataCallback = (metadata: VideoMetadata) => void;
