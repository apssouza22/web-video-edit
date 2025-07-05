import { fps } from "../constants.js";
import { FrameService } from "./frames.js";
import { Frame } from "./frame.js";

export class FrameAdjustHandler {
  /**
   *
   * @param {FrameService} framesCollection
   */
  constructor(framesCollection) {
    this.framesCollection = framesCollection;
  }

  adjust(diff) {
    this.framesCollection.totalTimeInMilSeconds = Math.max(1000 / fps, this.framesCollection.totalTimeInMilSeconds + diff); // Minimum one frame duration

    const oldNumFrames = this.framesCollection.getLength();
    const newNumFrames = Math.floor((this.framesCollection.totalTimeInMilSeconds / 1000) * fps);
    const frameDiff = newNumFrames - oldNumFrames;

    if (frameDiff === 0) {
      return;
    }

    if (frameDiff > 0) {
      this.#handleAddFrame(oldNumFrames, frameDiff, diff);
      return;
    }
    this.#handleRemoveFrame(frameDiff, oldNumFrames, newNumFrames, diff);

  }

  /**
   * Removes a video interval by removing frames from the layer
   * @param {number} startTime - Start time in seconds to remove
   * @param {number} endTime - End time in seconds to remove
   * @returns {boolean} True if the interval was removed successfully
   */
  removeInterval(startTime, endTime) {
    if (!this.framesCollection || startTime >= endTime || startTime < 0) {
      console.error('Invalid parameters for removeInterval on FrameAdjustHandler');
      return false;
    }

    const totalDuration = this.framesCollection.totalTimeInMilSeconds / 1000;
    
    // Clamp times to valid ranges
    const clampedStartTime = Math.max(0, Math.min(startTime, totalDuration));
    const clampedEndTime = Math.max(clampedStartTime, Math.min(endTime, totalDuration));
    
    // Convert time to frame indices
    const startFrameIndex = Math.floor(clampedStartTime * fps);
    const endFrameIndex = Math.ceil(clampedEndTime * fps);
    
    // Clamp to valid frame ranges
    const totalFrames = this.framesCollection.getLength();
    const clampedStartFrame = Math.max(0, Math.min(startFrameIndex, totalFrames));
    const clampedEndFrame = Math.max(clampedStartFrame, Math.min(endFrameIndex, totalFrames));
    
    const framesToRemove = clampedEndFrame - clampedStartFrame;
    
    if (framesToRemove <= 0) {
      console.log(`No frames to remove from frame collection`);
      return false;
    }
    
    if (framesToRemove >= totalFrames) {
      console.warn(`Removing interval would result in empty frame collection`);
      // Keep at least one frame to avoid empty collection
      this.framesCollection.slice(1, totalFrames - 1);
      this.framesCollection.totalTimeInMilSeconds = 1000 / fps; // Duration of one frame
      return true;
    }
    
    // Remove the frames from the collection
    this.framesCollection.slice(clampedStartFrame, framesToRemove);
    
    // Update the total time
    const removedDuration = (clampedEndTime - clampedStartTime) * 1000;
    this.framesCollection.totalTimeInMilSeconds = Math.max(0, this.framesCollection.totalTimeInMilSeconds - removedDuration);
    
    console.log(`Removed video interval ${clampedStartTime}s-${clampedEndTime}s. Removed ${framesToRemove} frames. New duration: ${this.framesCollection.totalTimeInMilSeconds / 1000}s`);
    
    return true;
  }

  #handleRemoveFrame(frameDiff, oldNumFrames, newNumFrames, diff) {
    const framesToRemove = Math.abs(frameDiff);
    if (framesToRemove >= oldNumFrames) {
      console.warn(`Reducing video would result in empty layer. Keeping one frame.`);
      // Keep only the first frame
      this.framesCollection.frames.splice(1, oldNumFrames - 1);
      this.framesCollection.totalTimeInMilSeconds = 1000 / fps;
      return
    }

    this.framesCollection.frames.splice(newNumFrames, framesToRemove);
  }

  #handleAddFrame(oldNumFrames, frameDiff, diff) {
    const lastFrame = this.framesCollection.frames[oldNumFrames - 1];
    if (lastFrame instanceof ImageData) {
      // Create copies of the last frame to extend the video
      for (let i = 0; i < frameDiff; i++) {
        const newFrame = new ImageData(
            new Uint8ClampedArray(lastFrame.data),
            lastFrame.width,
            lastFrame.height
        );
        this.framesCollection.frames.push(newFrame);
      }
      console.log(`Extended video layer by ${diff}ms, added ${frameDiff} frames. New duration: ${this.framesCollection.totalTimeInMilSeconds / 1000}s`);
      return
    }
    for (let i = 0; i < frameDiff; ++i) {
      let f = new Frame(null, 0, 0, 1, 0, false);
      this.framesCollection.push(f);
    }

  }
}