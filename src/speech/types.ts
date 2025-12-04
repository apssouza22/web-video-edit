export interface SpeechConfig {
  voice: string;
  speed: number;
}

export interface VoiceOption {
  id: string;
  name: string;
}

export interface ModelOption {
  id: string;
  name: string;
  size: string;
}

export interface SpeechResult {
  audioData: Float32Array;
  sampleRate: number;
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

export interface WorkerMessageBase {
  task?: string;
  status?: string;
  data?: any;
}

export interface LoadModelMessage extends WorkerMessageBase {
  task: 'load-model';
}

export interface GenerateSpeechMessage extends WorkerMessageBase {
  task: 'generate-speech';
  text: string;
  voice: string;
  speed: number;
}

export interface WorkerResponseMessage extends WorkerMessageBase {
  status: 'progress' | 'complete' | 'initiate' | 'ready' | 'error' | 'done';
  task?: string;
  data?: SpeechResult | ProgressCallbackData | Error;
  progress?: number;
  file?: string;
}

export type WorkerMessage = LoadModelMessage | GenerateSpeechMessage;

export interface SpeechServiceConfig {
  modelId?: string;
  dtype?: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';
  device?: 'wasm' | 'webgpu';
}

export interface SpeechError extends Error {
  status?: string;
  task?: string;
  data?: any;
}

export interface SpeechProgressEvent {
  status: 'loading' | 'generating' | 'complete' | 'error';
  progress?: number;
  message?: string;
}

export const DEFAULT_VOICES: VoiceOption[] = [
  { id: 'af_heart', name: 'Heart' },
  { id: 'af_bella', name: 'Bella' },
  { id: 'af_nicole', name: 'Nicole' },
  { id: 'af_sarah', name: 'Sarah' },
  { id: 'af_sky', name: 'Sky' },
  { id: 'am_adam', name: 'Adam' },
  { id: 'am_michael', name: 'Michael' },
  { id: 'bf_emma', name: 'Emma' },
  { id: 'bf_isabella', name: 'Isabella' },
  { id: 'bm_george', name: 'George' },
  { id: 'bm_lewis', name: 'Lewis' },
];

export const DEFAULT_MODELS: ModelOption[] = [
  { id: 'onnx-community/Kokoro-82M-v1.0-ONNX', name: 'Kokoro 82M', size: '82M' },
];

export const DEFAULT_SPEED = 100;
export const MIN_SPEED = 50;
export const MAX_SPEED = 200;
