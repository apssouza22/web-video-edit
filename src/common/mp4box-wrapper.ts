/**
 * MP4Box ES Module Wrapper with TypeScript support
 * This wrapper works in both browser main thread and worker contexts
 */

// First, load the UMD library
import './mp4box.all.min.js';

// Define minimal MP4Box interface for the functionality we use
export interface MP4ArrayBuffer extends ArrayBuffer {
  fileStart?: number;
}

export interface MP4File {
  appendBuffer(buffer: MP4ArrayBuffer): void;
  start(): void;
  stop(): void;
  flush(): void;
  seek(time: number, useRap?: boolean): void;
  setExtractionOptions(id: number, user?: any, options?: any): void;
  releaseUsedSamples(id: number, sampleNum: number): void;
  getInfo(): MP4Info;
  onReady?: (info: MP4Info) => void;
  onError?: (error: string) => void;
  onSamples?: (id: number, user: any, samples: MP4Sample[]) => void;
}

export interface MP4Info {
  duration: number;
  timescale: number;
  fragment_duration?: number;
  isFragmented: boolean;
  isProgressive: boolean;
  hasIOD: boolean;
  brands: string[];
  tracks: MP4Track[];
}

export interface MP4Track {
  id: number;
  created: Date;
  modified: Date;
  movie_duration: number;
  layer: number;
  alternate_group: number;
  volume: number;
  track_width: number;
  track_height: number;
  timescale: number;
  duration: number;
  bitrate: number;
  codec: string;
  language: string;
  nb_samples: number;
}

export interface MP4Sample {
  number: number;
  track_id: number;
  timescale: number;
  description: any;
  data: ArrayBuffer;
  size: number;
  alreadyRead?: boolean;
  duration: number;
  cts: number;
  dts: number;
  is_sync: boolean;
  is_leading: number;
  depends_on: number;
  is_depended_on: number;
  has_redundancy: number;
  degradation_priority: number;
  offset: number;
}

// Global scope interface
interface GlobalScope {
  MP4Box?: {
    createFile(): MP4File;
    Log?: {
      setLogLevel(level: number): void;
    };
  };
}

// Get the global scope (window in main thread, self in workers)
const globalScope: GlobalScope = (typeof window !== 'undefined' ? window : 
                                 typeof self !== 'undefined' ? self : 
                                 typeof globalThis !== 'undefined' ? globalThis : {}) as GlobalScope;

// Export the MP4Box object from the appropriate global scope
const MP4Box = globalScope.MP4Box;

if (!MP4Box) {
  throw new Error('MP4Box failed to load. Make sure mp4box.js is loaded properly.');
}

export { MP4Box };
