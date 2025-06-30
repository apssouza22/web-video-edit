import { FrameService } from './frames.js';

/**
 * Creates a FrameService instance for managing frames in a video layer.
 * @param startTime
 * @param totalTimeInMilliseconds
 * @param isFlexibleLayer
 * @returns {FrameService}
 */
export function createFrameService(startTime, totalTimeInMilliseconds, isFlexibleLayer=true) {
  return new FrameService(startTime, totalTimeInMilliseconds, isFlexibleLayer);
}
