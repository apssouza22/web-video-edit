/**
 * Represents frame reference data - can be any type of frame data
 * including ImageBitmap, ImageData, HTMLImageElement, etc.
 */
export type VideoData = ImageBitmap | ImageData | HTMLImageElement | null;

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
