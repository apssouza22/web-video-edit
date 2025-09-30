import { VideoPlayer } from './player.js';
import type { CreatePlayerFunction } from './types.js';

/**
 * Creates a VideoPlayer instance.
 */
export const createPlayer: CreatePlayerFunction = (): VideoPlayer => {
  return new VideoPlayer();
}

// Export the VideoPlayer class for direct usage
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
  VideoPlayer as VideoPlayerInterface,
  PlayerLayer as PlayerLayerInterface,
  CanvasContext2D,
  CanvasElement,
  AudioContextType,
  CreatePlayerFunction
} from './types.js';
