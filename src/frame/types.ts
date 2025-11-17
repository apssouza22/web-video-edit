/**
 * Represents frame reference data - can be any type of frame data
 * including ImageData, HTMLVideoElement, canvas context, etc.
 */
export type VideoData = VideoFrame | ImageData | HTMLImageElement | null;

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
