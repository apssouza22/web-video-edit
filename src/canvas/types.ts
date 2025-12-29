import {VideoCanvas} from "@/canvas/canvas";
import { AbstractClip } from "@/mediaclip";

export type LayerTransformedListener = (layer: AbstractClip) => void;
export type PlayerEndCallback = (player: VideoCanvas) => void;

/**
 * Handle types for media transformation
 */
export enum HandleType {
  RESIZE_NW = 'resize-nw',
  RESIZE_N = 'resize-n',
  RESIZE_NE = 'resize-ne',
  RESIZE_E = 'resize-e',
  RESIZE_SE = 'resize-se',
  RESIZE_S = 'resize-s',
  RESIZE_SW = 'resize-sw',
  RESIZE_W = 'resize-w',
  ROTATE = 'rotate',
  MOVE = 'move'
}

/**
 * Transformation handle definition
 */
export interface TransformHandle {
  type: HandleType;
  cursor: string;
}

/**
 * 2D coordinate point
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Rectangle bounds definition
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Hit test result for interaction detection
 */
export interface HitTestResult {
  type: HandleType;
  cursor: string;
}

/**
 * Canvas position calculation result
 */
export interface CanvasPosition {
  canvasX: number;
  canvasY: number;
}

export type CanvasContext2D = CanvasRenderingContext2D;
export type CanvasElement = HTMLCanvasElement;
export type AudioContextType = AudioContext;

