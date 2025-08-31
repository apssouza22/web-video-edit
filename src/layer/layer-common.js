import {createFrameService} from '../frame/index.js';
import {Canvas2DRender} from '../common/render-2d.js';
import {SpeedController} from './speed-controller.js';

export class StandardLayer {
  audioBuffer = null;
  constructor(file) {
    this.file = file
    this.name = file.name;
    this.id = this.name + "-" + crypto.randomUUID();
    this.description = null;
    if (file.uri) {
      this.uri = file.uri;
    }
    this.ready = false;
    this.totalTimeInMilSeconds = 0;
    this.start_time = 0;
    this.width = 0;
    this.height = 0;
    this.renderer = new Canvas2DRender();
    this.loadUpdateListener = (layer, progress, ctx, audioBuffer) => {
    };
    this.lastRenderedTime = -1; // Track last rendered time for caching

    this.framesCollection = createFrameService(this.totalTimeInMilSeconds, this.start_time, false)
    this.speedController = new SpeedController(this); // Initialize speed controller
    addElementToBackground(this.renderer.canvas);
    this.updateName(this.name);
  }

  // Getters for backward compatibility
  get canvas() {
    return this.renderer.canvas;
  }

  get ctx() {
    return this.renderer.context;
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
    if(this.audioBuffer) {
      console.log("Audio layer cannot adjust total time");
      return;
    }
    this.framesCollection.adjustTotalTime(diff);
    this.totalTimeInMilSeconds =  this.framesCollection.getTotalTimeInMilSec();
    this.#resetRenderCache();
  }


  /**
   * Checks if the layer is visible at the given time
   * @param {number} time - The time to check
   * @returns {boolean} - Whether the layer is visible at the given time
   */
  isLayerVisible(time) {
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
   * @returns {boolean} - Whether the layer needs to be rendered
   */
  shouldReRender(currentTime) {
    // Only re-render if time has changed
    return currentTime !== this.lastRenderedTime;
  }

  /**
   * Updates the rendering cache information
   * @param {number} currentTime - The current time that was rendered
   */
  updateRenderCache(currentTime) {
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
    this.renderer.setSize(canvasWidth, canvasHeight);
  }

  resize(width, height) {
    console.log("Resizing layer to width:", width, "height:", height);
    this.renderer.setSize(width, height);
    this.#resetRenderCache();
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
      const newScale = f.scale * change.scale;
      const canvasWidth = this.renderer.width;
      const canvasHeight = this.renderer.height;

      for (let i = 0; i < this.framesCollection.getLength(); ++i) {
        const frame = this.framesCollection.frames[i];
        const distanceFromCenterX = frame.x - (canvasWidth / 2);
        const distanceFromCenterY = frame.y - (canvasHeight / 2);
        const scaleFactor = newScale / frame.scale;
        const newDistanceFromCenterX = distanceFromCenterX * scaleFactor;
        const newDistanceFromCenterY = distanceFromCenterY * scaleFactor;

        frame.x = (canvasWidth / 2) + newDistanceFromCenterX;
        frame.y = (canvasHeight / 2) + newDistanceFromCenterY;
        frame.scale = newScale;
      }
      hasChanges = true;
    }

    if (change.x) {
      for (let i = 0; i < this.framesCollection.getLength(); ++i) {
        this.framesCollection.frames[i].x = change.x;
      }
      hasChanges = true;
    }

    if (change.y) {
      for (let i = 0; i < this.framesCollection.getLength(); ++i) {
        this.framesCollection.frames[i].y = change.y;
      }
      hasChanges = true;
    }

    if (change.rotation) {
      for (let i = 0; i < this.framesCollection.getLength(); ++i) {
        this.framesCollection.frames[i].rotation = f.rotation + change.rotation;
      }
      hasChanges = true;
    }

    // Reset the render cache if any changes were made
    if (hasChanges) {
      this.#resetRenderCache();
    }
  }

  /**
   * Gets the frame at the specified reference time
   * @param ref_time
   * @returns {Frame|null}
   */
  getFrame(ref_time) {
    return this.framesCollection.getFrame(ref_time, this.start_time)
  }

  drawScaled(ctxFrom, ctxOutTo, video = false) {
    Canvas2DRender.drawScaled(ctxFrom, ctxOutTo, video);
  }

  // Speed control methods
  setSpeed(speed) {
    this.speedController.setSpeed(speed);
  }

  getSpeed() {
    return this.speedController.getSpeed();
  }
}

/**
 * Non-video layers that can be resized and have their total time adjusted.
 */
export class FlexibleLayer extends StandardLayer {
  constructor(file) {
    super(file);
    this.totalTimeInMilSeconds = 2 * 1000;
    this.framesCollection = createFrameService(this.totalTimeInMilSeconds, this.start_time)
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

/**
 * Add an element to the background so it can be used but not shown in the main view.
 * @param elem
 */
export function addElementToBackground(elem) {
  let bg = document.getElementById('background');
  bg.appendChild(elem);
}