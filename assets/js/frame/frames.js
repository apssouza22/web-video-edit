import {fps} from '../constants.js';
import {FrameAdjustHandler} from './frame-adjust.js';
import {Frame} from './frame.js';

export class FrameService {
  /**
   * @type {Array<Frame>}
   * @description Array of Frame objects containing x, y, scale, rotation, anchor, and frame properties
   */
  frames = [];
  totalTimeInSeconds = 0
  startTime = 0

  /**
   *
   * @param {number} milSeconds
   * @param startTime
   * @param flexibleLayer
   */
  constructor(milSeconds, startTime, flexibleLayer = true) {
    this.start_time = startTime
    this.totalTimeInMilSeconds = milSeconds
    this.totalTimeInSeconds = milSeconds / 1000
    this.timeAdjustHandler = new FrameAdjustHandler(this);
    if (flexibleLayer) {
      this.initializeFrames();
    }
  }

  adjustTotalTime(diff) {
    this.timeAdjustHandler.adjust(diff)
  }

  getTotalTimeInMilSec() {
    return this.totalTimeInMilSeconds
  }

  calculateTotalTimeInMilSec() {
    return  this.frames.length / fps * 1000;
  }

  initializeFrames() {
    for (let i = 0; i < this.totalTimeInSeconds * fps; ++i) {
      let f = new Frame(null, 0, 0, 1, 0, false);
      this.frames.push(f);
    }
    this.frames[0].anchor = true; // set first frame as anchor
  }

  getLength() {
    return this.frames.length
  }

  push(f) {
    const frame = f instanceof Frame ? f : Frame.fromArray(f);
    this.frames.push(frame);
  }

  /**
   *
   * @param {number} start
   * @param {number} deleteCount
   */
  slice(start, deleteCount) {
    this.frames.splice(start, deleteCount);
  }

  setAnchor(index) {
    this.frames[index].anchor = true;
  }

  isAnchor(index) {
    return this.frames[index].anchor;
  }

  /**
   * Gets the frame at the specified reference time
   * @param referenceTime
   * @param startTime
   * @returns {Frame|null}
   */
  getFrame(referenceTime, startTime) {
    this.startTime = startTime
    let index = this.getIndex(referenceTime, startTime);
    if (index < 0 || index >= this.frames.length) {
      return null;
    }
    let currentFrame = this.frames[index].clone();

    if (index + 1 < this.frames.length) {
      const currentFrameTime = referenceTime - this.getTime(index, startTime);
      const nextFrameTime = this.getTime(index + 1, startTime) - referenceTime;
      let interpolationFactor = nextFrameTime / (currentFrameTime + nextFrameTime);
      let nextFrame = this.frames[index + 1];
      currentFrame = currentFrame.interpolate(nextFrame, interpolationFactor);
    }
    return currentFrame;
  }

  /**
   * Gets the index of the frame at the specified reference time
   * @param {number} currentTime - The time to get the index for
   * @param {number} startTime - The start time of the layer
   * @returns {number} - The index of the frame at the specified time
   */
  getIndex(currentTime, startTime) {
    let time = currentTime - startTime;
    return Math.floor(time / 1000 * fps);
  }

  getTime(index, startTime) {
    return (index / fps * 1000) + startTime;
  }

  /**
   * Linear interpolation between two values
   * @param {number} a - Start value
   * @param {number} b - End value
   * @param {number} t - Interpolation factor (0-1)
   * @returns {number} - Interpolated value
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Interpolates between two frames
   * Get a frame at a specific time might fall between two existing frames in the collection.
   * Rather than simply jumping to the nearest frame (which would create jerky animations),
   * this function creates a blended transition
   *
   * @param {Frame} f0 - first frame
   * @param {Frame} f1 - second frame
   * @param {number} weight - A value between 0 and 1 that represents the position between the frames
   * @returns {Frame} - interpolated frame
   */
  interpolateFrame(f0, f1, weight) {
    return f0.interpolate(f1, weight);
  }

  removeInterval(startTime, endTime) {
    return this.timeAdjustHandler.removeInterval(startTime, endTime);
  }

  copy() {
    return this.frames.map(frame => frame.clone());
  }

  update(index, frame) {
    this.frames[index] = frame instanceof Frame ? frame : Frame.fromArray(frame);
  }

  /**
   * Backward compatibility: Get frame as Float32Array
   * @param {number} index - Frame index
   * @returns {Float32Array|null}
   */
  getFrameAsArray(index) {
    if (index < 0 || index >= this.frames.length) {
      return null;
    }
    return this.frames[index].toArray();
  }

  /**
   * Backward compatibility: Set frame from Float32Array
   * @param {number} index - Frame index
   * @param {Float32Array} array - Frame data as array
   */
  setFrameFromArray(index, array) {
    if (index >= 0 && index < this.frames.length) {
      this.frames[index] = Frame.fromArray(array);
    }
  }
}