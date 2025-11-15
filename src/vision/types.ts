export interface VisionResult {
  text: string;
  timestamp?: number;
}

export interface ModelParams {
  maxNewTokens: number;
  doSample: boolean;
  repetitionPenalty: number;
}

export interface ProgressCallbackData {
  status: string;
  progress?: number;
  task?: string;
  data?: any;
  file?: string;
  message?: string;
}

export type ProgressCallback = (data: ProgressCallbackData) => void;

export interface ModelOptions {
  dtype?: {
    embed_tokens?: string;
    vision_encoder?: string;
    decoder_model_merged?: string;
  };
  device?: string;
}

export interface WorkerMessageBase {
  task?: string;
  status?: string;
  data?: any;
}

export interface LoadModelMessage extends WorkerMessageBase {
  task: "load-model";
}

export interface AnalyzeImageMessage extends WorkerMessageBase {
  task: "analyze-image";
  imageData: ImageData;
  instruction: string;
}

export interface WorkerResponseMessage extends WorkerMessageBase {
  status: "progress" | "complete" | "initiate" | "ready" | "error" | "done";
  task?: string;
  data?: VisionResult | ProgressCallbackData | Error;
  progress?: number;
  file?: string;
}

export type WorkerMessage = LoadModelMessage | AnalyzeImageMessage;
export type VisionResultCallback = (result: VisionResult) => void;
export type StreamUpdateCallback = (partialText: string) => void;

export interface VisionServiceConfig {
  workerUrl?: string;
  mockDataForLocalhost?: boolean;
}

export interface VisionError extends Error {
  status?: string;
  task?: string;
  data?: any;
}

export enum SamplingStrategy {
  TIME_BASED = 'time_based',
  SCENE_CHANGE = 'scene_change',
  ADAPTIVE = 'adaptive',
  UNIFORM = 'uniform'
}

export interface FrameSample {
  imageData: ImageData;
  timestamp: number;
}

export interface SampleExtractorConfig {
  strategy?: SamplingStrategy;
  maxSamples?: number;
  minSamples?: number;
  intervalSeconds?: number;
  similarityThreshold?: number;
  comparisonMethod?: string;
}

export interface FrameComparisonResult {
  similarity: number;
  method: string;
  isDifferent: boolean;
}

