export interface InitializeMessage {
  type: 'initialize';
  videoId: string;
  file: File;
  targetFps: number;
}

export interface GetFrameMessage {
  type: 'get-frame';
  videoId: string;
  index: number;
}

export interface CleanupMessage {
  type: 'cleanup';
  videoId: string;
}

export type DemuxWorkerMessage =
  | InitializeMessage
  | GetFrameMessage
  | CleanupMessage;

export interface MetadataResponse {
  type: 'metadata';
  videoId: string;
  width: number;
  height: number;
  totalTimeInMilSeconds: number;
}

export interface ProgressResponse {
  type: 'progress';
  videoId: string;
  progress: number;
}

export interface CompleteResponse {
  type: 'complete';
  videoId: string;
  timestamps: number[];
}

export interface FrameResponse {
  type: 'frame';
  videoId: string;
  index: number;
  frame: VideoFrame | null;
}

export interface ErrorResponse {
  type: 'error';
  videoId: string;
  message: string;
}

export type DemuxWorkerResponse =
  | MetadataResponse
  | ProgressResponse
  | CompleteResponse
  | FrameResponse
  | ErrorResponse;
