/**
 * Player-related type definitions for video editing application
 */

import type { StandardLayer } from '@/layer';
import type { FrameTransform } from '@/frame';

/**
 * Callback function types for player events
 */
export type TimeUpdateListener = (newTime: number, oldTime: number) => void;
export type LayerTransformedListener = (layer: StandardLayer) => void;
export type PlayerEndCallback = (player: VideoPlayer) => void;

/**
 * Handle types for layer transformation
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
 * Drag operation state
 */
export interface DragState {
  transforming: boolean;
  transformType: HandleType | null;
  dragStart: Point2D;
  initialTransform: FrameTransform | null;
}

/**
 * Canvas position calculation result
 */
export interface CanvasPosition {
  canvasX: number;
  canvasY: number;
}

/**
 * Handle position for rendering
 */
export interface HandlePosition extends Point2D {
  // Inherits x, y from Point2D
}

/**
 * Video Player interface (forward declaration to avoid circular dependency)
 */
export interface VideoPlayer {
  playing: boolean;
  onend_callback: PlayerEndCallback | null;
  total_time: number;
  lastTImestampFrame: number | null;
  time: number;
  lastPausedTime: number;
  playerHolder: HTMLElement | null;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  audioContext: AudioContext;
  width: number;
  height: number;
  layers: PlayerLayer[];
  timeUpdateListener: TimeUpdateListener;
  layerTransformedListener: LayerTransformedListener;

  setTime(newTime: number): void;
  addTimeUpdateListener(listener: TimeUpdateListener): void;
  addLayerTransformedListener(listener: LayerTransformedListener): void;
  addLayers(layers: StandardLayer[]): void;
  setSelectedLayer(layer: StandardLayer): void;
  mount(holder: HTMLElement): void;
  resize(newRatio?: string): void;
  refreshAudio(): void;
  play(): void;
  pause(): void;
  render(realtime: number): number;
  renderLayers(): void;
  isPlaying(): boolean;
}

/**
 * Player Layer interface (forward declaration)
 */
export interface PlayerLayer {
  layer: StandardLayer;
  selected: boolean;
  
  setTransformCallback(callback: LayerTransformedListener): void;
  render(ctx: CanvasRenderingContext2D, time: number, playing: boolean): void;
}

/**
 * Canvas and context type aliases for clarity
 */
export type CanvasContext2D = CanvasRenderingContext2D;
export type CanvasElement = HTMLCanvasElement;

/**
 * Audio context type alias
 */
export type AudioContextType = AudioContext;

/**
 * Player factory function type
 */
export type CreatePlayerFunction = () => VideoPlayer;
