import { fps } from "@/constants";
import { FrameService } from "./frames";
import { Frame } from "./frame";

export class FrameAdjustHandler {
  private framesCollection: FrameService;

  constructor(framesCollection: FrameService) {
    this.framesCollection = framesCollection;
  }

  adjust(diff: number): void {
    this.framesCollection.totalTimeInMilSeconds = Math.max(
      1000 / fps, 
      this.framesCollection.totalTimeInMilSeconds + diff
    ); // Minimum one frame duration

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
   */
  removeInterval(startTime: number, endTime: number): boolean {
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
    this.framesCollection.totalTimeInMilSeconds = Math.max(
      0, 
      this.framesCollection.totalTimeInMilSeconds - removedDuration
    );
    
    console.log(
      `Removed video interval ${clampedStartTime}s-${clampedEndTime}s. ` +
      `Removed ${framesToRemove} frames. ` +
      `New duration: ${this.framesCollection.totalTimeInMilSeconds / 1000}s`
    );
    
    return true;
  }

  #handleRemoveFrame(
    frameDiff: number, 
    oldNumFrames: number, 
    newNumFrames: number, 
    diff: number
  ): void {
    const framesToRemove = Math.abs(frameDiff);
    if (framesToRemove >= oldNumFrames) {
      console.warn(`Reducing video would result in empty layer. Keeping one frame.`);
      // Keep only the first frame
      this.framesCollection.frames.splice(1, oldNumFrames - 1);
      this.framesCollection.totalTimeInMilSeconds = 1000 / fps;
      return;
    }

    this.framesCollection.frames.splice(newNumFrames, framesToRemove);
  }

  #handleAddFrame(oldNumFrames: number, frameDiff: number, diff: number): void {
    const lastFrame = this.framesCollection.frames[oldNumFrames - 1];
    
    // Check if the last frame is ImageData for special handling
    if (lastFrame.frame instanceof ImageData) {
      // Create copies of the last frame to extend the video
      for (let i = 0; i < frameDiff; i++) {
        const imageData = lastFrame.frame as ImageData;
        const newImageData = new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height
        );
        const newFrame = new Frame(
          newImageData,
          lastFrame.x,
          lastFrame.y,
          lastFrame.scale,
          lastFrame.rotation,
          lastFrame.anchor
        );
        this.framesCollection.frames.push(newFrame);
      }
      console.log(
        `Extended video layer by ${diff}ms, added ${frameDiff} frames. ` +
        `New duration: ${this.framesCollection.totalTimeInMilSeconds / 1000}s`
      );
      return;
    }
    
    // Default case: add empty frames
    for (let i = 0; i < frameDiff; ++i) {
      const f = new Frame(null, 0, 0, 1, 0, false);
      this.framesCollection.push(f);
    }
  }
}
