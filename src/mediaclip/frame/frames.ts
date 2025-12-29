import {fps} from '@/constants';
import {FrameAdjustHandler} from './frame-adjust';
import {Frame} from './frame';

export class FrameService {
  public frames: Frame[] = [];
  public totalTimeInSeconds: number = 0;
  public startTime: number;
  public totalTimeInMilSeconds: number;
  public timeAdjustHandler: FrameAdjustHandler;
  public timestamps: number[] = []; // Actual frame timestamps in seconds

  constructor(milSeconds: number, startTime?: number, timestamps?: number[]) {
    this.startTime = startTime || 0;
    this.totalTimeInMilSeconds = milSeconds;
    this.totalTimeInSeconds = milSeconds / 1000;
    this.timestamps = timestamps || [];
    console.log(`[FrameService] Constructor - received ${timestamps?.length || 0} timestamps (milSeconds: ${milSeconds})`);
    this.initializeFrames();
    this.timeAdjustHandler = new FrameAdjustHandler(this);
  }

  adjustTotalTime(diff: number): void {
    this.timeAdjustHandler.adjust(diff);
  }

  getTotalTimeInMilSec(): number {
    return this.totalTimeInMilSeconds;
  }

  initializeFrames(): void {
    // If we have actual timestamps, create frames based on timestamp count
    const frameCount = this.timestamps.length > 0
        ? this.timestamps.length
        : this.totalTimeInSeconds * fps;

    for (let i = 0; i < frameCount; ++i) {
      const f = new Frame(null, 0, 0, 1, 0, false, i);
      this.frames.push(f);
    }
    if (this.frames.length > 0) {
      this.frames[0].anchor = true; // set first frame as anchor
    }
  }

  getLength(): number {
    return this.frames.length;
  }

  push(f: Frame | Float32Array): void {
    const frame = f instanceof Frame ? f : Frame.fromArray(f);
    this.frames.push(frame);
  }

  slice(start: number, deleteCount: number): void {
    this.frames.splice(start, deleteCount);
  }

  setAnchor(index: number): void {
    this.frames[index].anchor = true;
  }

  isAnchor(index: number): boolean {
    return this.frames[index].anchor;
  }

  /**
   * Gets the frame at the specified reference time
   */
  getFrame(referenceTime: number, startTime: number): Frame | null {
    this.startTime = startTime;
    const index = this.getIndex(referenceTime, startTime);
    if (index < 0 || index >= this.frames.length) {
      return null;
    }
    let currentFrame = this.frames[index].clone();

    if (index + 1 < this.frames.length) {
      const currentFrameTime = referenceTime - this.getTime(index, startTime);
      const nextFrameTime = this.getTime(index + 1, startTime) - referenceTime;
      const interpolationFactor = nextFrameTime / (currentFrameTime + nextFrameTime);
      const nextFrame = this.frames[index + 1];
      currentFrame = currentFrame.interpolate(nextFrame, interpolationFactor);
    }
    return currentFrame;
  }

  /**
   * Gets the index of the frame at the specified reference time
   */
  getIndex(currentTime: number, startTime: number): number {
    const time = currentTime - startTime;
    if (this.timestamps.length < 1) {
      // Fallback to FPS-based calculation if timestamps not available
      return Math.floor(time / 1000 * fps);
    }

    // If we have actual timestamps, use binary search to find the correct frame
    const timeInSeconds = time / 1000;
    let left = 0;
    let right = this.timestamps.length - 1;
    if (timeInSeconds <= this.timestamps[0]) {
      return 0;
    }
    if (timeInSeconds >= this.timestamps[right]) {
      return right;
    }

    // Binary search
    while (left < right) {
      const mid = Math.floor((left + right + 1) / 2);
      if (this.timestamps[mid] <= timeInSeconds) {
        left = mid;
      } else {
        right = mid - 1;
      }
    }
    return left;
  }

  /**
   * Get time in milliseconds
   * @param index
   * @param startTime
   */
  getTime(index: number, startTime: number): number {
    // If we have actual timestamps, use them
    if (this.timestamps.length > 0 && index >= 0 && index < this.timestamps.length) {
      return (this.timestamps[index] * 1000) + startTime;
    }

    // Fallback to FPS-based calculation
    return (index / fps * 1000) + startTime;
  }


  /**
   * Interpolates between two frames
   * Get a frame at a specific time might fall between two existing frames in the collection.
   * Rather than simply jumping to the nearest frame (which would create jerky animations),
   * this function creates a blended transition
   */
  interpolateFrame(f0: Frame, f1: Frame, weight: number): Frame {
    return f0.interpolate(f1, weight);
  }

  removeInterval(startTime: number, endTime: number): boolean {
    return this.timeAdjustHandler.removeInterval(startTime, endTime);
  }

}
