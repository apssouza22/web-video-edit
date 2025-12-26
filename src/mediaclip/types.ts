import { Frame } from '@/mediaclip/frame';
import { ESRenderingContext2D } from '@/common/render-2d';
import { VideoStreamingInterface } from '@/video/demux';
import {AbstractMedia} from "@/mediaclip/media-common";

export type LayerFile  = File & { uri?: string, buffer?: AudioBuffer };
export type ESAudioContext = AudioContext | OfflineAudioContext;

/**
 * Public interface for media layers exposed outside the mediaclip package.
 * All properties and methods in this interface are part of the public API.
 */
export interface IClip {
  readonly id: string;
  readonly ready: boolean;
  readonly width: number;
  readonly height: number;
  readonly audioBuffer: AudioBuffer | null;
  name: string;
  startTime: number;
  totalTimeInMilSeconds: number;

  render(ctxOut: ESRenderingContext2D, currentTime: number, playing?: boolean): Promise<void>;
  init(audioContext?: AudioContext): void;
  update(change: LayerChange, referenceTime: number): Promise<void>;
  getFrame(time: number): Promise<Frame | null>;
  dump(): LayerDumpData;
  clone(): IClip;
  split(splitTime: number): IClip;
  addLoadUpdateListener(listener: LayerLoadUpdateListener): void;
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


export interface IAudioClip extends IClip {
  audioBuffer: AudioBuffer | null;
  playerAudioContext?: ESAudioContext;

  connectAudioSource(playerAudioContext: ESAudioContext): void;
  scheduleStart(scheduleTime: number, offset: number): void;
  playStart(time: number): void;
  disconnect(): void;
}

/**
 * Layer load update listener function signature
 */
export type LayerLoadUpdateListener = (
  progress: number,
  layerName: string,
  layer?: AbstractMedia,
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
  timestamps: number[];
}

