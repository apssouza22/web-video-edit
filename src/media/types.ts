import {Frame} from '@/frame';
import {ESRenderingContext2D} from "@/common/render-2d";
import {VideoStreaming} from "@/video";

export type LayerFile  = File & { uri?: string, buffer?: AudioBuffer };

/**
 * Layer load update listener function signature
 */
export type LayerLoadUpdateListener = (
  layer: any,
  progress: number,
  ctx: ESRenderingContext2D | null,
  audioBuffer?: AudioBuffer | null
) => void;

/**
 * Coordinates and transformation data for media positioning
 */
export interface LayerCoordinates {
  f: Frame;
  scale: number;
  x: number;
  y: number;
}

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
  start_time: number;
  total_time: number;
  uri?: string;
  type: string;
  frames?: Float32Array[];
}

export interface VideoMetadata {
  totalTimeInMilSeconds: number;
  width: number;
  height: number;
  frames?: VideoStreaming
}

