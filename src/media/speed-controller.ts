import {fps} from '@/constants';
import {Frame} from '@/frame';
import {AbstractMedia} from "@/media/media-common";

/**
 * Handles speed control calculations and frame manipulation for video layers
 */
export class SpeedController {
  private layer: AbstractMedia;
  private originalFrames: Frame[] | null;
  private currentSpeed: number;

  constructor(layer: AbstractMedia) {
    this.layer = layer;
    this.originalFrames = null; // Store original frames for preservation
    this.currentSpeed = 1.0;
  }

  /**
   * Set the playback speed for the layer
   */
  setSpeed(speed: number): void {
    if (speed <= 0) {
      throw new Error('Speed must be greater than 0');
    }

    // Store original frames if this is the first speed change
    if (this.originalFrames === null && this.layer.framesCollection) {
      this.#preserveOriginalFrames();
    }
    this.currentSpeed = speed;

    // check if layer is AudioLayer
    if (this.layer.audioBuffer !== null) {
      return;
    }
    this.#adjustFramesForSpeed(speed);
    this.#updateLayerDuration(speed);
  }

  /**
   * Preserve the original frames before any speed modifications
   */
  #preserveOriginalFrames(): void {
    if (this.layer.framesCollection && this.layer.framesCollection.frames) {
      this.originalFrames = this.layer.framesCollection.frames.map(frame => frame.clone());
    }
  }

  /**
   * Get the current playback speed
   */
  getSpeed(): number {
    return this.currentSpeed;
  }

  #adjustFramesForSpeed(speed: number): void {
    if (!this.originalFrames || !this.layer.framesCollection) {
      return;
    }

    const originalFrameCount = this.originalFrames.length;
    const newFrames: Frame[] = [];

    if (speed > 1.0) {
      // Fast forward: skip frames with smart sampling
      this.#createFastForwardFrames(speed, originalFrameCount, newFrames);
      this.layer.framesCollection.frames = newFrames;
      return;
    }

    if (speed < 1.0) {
      // Slow motion: duplicate frames with interpolation
      this.#createSlowMotionFrames(speed, originalFrameCount, newFrames);
      this.layer.framesCollection.frames = newFrames;
      return;
    }

    // Normal speed: use original frames
    newFrames.push(...this.originalFrames.map(frame => frame.clone()));
    this.layer.framesCollection.frames = newFrames;
  }

  /**
   * Create frames for slow motion (speed < 1.0) with interpolation
   */
  #createSlowMotionFrames(speed: number, originalFrameCount: number, newFrames: Frame[]): void {
    const expansionFactor = 1 / speed;
    const targetFrameCount = Math.floor(originalFrameCount * expansionFactor);

    for (let i = 0; i < targetFrameCount; i++) {
      // Map the new frame index back to original timeline
      const originalPosition = i / expansionFactor;
      const baseIndex = Math.floor(originalPosition);
      const interpolationFactor = originalPosition - baseIndex;

      if (baseIndex >= originalFrameCount - 1) {
        // Use last frame if we're beyond the original range
        if (this.originalFrames) {
          newFrames.push(this.originalFrames[originalFrameCount - 1].clone());
        }
      } else if (interpolationFactor === 0) {
        // Exact frame match, use original
        if (this.originalFrames) {
          newFrames.push(this.originalFrames[baseIndex].clone());
        }
      } else {
        // Interpolate between two frames for smooth slow motion
        if (this.originalFrames) {
          const currentFrame = this.originalFrames[baseIndex];
          const nextFrame = this.originalFrames[baseIndex + 1];
          const interpolatedFrame = currentFrame.interpolate(nextFrame, interpolationFactor);
          newFrames.push(interpolatedFrame);
        }
      }
    }
  }

  /**
   * Create frames for fast forward (speed > 1.0) with smart sampling
   */
  #createFastForwardFrames(speed: number, originalFrameCount: number, newFrames: Frame[]): void {
    const compressionFactor = speed;
    const targetFrameCount = Math.floor(originalFrameCount / compressionFactor);

    for (let i = 0; i < targetFrameCount; i++) {
      // Smart sampling: choose frames that best represent the motion
      const originalIndex = Math.floor(i * compressionFactor);

      if (originalIndex < originalFrameCount && this.originalFrames) {
        // For fast forward, we might want to slightly favor anchor frames
        let selectedIndex = originalIndex;

        // Look for nearby anchor frames within a small window
        const searchWindow = Math.min(3, Math.floor(compressionFactor / 2));
        for (let j = Math.max(0, originalIndex - searchWindow);
             j <= Math.min(originalFrameCount - 1, originalIndex + searchWindow); j++) {
          if (this.originalFrames[j].anchor) {
            selectedIndex = j;
            break;
          }
        }

        newFrames.push(this.originalFrames[selectedIndex].clone());
      }
    }

    // Ensure we have at least one frame
    if (newFrames.length === 0 && originalFrameCount > 0 && this.originalFrames) {
      newFrames.push(this.originalFrames[0].clone());
    }
  }

  /**
   * Update layer duration based on speed
   */
  #updateLayerDuration(speed: number): void {
    if (this.originalFrames) {
      const originalDuration = this.#calculateOriginalDuration();
      this.layer.totalTimeInMilSeconds = Math.floor(originalDuration / speed);
    }
  }

  /**
   * Calculate the original duration before speed adjustments
   */
  #calculateOriginalDuration(): number {
    if (!this.originalFrames) {
      return this.layer.totalTimeInMilSeconds;
    }
    return (this.originalFrames.length / fps) * 1000;
  }
}
