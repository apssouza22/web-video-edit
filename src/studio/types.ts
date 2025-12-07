import type {ESRenderingContext2D} from '@/common/render-2d';
import type {Frame} from '@/mediaclip/frame';
import {MediaLayer} from "@/mediaclip";

/**
 * Layer change interface for transformations
 */
export interface StudioLayerChange {
  scale?: number;
  x?: number;
  y?: number;
  rotation?: number;
}

/**
 * Layer dump data for serialization
 */
export interface StudioLayerDumpData {
  width: number;
  height: number;
  name: string;
  startTime: number;
  total_time: number;
  uri?: string;
  type: string;
  frames?: Float32Array[];
}

/**
 * Local interface for media layers in the studio package.
 * Decouples studio from the concrete AbstractMedia class.
 */
export interface StudioMediaLayer extends MediaLayer{
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly ready: boolean;
  startTime: number;
  totalTimeInMilSeconds: number;

  render(ctxOut: ESRenderingContext2D, currentTime: number, playing?: boolean): Promise<void>;
  init(canvasWidth?: number, canvasHeight?: number, audioContext?: AudioContext): void;
  resize(width: number, height: number): void;
  update(change: StudioLayerChange, referenceTime: number): Promise<void>;
  getFrame(time: number): Promise<Frame | null>;
  dump(): StudioLayerDumpData;
  clone(): StudioMediaLayer;
  split(splitTime: number): StudioMediaLayer;
  setSpeed(speed: number): void;
  getSpeed(): number;
  isVideo(): boolean;
  isAudio(): boolean;
}

/**
 * Interface for audio-capable media layers
 */
export interface AudioCapableStudioMedia extends StudioMediaLayer {
  disconnect(): void;
}

