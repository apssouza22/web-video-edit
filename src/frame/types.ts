/**
 * Represents frame reference data - can be any type of frame data
 * including ImageData, HTMLVideoElement, canvas context, etc.
 */
export type FrameReference = any;

/**
 * Frame transformation properties
 */
export interface FrameTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  anchor: boolean;
}

/**
 * Complete frame data structure
 */
export interface FrameData extends FrameTransform {
  frame: FrameReference;
}

/**
 * Parameters for FrameService constructor
 */
export interface FrameServiceParams {
  totalTimeInMilliseconds: number;
  startTime: number;
  isFlexibleLayer?: boolean;
}

/**
 * Speed adjustment parameters for frame retrieval
 */
export interface SpeedParams {
  referenceTime: number;
  startTime: number;
  speed?: number;
}

/**
 * Time interval for removal operations
 */
export interface TimeInterval {
  startTime: number;
  endTime: number;
}
