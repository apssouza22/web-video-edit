import {TimeMarker} from './time-marker.js';
import {TimelineZoomHandler} from './zoom.js';
import {PreviewHandler} from './preview.js';
import {DragLayerHandler} from './drag.js';
import {TimelineLayerRender} from './tllayer-render.js';
import {PinchHandler} from '../studio/index.js';
import {dpr} from '../constants.js';

/**
 * Class representing a timeline for a video player
 */
export class Timeline {

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
    this.scale = 2.0;
    this.totalTime = 0;
    this.timelineCanvas = document.createElement('canvas');
    this.timelineCtx = this.timelineCanvas.getContext('2d');

    this.timelineHolder = document.getElementById('timeline_content');
    this.timelineHolder.appendChild(this.timelineCanvas);

    // Configuration for timeline elements
    this.layerHeight = 35; // Height per layer
    this.minLayerSpacing = 10; // Minimum space between layers
    this.contentPadding = 15; // Padding around content

    this.timeMarker = new TimeMarker({
      height: 25,
      spacing: 60
    });

    // Initialize layer renderer
    this.layerRenderer = new TimelineLayerRender(
        this.timelineCtx,
        this.totalTime,
        this.timelineCanvas.clientWidth
    );

    this.previewHandler = new PreviewHandler();
    this.dragHandler = new DragLayerHandler(this);
    this.timeUpdateListener = null;
    this.layerUpdateListener = null;

    this.#addEventListeners();
    this.#setupPinchHandler();
  }

  /**
   * Setter for time property that notifies listeners when time changes
   */
  setTime(newTime) {
    this.time = newTime;
  }

  #onClick() {
    this.timeUpdateListener(this.time, this.playerTime);
  }

  /**
   * Add a listener for layer updates
   * @param {Function} listener - Function to call when layer updates occur
   */
  addLayerUpdateListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Layer update listener must be a function');
    }
    this.layerUpdateListener = listener;
  }

  /**
   * Setter for selectedLayer property that notifies listeners when selectedLayer changes
   * @param {StandardLayer|null} newSelectedLayer - The new selected layer
   */
  setSelectedLayer(newSelectedLayer) {
    const oldSelectedLayer = this.selectedLayer;
    this.selectedLayer = newSelectedLayer;
    if (oldSelectedLayer !== newSelectedLayer && this.layerUpdateListener) {
      this.layerUpdateListener('select', newSelectedLayer, oldSelectedLayer);
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
      // this.timelineHolder.scroll(Math.round(old_x + new_x), 0);

      this.scale = Math.max(1, this.scale * scale);
      this.resize();
      // Update the zoom slider to match the current scale
      if (this.zoomHandler) {
        this.zoomHandler.updateSliderValue();
      }
    }).bind(this)

    const pinch = new PinchHandler(this.timelineHolder, callback, this.studio);
    pinch.setupEventListeners();

    this.zoomHandler = new TimelineZoomHandler(this);
  }

  #addEventListeners() {
    this.timelineCanvas.addEventListener('pointerdown', this.#onPointerDown.bind(this));
    this.timelineCanvas.addEventListener('pointermove', this.#onPointerMove.bind(this), {passive: false});
    this.timelineCanvas.addEventListener('pointerleave', this.#onPointerLeave.bind(this));
    this.timelineCanvas.addEventListener('pointerup', this.#onPointerLeave.bind(this));
    this.timelineCanvas.addEventListener('click', this.#onClick.bind(this));
    this.#setupTimelineHeaderButtons();
  }

  /**
   * Set up click event listeners for timeline header buttons
   * @private
   */
  #setupTimelineHeaderButtons() {
    // Get buttons by their specific IDs
    const deleteButton = document.getElementById('delete-button');
    const splitButton = document.getElementById('split-button');
    const cloneButton = document.getElementById('clone-button');

    deleteButton.addEventListener('click', () => {
      if (!this.selectedLayer) {
        console.log('No layer selected. Please select a layer first.');
        return;
      }
      this.layerUpdateListener('delete', this.selectedLayer, null);
    });

    splitButton.addEventListener('click', () => {
      if (!this.selectedLayer) {
        console.log('No layer selected. Please select a layer first.');
        return;
      }
      this.layerUpdateListener('split', this.selectedLayer, null);
    });

    cloneButton.addEventListener('click', () => {
      if (!this.selectedLayer) {
        console.log('No layer selected. Please select a layer first.');
        return;
      }
      this.layerUpdateListener('clone', this.selectedLayer, null);
    });
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
      const endTime = this.selectedLayer.start_time + this.selectedLayer.totalTimeInMilSeconds;
      if (this.intersectsTime(endTime, time)) {
        document.body.style.cursor = "col-resize";
      }
    }

    this.previewHandler.updatePreview(ev, this.timelineHolder, time, this.totalTime);
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
    this.timelineCtx.clearRect(0, 0, this.timelineCanvas.clientWidth, this.timelineCanvas.clientHeight);
    this.#updateTotalTime(layers);
    this.layerRenderer.updateProperties(this.totalTime, this.timelineCanvas.clientWidth);

    // Skip rendering if no layers or invalid canvas dimensions
    if (layers.length === 0 || this.timelineCanvas.clientHeight <= 0 || this.timelineCanvas.clientWidth <= 0) {
      this.timeMarker.render(this.timelineCtx, this.timelineCanvas.clientWidth, this.totalTime);
      return;
    }

    const availableHeight = this.timelineCanvas.clientHeight - this.timeMarker.height - this.contentPadding;
    if (availableHeight <= 0) {
      this.timeMarker.render(this.timelineCtx, this.timelineCanvas.clientWidth, this.totalTime);
      return;
    }

    // Calculate vertical positions starting from top (below time marker)
    const layerSpacing = this.minLayerSpacing + this.layerHeight;

    let yPos = this.timeMarker.height + this.contentPadding + (layerSpacing / 2);

    for (let layer of layers) {
      let selected = this.selectedLayer === layer;
      this.layerRenderer.renderLayer(layer, yPos, this.layerHeight, selected);
      yPos += layerSpacing;
    }

    this.timeMarker.render(this.timelineCtx, this.timelineCanvas.clientWidth, this.totalTime);
    this.#renderLineMarker(this.playerTime);
    console.log(this.playerTime)

    if (this.isHover) {
      this.#renderLineMarker(this.time);
      this.previewHandler.render(this.time, layers);
    }
  }

  /**
   * Select a layer based on the event position with updated top-down positioning
   * @param {Event} ev - The pointer event
   * @returns {boolean} - Whether a layer was selected
   */
  #selectLayer(ev) {
    const layerSpacing = this.minLayerSpacing + this.layerHeight;
    let yPos = this.timeMarker.height + this.contentPadding + (layerSpacing / 2);

    for (let layer of this.layers) {
      if (!this.#canSelectLayer(layer)) {
        yPos += layerSpacing;
        continue;
      }

      // Check if click is within the layer's vertical bounds
      const layerTop = yPos - this.layerHeight / 2;
      const layerBottom = yPos + this.layerHeight / 2;

      if (ev.offsetY >= layerTop && ev.offsetY <= layerBottom) {
        this.setSelectedLayer(layer);
        return true;
      }

      yPos += layerSpacing;
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

  #updateTotalTime(layers) {
    if (layers.length === 0) {
      this.totalTime = 0;
      return;
    }

    this.totalTime = 0;
    for (let layer of layers) {
      const layerEndTime = layer.start_time + layer.totalTimeInMilSeconds;
      if (layerEndTime > this.totalTime) {
        this.totalTime = layerEndTime;
      }
    }
  }

  #renderLineMarker(time) {
    if (this.totalTime === 0) {
      return;
    }

    const scale = this.timelineCanvas.clientWidth / this.totalTime;
    const markerX = time * scale;

    // Draw the main line marker
    this.timelineCtx.beginPath();
    this.timelineCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    this.timelineCtx.lineWidth = 2;
    this.timelineCtx.moveTo(markerX, 0);
    this.timelineCtx.lineTo(markerX, this.timelineCanvas.clientHeight);
    this.timelineCtx.stroke();

    // Draw time display
    this.timelineCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.timelineCtx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    this.timelineCtx.textAlign = 'left';
    this.timelineCtx.textBaseline = 'top';

    // Position text to avoid overlapping with time marker
    const textX = markerX + 5;
    const textY = this.timeMarker.height + 5;

    // Draw background for better readability
    const timeText = time.toFixed(2) + 's';
    const textMetrics = this.timelineCtx.measureText(timeText);
    const textWidth = textMetrics.width + 6;
    const textHeight = 16;

    this.timelineCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.timelineCtx.fillRect(textX - 3, textY - 2, textWidth, textHeight);

    this.timelineCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    this.timelineCtx.fillText(timeText, textX, textY);
  }
}
