import {fps} from '@/constants';
import {FrameAdjustHandler} from './frame-adjust';
import {Frame} from './frame';

export class FrameService {
  public frames: Frame[] = [];
  public totalTimeInSeconds: number = 0;
  public startTime: number = 0;
  public start_time: number;
  public totalTimeInMilSeconds: number;
  public timeAdjustHandler: FrameAdjustHandler;

  constructor(milSeconds: number, startTime: number, flexibleLayer: boolean = true) {
    this.start_time = startTime;
    this.totalTimeInMilSeconds = milSeconds;
    this.totalTimeInSeconds = milSeconds / 1000;
    this.timeAdjustHandler = new FrameAdjustHandler(this);
    if (flexibleLayer) {
      this.initializeFrames();
    }
  }

  adjustTotalTime(diff: number): void {
    this.timeAdjustHandler.adjust(diff);
  }

  getTotalTimeInMilSec(): number {
    return this.totalTimeInMilSeconds;
  }

  initializeFrames(): void {
    for (let i = 0; i < this.totalTimeInSeconds * fps; ++i) {
      const f = new Frame(null, 0, 0, 1, 0, false);
      this.frames.push(f);
    }
    this.frames[0].anchor = true; // set first frame as anchor
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
    return Math.floor(time / 1000 * fps);
  }

  getTime(index: number, startTime: number): number {
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
