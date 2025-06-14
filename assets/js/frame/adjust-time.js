import {fps} from "../constants.js";
import {FrameCollection} from "./frames.js";

export class AdjustTimeHandler {
  /**
   *
   * @param {FrameCollection} framesCollection
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
      let f = new Float32Array(5);
      f[2] = 1; // scale
      this.framesCollection.push(f);
    }

  }
}