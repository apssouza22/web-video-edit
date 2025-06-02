/**
 * Class representing a timeline for a video player
 */
class Timeline {

  /**
   *
   * @param {VideoStudio} studio
   */
  constructor(studio) {
    this.studio = studio;
    this.selectedLayer = null;
    this.isHover = false;
    this.time = 0;
    this.playerTime = 0;
    this.layers = [];
    this.scale = 1.0;
    this.totalTime = 0;
    this.timelineCanvas = document.createElement('canvas');
    this.timelineCtx = this.timelineCanvas.getContext('2d');

    this.timelineHolder = document.getElementById('timeline');
    this.timelineHolder.appendChild(this.timelineCanvas);

    // Configuration for timeline elements
    this.layerHeight = 30; // Height per layer
    this.minLayerSpacing = 10; // Minimum space between layers
    this.contentPadding = 10; // Padding around content
    
    // Create time marker handler
    this.timeMarker = new TimeMarker({
      height: 20,
      spacing: 60
    });

    this.previewHandler = new PreviewHandler();
    this.dragHandler = new DragLayerHandler(this);
    this.timeUpdateListener = null;
    this.selectedLayerUpdateListener = null;

    this.#addEventListeners();
    this.#setupPinchHandler();
  }

  /**
   * Setter for time property that notifies listeners when time changes
   */
  setTime(newTime) {
    const oldTime = this.time;
    this.time = newTime;
    if (oldTime !== newTime) {
      this.timeUpdateListener(newTime, oldTime)
    }
  }


  /**
   * Add a listener for changes to the selected layer
   * @param {Function} listener - Function to call when selected layer changes
   */
  addSelectedLayerUpdateListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Selected layer update listener must be a function');
    }
    this.selectedLayerUpdateListener = listener;
  }

  /**
   * Setter for selectedLayer property that notifies listeners when selectedLayer changes
   * @param {StandardLayer|null} newSelectedLayer - The new selected layer
   */
  setSelectedLayer(newSelectedLayer) {
    const oldSelectedLayer = this.selectedLayer;
    this.selectedLayer = newSelectedLayer;
    if (oldSelectedLayer !== newSelectedLayer && this.selectedLayerUpdateListener) {
      this.selectedLayerUpdateListener(newSelectedLayer, oldSelectedLayer);
    }
  }

  addTimeUpdateListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Time update listener must be a function');
    }
    this.timeUpdateListener = listener
  }



  #setupPinchHandler() {
    const callback = (function (scale, rotation) {
      let new_x = (this.timelineHolder.clientWidth * scale - this.timelineHolder.clientWidth);
      let old_x = this.timelineHolder.scrollLeft;
      this.scale = Math.max(1, this.scale * scale);
      this.resize();
      this.timelineHolder.scroll(Math.round(old_x + new_x), 0);
    }).bind(this)

    const pinch = new PinchHandler(this.timelineHolder, callback, this.studio);
    pinch.setupEventListeners();
  }

  #addEventListeners() {
    this.timelineCanvas.addEventListener('pointerdown', this.#onPointerDown.bind(this));
    this.timelineCanvas.addEventListener('pointermove', this.#onPointerMove.bind(this), { passive: false });
    this.timelineCanvas.addEventListener('pointerleave', this.#onPointerLeave.bind(this));
    this.timelineCanvas.addEventListener('pointerup', this.#onPointerLeave.bind(this));
  }

  /**
   * Resize the timeline canvas based on the scale factor and number of layers
   */
  resize() {
    this.timelineCanvas.style.width = this.timelineHolder.clientWidth * this.scale;
    this.timelineCanvas.style.height = this.timelineHolder.clientHeight * this.scale;
    this.timelineCanvas.width = this.timelineCanvas.clientWidth * dpr;
    this.timelineCanvas.height = this.timelineCanvas.clientHeight * dpr;
    this.timelineCtx.scale(dpr, dpr);
  }

  /**
   * Start scrubbing at a specific event position
   * @param {Event} ev - The pointer event
   * @returns {boolean} - Whether a layer was selected
   */
  #onPointerDown(ev) {
    window.addEventListener('pointerup', this.#onPointerLeave.bind(this), {
      once: true
    });
    let rect = this.timelineCanvas.getBoundingClientRect();
    this.time = ev.offsetX / rect.width * this.totalTime;

    let mouseover = this.#selectLayer(ev);

    // can't drag unselected
    if (!this.selectedLayer || !mouseover) {
      return false;
    }

    this.dragHandler.startLayerDrag(this.selectedLayer, this.time);
  }

  /**
   * Handle scrubbing movement
   * @param {Event} ev - The pointer event
   * @returns {number} - The current time position
   */
  #onPointerMove(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    this.isHover = true;
    let rect = this.timelineCanvas.getBoundingClientRect();
    let time = ev.offsetX / rect.width * this.totalTime;

    document.body.style.cursor = "default";

    if (this.selectedLayer) {
      if (this.intersectsTime(this.selectedLayer.start_time, time)) {
        document.body.style.cursor = "col-resize";
      }
      if (this.intersectsTime(this.selectedLayer.start_time + this.selectedLayer.totalTimeInMilSeconds, time)) {
        document.body.style.cursor = "col-resize";
      }
    }

    this.previewHandler.updatePreview(ev, rect, time, this.totalTime);
    this.dragHandler.dragLayer(time, this.selectedLayer);
    this.setTime(time);
  }

  intersectsTime(time, query) {
    return Math.abs(query - time) / this.totalTime < 0.01;
  }

  /**
   * End the scrubbing operation
   */
  #onPointerLeave() {
    document.body.style.cursor = "default";
    this.previewHandler.previewHolder.style.display = "none";

    this.dragHandler.dragging = null;
    this.isHover = false;
  }

  /**
   * Render all layers in the timeline
   * @param {FlexibleLayer[]} layers - The layers to render
   */
  render(layers) {
    this.layers = layers;
    this.timelineCtx.clearRect(0, 0, this.timelineCanvas.clientWidth, this.timelineCanvas.clientWidth);
    this.#updateTotalTime(layers);
    this.#renderCurrentTimeLine(this.playerTime);

    if (this.isHover) {
      this.#renderCurrentTimeLine(this.time);
      this.previewHandler.render(this.time, layers);
    }

    let verticalPositionSpace = this.timelineCanvas.clientHeight / (layers.length + 1);
    let verticalPosition = this.timelineCanvas.clientHeight - verticalPositionSpace;

    for (let layer of layers) {
      let selected = this.selectedLayer === layer;
      this.#renderLayerTimeline(layer, verticalPosition, 3, selected);
      verticalPosition -= verticalPositionSpace;
    }

    this.timeMarker.render(this.timelineCtx, this.timelineCanvas.clientWidth, this.totalTime);
  }


  #renderCurrentTimeLine(time) {
    let x = this.timelineCanvas.clientWidth * time / this.totalTime;
    this.timelineCtx.fillStyle = `rgb(192,200,213)`;
    this.timelineCtx.fillRect(x, 0, 2, this.timelineCanvas.clientHeight);
    this.timelineCtx.font = "10px sans-serif";
    this.timelineCtx.fillText(time.toFixed(2), x + 5, 10);
    this.timelineCtx.fillText(this.totalTime.toFixed(2), x + 5, 20);
  }



  /**
   * Select a layer based on the event position
   * @param {Event} ev - The pointer event
   * @returns {boolean} - Whether a layer was selected
   */
  #selectLayer(ev) {
    let verticalSpacing = this.timelineCanvas.clientHeight / (this.layers.length + 1);
    let verticalPosition = this.timelineCanvas.clientHeight;

    for (let layer of this.layers) {
      verticalPosition -= verticalSpacing;
      if (!this.#canSelectLayer(layer)) {
        continue;
      }
      //checks if ev.offsetY is within 5% of the height of the timeline canvas
      if (Math.abs(ev.offsetY - verticalPosition) < (0.05 * this.timelineCanvas.clientHeight)) {
        this.setSelectedLayer(layer);
        return true;
      }
    }
    return false;
  }


  /**
   * Ensures that only layers overlapping or near the current time (with a small margin of 1%)
   * are considered for further processing. Layers outside this range are ignored.
   * @param {StandardLayer} layer - The layer to check
   * @returns {boolean} - Whether the layer can be selected
   */
  #canSelectLayer(layer) {
    if (layer.start_time > (1.01 * this.time)) {
      return false;
    }

    if (layer.start_time + layer.totalTimeInMilSeconds < (0.99 * this.time)) {
      return false;
    }
    return true;
  }

  /**
   * Update the total time of the player based on the layers
   * 
   * @param {StandardLayer[]} layers - The layers to check
   */
  #updateTotalTime(layers) {
    for (let layer of layers) {
      if (layer.start_time + layer.totalTimeInMilSeconds > this.totalTime) {
        this.totalTime = layer.start_time + layer.totalTimeInMilSeconds;
      }
    }
  }


  /**
   * Render a single layer in the timeline
   * @param {StandardLayer} layer - The layer to render
   * @param {number} y_coord - The y coordinate to render at
   * @param {number} width - The width of the layer track
   * @param {boolean} selected - Whether the layer is selected
   */
  #renderLayerTimeline(layer, y_coord, width, selected) {
    let scale = this.timelineCanvas.clientWidth / this.totalTime;
    let start = scale * layer.start_time;
    let length = scale * layer.totalTimeInMilSeconds;

    if (selected) {
      this.timelineCtx.fillStyle = `rgb(59, 206, 43)`;
    } else {
      this.timelineCtx.fillStyle = `rgb(192, 200, 213)`;
    }

    // Draw the main layer track
    this.timelineCtx.fillRect(start, y_coord - width / 2, length, width);

    // Draw the start/end tabs
    let end_width = width * 6;
    let tab_width = 2;
    this.timelineCtx.fillRect(start, y_coord - end_width / 2, tab_width, end_width);
    this.timelineCtx.fillRect(start + length - tab_width / 2, y_coord - end_width / 2, tab_width, end_width);
  }
}

