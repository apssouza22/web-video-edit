import { fps } from '../constants.js';

/**
 * Handles speed control calculations and frame manipulation for video layers
 */
export class SpeedController {
  /** @type {StandardLayer} */
  layer;

  constructor(layer) {
    this.layer = layer;
    this.originalFrames = null; // Store original frames for preservation
    this.currentSpeed = 1.0;
  }

  /**
   * Set the playback speed for the layer
   * @param {number} speed - Speed multiplier (0.5 = half speed, 2.0 = double speed)
   */
  setSpeed(speed) {
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
      return
    }
    this.#adjustFramesForSpeed(speed);
    this.#updateLayerDuration(speed);
  }

  /**
   * Preserve the original frames before any speed modifications
   * @private
   */
  #preserveOriginalFrames() {
    if (this.layer.framesCollection && this.layer.framesCollection.frames) {
      this.originalFrames = this.layer.framesCollection.frames.map(frame => frame.clone());
    }
  }

  /**
   * Get the current playback speed
   * @returns {number} Current speed multiplier
   */
  getSpeed() {
    return this.currentSpeed;
  }

  /**
   * Adjust frames collection based on speed
   * @param {number} speed - Speed multiplier
   * @private
   */
  #adjustFramesForSpeed(speed) {
    if (!this.originalFrames || !this.layer.framesCollection) {
      return;
    }

    const originalFrameCount = this.originalFrames.length;
    const newFrames = [];

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
   * @param {number} speed - Speed multiplier
   * @param {number} originalFrameCount - Number of original frames
   * @param {Array} newFrames - Array to populate with new frames
   * @private
   */
  #createSlowMotionFrames(speed, originalFrameCount, newFrames) {
    const expansionFactor = 1 / speed;
    const targetFrameCount = Math.floor(originalFrameCount * expansionFactor);

    for (let i = 0; i < targetFrameCount; i++) {
      // Map the new frame index back to original timeline
      const originalPosition = i / expansionFactor;
      const baseIndex = Math.floor(originalPosition);
      const interpolationFactor = originalPosition - baseIndex;

      if (baseIndex >= originalFrameCount - 1) {
        // Use last frame if we're beyond the original range
        newFrames.push(this.originalFrames[originalFrameCount - 1].clone());
      } else if (interpolationFactor === 0) {
        // Exact frame match, use original
        newFrames.push(this.originalFrames[baseIndex].clone());
      } else {
        // Interpolate between two frames for smooth slow motion
        const currentFrame = this.originalFrames[baseIndex];
        const nextFrame = this.originalFrames[baseIndex + 1];
        const interpolatedFrame = currentFrame.interpolate(nextFrame, interpolationFactor);
        newFrames.push(interpolatedFrame);
      }
    }
  }

  /**
   * Create frames for fast forward (speed > 1.0) with smart sampling
   * @param {number} speed - Speed multiplier
   * @param {number} originalFrameCount - Number of original frames
   * @param {Array} newFrames - Array to populate with new frames
   * @private
   */
  #createFastForwardFrames(speed, originalFrameCount, newFrames) {
    const compressionFactor = speed;
    const targetFrameCount = Math.floor(originalFrameCount / compressionFactor);

    for (let i = 0; i < targetFrameCount; i++) {
      // Smart sampling: choose frames that best represent the motion
      const originalIndex = Math.floor(i * compressionFactor);

      if (originalIndex < originalFrameCount) {
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
    if (newFrames.length === 0 && originalFrameCount > 0) {
      newFrames.push(this.originalFrames[0].clone());
    }
  }

  /**
   * Update layer duration based on speed
   * @param {number} speed - Speed multiplier
   * @private
   */
  #updateLayerDuration(speed) {
    if (this.originalFrames) {
      const originalDuration = this.#calculateOriginalDuration();
      this.layer.totalTimeInMilSeconds = Math.floor(originalDuration / speed);
    }
  }

  /**
   * Calculate the original duration before speed adjustments
   * @returns {number} Original duration in milliseconds
   * @private
   */
  #calculateOriginalDuration() {
    if (!this.originalFrames) {
      return this.layer.totalTimeInMilSeconds;
    }
    return (this.originalFrames.length / fps) * 1000;
  }
}
