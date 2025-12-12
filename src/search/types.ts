export interface SearchResult {
  query: string;
  matches: SearchMatch[];
  totalMatches: number;
  searchDurationMs: number;
}

export interface SearchMatch {
  timestamp: number;
  confidence: number;
  matchedText: string;
  context: string;
  imageDataUrl?: string;
}

export interface ProgressCallbackData {
  status: string;
  progress?: number;
  task?: string;
  message?: string;
}

export type ProgressCallback = (data: ProgressCallbackData) => void;

export interface WorkerMessageBase {
  task?: string;
  status?: string;
}

export interface LoadModelMessage extends WorkerMessageBase {
  task: 'load-model';
}

export interface SearchInVideoMessage extends WorkerMessageBase {
  task: 'search';
  query: string;
  videoData: ArrayBuffer;
  minCosineSimilarity?: number;
}

export interface WorkerResponseMessage extends WorkerMessageBase {
  status: 'progress' | 'complete' | 'error' | 'ready';
  task?: string;
  data?: SearchResult | ProgressCallbackData | Error;
  progress?: number;
  message?: string;
}

export type WorkerMessage = LoadModelMessage | SearchInVideoMessage;

export interface SearchError extends Error {
  status?: string;
  task?: string;
}

export interface SearchServiceConfig {
  mockDataForLocalhost?: boolean;
  minCosineSimilarity?: number;
  frameIntervalMs?: number;
  maxFrames?: number;
}

export interface AnalyzedFrameData {
  timestamp: number;
  caption: string;
  embedding: Float32Array;
  imageDataUrl: string;
}

export enum FilteringStrategy {
  SCENE_CHANGE = 'scene_change',
  ADAPTIVE = 'adaptive',
}

export enum ComparisonMethod {
  HISTOGRAM = 'histogram',
  PIXEL_DIFFERENCE = 'pixel_difference',
}

export interface SampleFilterConfig {
  strategy?: FilteringStrategy;
  maxSamples?: number;
  minSamples?: number;
  similarityThreshold?: number;
  comparisonMethod?: ComparisonMethod;
}
