/**
 * Frame quality levels for progressive loading
 */
export enum FrameQuality {
  EMPTY = 0,           // Not loaded
  INTERPOLATED = 1,    // Calculated from nearby frames
  LOW_RES = 2,         // Extracted at reduced FPS (12 FPS)
  HIGH_RES = 3         // Extracted at full FPS
}

/**
 * Enhanced frame metadata for progressive loading
 */
export class FrameMetadata {
  data: ImageData | null;
  quality: FrameQuality;
  timestamp: number;
  sourceIndex: number | null;

  constructor(data: ImageData | null = null, quality: FrameQuality = FrameQuality.EMPTY, timestamp: number = 0) {
    this.data = data;           // ImageData or null
    this.quality = quality;     // FrameQuality level
    this.timestamp = timestamp; // Exact timestamp in seconds
    this.sourceIndex = null;    // For interpolated frames, points to source frame
  }

  /**
   * Check if frame has actual extracted data
   */
  hasRealData(): boolean {
    return this.quality === FrameQuality.LOW_RES || this.quality === FrameQuality.HIGH_RES;
  }

  /**
   * Check if frame needs quality upgrade
   */
  needsUpgrade(): boolean {
    return this.quality === FrameQuality.LOW_RES || this.quality === FrameQuality.INTERPOLATED;
  }

  /**
   * Get display data (handles interpolation)
   */
  getDisplayData(frames: FrameMetadata[]): ImageData | null {
    if (this.data) {
      return this.data;
    }
    
    // For interpolated frames, return source frame data
    if (this.quality === FrameQuality.INTERPOLATED && this.sourceIndex !== null) {
      const sourceFrame = frames[this.sourceIndex];
      return sourceFrame ? sourceFrame.data : null;
    }
    
    return null;
  }
}

