import {VideoPlayer} from './player.js';
import {StudioState} from "@/common/studio-state";

/**
 * Creates a VideoPlayer instance.
 */
export function createPlayer(studioState: StudioState): VideoPlayer {
  return new VideoPlayer(studioState);
}

export { VideoPlayer } from './player.js';
export { PlayerLayer } from './player-layer.js';

// Export types for external usage
export type {
  TimeUpdateListener,
  LayerTransformedListener,
  PlayerEndCallback,
  HandleType,
  TransformHandle,
  Point2D,
  Bounds,
  HitTestResult,
  DragState,
  CanvasPosition,
  HandlePosition,
  CanvasContext2D,
  CanvasElement,
  AudioContextType,
  CreatePlayerFunction
} from './types.js';
