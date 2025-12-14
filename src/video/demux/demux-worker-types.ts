export interface InitializeMessage {
  type: 'initialize';
  file: File;
  targetFps: number;
}

export interface GetFrameMessage {
  type: 'get-frame';
  index: number;
}

export interface CleanupMessage {
  type: 'cleanup';
}

export type DemuxWorkerMessage =
  | InitializeMessage
  | GetFrameMessage
  | CleanupMessage;

export interface MetadataResponse {
  type: 'metadata';
  width: number;
  height: number;
  totalTimeInMilSeconds: number;
}

export interface ProgressResponse {
  type: 'progress';
  progress: number;
}

export interface CompleteResponse {
  type: 'complete';
  timestamps: number[];
}

export interface FrameResponse {
  type: 'frame';
  index: number;
  frame: VideoFrame | null;
}

export interface ErrorResponse {
  type: 'error';
  message: string;
}

export type DemuxWorkerResponse =
  | MetadataResponse
  | ProgressResponse
  | CompleteResponse
  | FrameResponse
  | ErrorResponse;
