import { FrameService } from './frames';

/**
 * Creates a FrameService instance for managing frames in a video media.
 */
export function createFrameService(
  startTime: number,
  totalTimeInMilliseconds: number,
  isFlexibleLayer: boolean = true
): FrameService {
  return new FrameService(startTime, totalTimeInMilliseconds, isFlexibleLayer);
}

// Re-export all types and classes for convenience
export { FrameService } from './frames';
export { Frame } from './frame';
export { FrameAdjustHandler } from './frame-adjust';
export * from './types';
