import { FrameCollection } from './frames.js';
import { dpr, fps } from '../constants.js';

export class StandardLayer {
  constructor(file) {
    this.file = file
    this.name = file.name;
    this.id = this.name + "-" + crypto.randomUUID();
    this.description = null;
    if (file.uri) {
      this.uri = file.uri;
    }
    this.thumb_ctx = null;
    this.ready = false;
    this.totalTimeInMilSeconds = 0;
    this.start_time = 0;
    this.width = 0;
    this.height = 0;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.loadUpdateListener = (layer, progress, ctx, audioBuffer) => {
    };
    this.lastRenderedTime = -1; // Track last rendered time for caching

    this.framesCollection = new FrameCollection(this.totalTimeInMilSeconds, this.start_time, false)
    addElementToBackground(this.canvas);
    this.updateName(this.name);
  }


  /**
   * Adjusts the total time of the video layer by adding or removing frames
   * @param {number} diff - Time difference in milliseconds (positive to extend, negative to reduce)
   */
  adjustTotalTime(diff) {
    if (!this.ready || !this.framesCollection) {
      console.warn('VideoLayer not ready or frames collection not available');
      return;
    }

    this.totalTimeInMilSeconds = Math.max(1000 / fps, this.totalTimeInMilSeconds + diff); // Minimum one frame duration

    const oldNumFrames = this.framesCollection.getLength();
    const newNumFrames = Math.floor((this.totalTimeInMilSeconds / 1000) * fps);
    const frameDiff = newNumFrames - oldNumFrames;

    if (frameDiff === 0) {
      return;
    }

    // Adding frames (extending video) - duplicate the last frame
    if (frameDiff > 0) {
      const lastFrame = this.framesCollection.frames[oldNumFrames - 1];
      if (lastFrame instanceof ImageData) {
        // Create copies of the last frame to extend the video
        for (let i = 0; i < frameDiff; i++) {
          // Create a new ImageData with the same dimensions and data
          const newFrame = new ImageData(
            new Uint8ClampedArray(lastFrame.data),
            lastFrame.width,
            lastFrame.height
          );
          this.framesCollection.frames.push(newFrame);
        }
        console.log(`Extended video layer "${this.name}" by ${diff}ms, added ${frameDiff} frames. New duration: ${this.totalTimeInMilSeconds / 1000}s`);
      } else {
        for (let i = 0; i < frameDiff; ++i) {
          let f = new Float32Array(5);
          f[2] = 1; // scale
          this.framesCollection.push(f);
        }
      }
      return;
    }

    // Removing frames (reducing video) - remove from the end
    const framesToRemove = Math.abs(frameDiff);
    if (framesToRemove >= oldNumFrames) {
      console.warn(`Reducing video would result in empty layer: "${this.name}". Keeping one frame.`);
      // Keep only the first frame
      this.framesCollection.frames.splice(1, oldNumFrames - 1);
      this.totalTimeInMilSeconds = 1000 / fps;
    } else {
      this.framesCollection.frames.splice(newNumFrames, framesToRemove);
      console.log(`Reduced video layer "${this.name}" by ${Math.abs(diff)}ms, removed ${framesToRemove} frames. New duration: ${this.totalTimeInMilSeconds / 1000}s`);
    }

    // Reset render cache since the video duration changed
    this.#resetRenderCache();
  }


  /**
   * Checks if the layer is visible at the given time
   * @param {number} time - The time to check
   * @returns {boolean} - Whether the layer is visible at the given time
   */
  isLayerTime(time) {
    return time >= this.start_time && time < this.start_time + this.totalTimeInMilSeconds;
  }


  /**
   * Listens for the load event and calls the provided function when the layer is ready
   * @param {Function} listener - The function to call when the layer is ready
   */
  addLoadUpdateListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error('onLoadUpdate listener must be a function');
    }
    this.loadUpdateListener = listener;
  }

  updateName(name) {
    this.name = name;
  }

  dump() {
    return {
      width: this.width,
      height: this.height,
      name: this.name,
      start_time: this.start_time,
      total_time: this.totalTimeInMilSeconds,
      uri: this.uri,
      type: this.constructor.name
    };
  }

  render(ctxOut, currentTime, playing = false) {
    // This is the base render method that subclasses should override
    // It now includes caching logic to avoid redundant rendering
    console.log("render not implemented");
  }

  /**
   * Checks if the layer needs to be rendered again based on time and playing state
   * @param {number} currentTime - The current time of the player
   * @param {boolean} playing - Whether the player is currently playing
   * @returns {boolean} - Whether the layer needs to be rendered
   */
  shouldRender(currentTime, playing) {
    // Only re-render if time has changed
    return currentTime !== this.lastRenderedTime;
  }

  /**
   * Updates the rendering cache information
   * @param {number} currentTime - The current time that was rendered
   * @param {boolean} playing - The current playing state
   */
  updateRenderCache(currentTime, playing) {
    this.lastRenderedTime = currentTime;
  }

  /**
   * Resets the rendering cache, forcing a re-render on next frame
   * Call this method after operations that change the visual appearance
   * like updates to position, scale, or rotation
   */
  #resetRenderCache() {
    this.lastRenderedTime = -1;
  }

  init(canvasWidth = 500, canvasHeight = null, audioContext = null) {
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight == null ? (canvasWidth / 16) * 9 : canvasHeight // 16:9 aspect ratio
  }

  /**
   * Updates the frame at the specified reference time with the provided changes
   *
   * NOTICE: Currently ignores the reference time and applies changes to all frames.
   *
   * @param {Object} change - The changes to apply
   * @param {number} referenceTime - The time to apply the changes at
   */
  update(change, referenceTime) {
    let f = this.getFrame(referenceTime);
    if (!f) {
      return;
    }

    let hasChanges = false;

    if (change.scale) {
      const newScale = f[2] * change.scale;
      for (let i = 0; i < this.framesCollection.getLength(); ++i) {
        this.framesCollection.frames[i][2] = newScale;
      }
      hasChanges = true;
    }

    if (change.x) {
      for (let i = 0; i < this.framesCollection.getLength(); ++i) {
        this.framesCollection.frames[i][0] = change.x;
      }
      hasChanges = true;
    }

    if (change.y) {
      for (let i = 0; i < this.framesCollection.getLength(); ++i) {
        this.framesCollection.frames[i][1] = change.y;
      }
      hasChanges = true;
    }

    if (change.rotation) {
      for (let i = 0; i < this.framesCollection.getLength(); ++i) {
        this.framesCollection.frames[i][3] = f[3] + change.rotation;
      }
      hasChanges = true;
    }

    // Reset the render cache if any changes were made
    if (hasChanges) {
      this.#resetRenderCache();
    }
  }

  getFrame(ref_time) {
    return this.framesCollection.getFrame(ref_time, this.start_time)
  }

  drawScaled(ctxFrom, ctxOutTo, video = false) {
    drawScaled(ctxFrom, ctxOutTo, video);
  }
}

/**
 * Non-video layers that can be resized and have their total time adjusted.
 */
export class FlexibleLayer extends StandardLayer {
  constructor(file) {
    super(file);
    this.totalTimeInMilSeconds = 2 * 1000;
    this.framesCollection = new FrameCollection(this.totalTimeInMilSeconds, this.start_time)
  }

  dump() {
    let obj = super.dump();
    obj.frames = [];
    for (let f of this.framesCollection.frames) {
      obj.frames.push(Array.from(f));
    }
    return obj;
  }


}

export function drawScaled(ctxFrom, ctxOutTo, video = false) {
  const width = video ? ctxFrom.videoWidth : ctxFrom.canvas.clientWidth;
  const height = video ? ctxFrom.videoHeight : ctxFrom.canvas.clientHeight;
  const in_ratio = width / height;

  // Use logical dimensions (buffer dimensions divided by device pixel ratio)
  const outLogicalWidth = ctxOutTo.canvas.width / dpr;
  const outLogicalHeight = ctxOutTo.canvas.height / dpr;
  const out_ratio = outLogicalWidth / outLogicalHeight;

  let ratio = 1;
  let offset_width = 0;
  let offset_height = 0;
  if (in_ratio > out_ratio) { // input is wider
    // match width
    ratio = outLogicalWidth / width;
    offset_height = (outLogicalHeight - (ratio * height)) / 2;
  } else { // output is wider
    // match height
    ratio = outLogicalHeight / height;
    offset_width = (outLogicalWidth - (ratio * width)) / 2;
  }
  ctxOutTo.drawImage(
    (video ? ctxFrom : ctxFrom.canvas),
    0, 0, width, height,
    offset_width, offset_height, ratio * width, ratio * height
  );
}

/**
 * Add an element to the background so it can be used but not shown in the main view.
 * @param elem
 */
export function addElementToBackground(elem) {
  let bg = document.getElementById('background');
  bg.appendChild(elem);
}