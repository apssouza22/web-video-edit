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

export interface BatchGetFramesMessage {
  type: 'batch-get-frames';
  videoId: string;
  startIndex: number;
  endIndex: number;
  requestId: string;
}

export interface CancelBatchMessage {
  type: 'cancel-batch';
  videoId: string;
  requestId: string;
}

export type DemuxWorkerMessage =
  | InitializeMessage
  | GetFrameMessage
  | CleanupMessage
  | BatchGetFramesMessage
  | CancelBatchMessage;

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
  width: number;
  height: number;
  totalTimeInMilSeconds: number;
}

export interface FrameResponse {
  type: 'frame';
  videoId: string;
  index: number;
  frame: ImageBitmap | null;
}

export interface ErrorResponse {
  type: 'error';
  videoId: string;
  message: string;
}

export interface BatchFrameResponse {
  type: 'batch-frame';
  videoId: string;
  requestId: string;
  index: number;
  frame: ImageBitmap | null;
  progress: number;
  isComplete: boolean;
}

export type DemuxWorkerResponse =
  | MetadataResponse
  | ProgressResponse
  | CompleteResponse
  | FrameResponse
  | ErrorResponse
  | BatchFrameResponse;
