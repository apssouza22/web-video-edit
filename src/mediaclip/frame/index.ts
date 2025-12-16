import { FrameService } from './frames';

/**
 * Creates a FrameService instance for managing frames in a video media.
 */
export function createFrameService(
  totalTimeInMilliseconds: number,
  startTime?: number,
  timestamps?: number[],
): FrameService {
  return new FrameService(totalTimeInMilliseconds, startTime, timestamps);
}

// Re-export all types and classes for convenience
export { FrameService } from './frames';
export { Frame } from './frame';
export { FrameAdjustHandler } from './frame-adjust';
export * from './types';
