import { Frame } from '@/mediaclip/frame';
import { ESRenderingContext2D } from '@/common/render-2d';
import { VideoStreamingInterface } from '@/video/demux';

export type LayerFile  = File & { uri?: string, buffer?: AudioBuffer };
export type ESAudioContext = AudioContext | OfflineAudioContext;

/**
 * Public interface for media layers exposed outside the medialayer package.
 * All properties and methods in this interface are part of the public API.
 */
export interface MediaLayer {
  readonly id: string;
  readonly name: string;
  readonly uri?: string;
  readonly ready: boolean;
  readonly width: number;
  readonly height: number;
  readonly audioBuffer: AudioBuffer | null;
  startTime: number;
  totalTimeInMilSeconds: number;

  render(ctxOut: ESRenderingContext2D, currentTime: number, playing?: boolean): Promise<void>;
  init(canvasWidth?: number, canvasHeight?: number, audioContext?: AudioContext): void;
  resize(width: number, height: number): void;
  update(change: LayerChange, referenceTime: number): Promise<void>;
  getFrame(time: number): Promise<Frame | null>;
  dump(): LayerDumpData;
  clone(): MediaLayer;
  split(splitTime: number): MediaLayer;
  addLoadUpdateListener(listener: LayerLoadUpdateListener): void;
  updateName(name: string): void;
  setSpeed(speed: number): void;
  getSpeed(): number;
  getTotalFrames(): number;
  isVideo(): boolean;
  isAudio(): boolean;
  adjustTotalTime(diff: number): void;
  connectAudioSource(audioContext: ESAudioContext): void;
  playStart(time: number): void;
  isLayerVisible(time: number): boolean;
  shouldReRender(currentTime: number): boolean;
  updateRenderCache(currentTime: number): void;
}

/**
 * Layer load update listener function signature
 */
export type LayerLoadUpdateListener = (
  layer: any,
  progress: number,
  audioBuffer?: AudioBuffer | null
) => void;


/**
 * Changes that can be applied to a media
 */
export interface LayerChange {
  scale?: number;
  x?: number;
  y?: number;
  rotation?: number;
}

/**
 * Layer dump data for serialization
 */
export interface LayerDumpData {
  width: number;
  height: number;
  name: string;
  startTime: number;
  total_time: number;
  uri?: string;
  type: string;
  frames?: Float32Array[];
}

export interface VideoMetadata {
  totalTimeInMilSeconds: number;
  width: number;
  height: number;
  videoSink: VideoStreamingInterface;
}

