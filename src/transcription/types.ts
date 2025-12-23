/**
 * Shared types and interfaces for the transcription module
 */

// Transcription data structures
export interface TranscriptionChunk {
  text: string;
  timestamp: [number, number]; // [startTime, end_time] in seconds
}

export interface TranscriptionResult {
  text: string;
  chunks: TranscriptionChunk[];
  audioId?: string;
}

// Hugging Face Transformers types
export interface ModelParams {
  chunk_length_s: number;
  stride_length_s: number;
  return_timestamps: string;
  language?: string;
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

export interface PipelineOptions {
  progress_callback?: ProgressCallback;
  dtype?: string;
  revision?: string;
}

// Pipeline instance type (from Hugging Face transformers)
export type Pipeline = (audio: Float32Array, params: ModelParams) => Promise<TranscriptionResult>;

// Web Worker message types
export interface WorkerMessageBase {
  task?: string;
  status?: string;
  data?: any;
  audio?: Float32Array;
}

export interface LoadModelMessage extends WorkerMessageBase {
  task: "load-model";
}

export interface TranscribeMessage extends WorkerMessageBase {
  audio: Float32Array;
  audioId: string;
}

export interface WorkerResponseMessage extends WorkerMessageBase {
  status: "progress" | "complete" | "initiate" | "ready" | "error" | "done";
  task?: string;
  data?: TranscriptionResult | ProgressCallbackData | Error;
  progress?: number;
  file?: string;
}

export type WorkerMessage = LoadModelMessage | TranscribeMessage;

// DOM and Event types
export interface ChunkElementData {
  index: number;
  startTime: number;
  endTime: number;
}

// Audio processing types
export interface AudioTransformResult {
  audio: Float32Array;
  sampleRate: number;
}

// Error types
export interface TranscriptionError extends Error {
  status?: string;
  task?: string;
  data?: any;
}

// External library types (to be extended as needed)
declare global {
  interface Window {
    // Add any global transcription-related properties here if needed
  }
}
