class StandardLayer {
  constructor(file) {
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
    this.ctx = this.canvas.getContext('2d', {willReadFrequently: true});
    this.loadUpdateListener = (progress, ctx) => {
    };
    this.lastRenderedTime = -1; // Track last rendered time for caching

    this.framesCollection = new FrameCollection(this.totalTimeInMilSeconds, this.start_time, false)
    addElementToBackground(this.canvas);
    this.updateName(this.name);
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
  resetRenderCache() {
    this.lastRenderedTime = -1;
  }

  init(canvasWidth = 500, canvasHeight = null, audioContext=null) {
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
      this.resetRenderCache();
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
class FlexibleLayer extends StandardLayer {
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

  /**
   *
   * @param {number} diff
   */
  adjustTotalTime(diff) {
    this.totalTimeInMilSeconds += diff;
    const numFrames = Math.floor((this.totalTimeInMilSeconds / 1000) * fps - this.framesCollection.getLength());
    if (numFrames === 0) {
      return;
    }

    // Add frames
    if (numFrames > 0) {
      for (let i = 0; i < numFrames; ++i) {
        let f = new Float32Array(5);
        f[2] = 1; // scale
        this.framesCollection.push(f);
      }
      return
    }
    // Remove frames
    this.framesCollection.slice(
        this.framesCollection.getLength() + numFrames + 1,
        1 - numFrames
    );
  }

}

function drawScaled(ctxFrom, ctxOutTo, video = false) {
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
function addElementToBackground(elem) {
  let bg = document.getElementById('background');
  bg.appendChild(elem);
}