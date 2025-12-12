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

export interface SearchInVideoMessage extends WorkerMessageBase {
  task: 'search';
  query: string;
  videoData: ArrayBuffer;
}

export interface WorkerResponseMessage extends WorkerMessageBase {
  status: 'progress' | 'complete' | 'error';
  task?: string;
  data?: SearchResult | ProgressCallbackData | Error;
  progress?: number;
}

export type WorkerMessage = SearchInVideoMessage;

export interface SearchError extends Error {
  status?: string;
  task?: string;
}

export interface SearchServiceConfig {
  mockDataForLocalhost?: boolean;
}
