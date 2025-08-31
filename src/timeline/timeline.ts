import {TimeMarker} from './time-marker';
import {TimelineZoomHandler} from './zoom';
import {PreviewHandler} from './preview';
import {DragLayerHandler} from './drag';
import {TimelineLayerRender} from './tllayer-render';
import {PinchHandler} from '../studio/index.js';
import {dpr} from '../constants.js';
import type { StandardLayer, LayerUpdateKind } from './types';

/**
 * Class representing a timeline for a video player
 */
export class Timeline {
  studio: any;
  selectedLayer: StandardLayer | null;
  isHover: boolean;
  time: number;
  playerTime: number;
  layers: StandardLayer[];
  scale: number;
  totalTime: number;
  timelineCanvas: HTMLCanvasElement;
  timelineCtx: CanvasRenderingContext2D;
  timelineHolder: HTMLElement;
  layerHeight: number;
  minLayerSpacing: number;
  contentPadding: number;
  timeMarker: TimeMarker;
  layerRenderer: TimelineLayerRender;
  previewHandler: PreviewHandler;
  dragHandler: DragLayerHandler;
  timeUpdateListener: ((hoverTime: number, playerTime: number) => void);
  layerUpdateListener: (kind: LayerUpdateKind, layer: StandardLayer | null, oldLayer?: StandardLayer | null, extra?: any) => void;
  private zoomHandler: TimelineZoomHandler;

  /**
   *
   * @param {VideoStudio} studio
   */
  constructor(studio: any) {
    this.studio = studio;
    this.selectedLayer = null;
    this.isHover = false;
    this.time = 0;
    this.playerTime = 0;
    this.layers = [];
    this.scale = 2.0;
    this.totalTime = 0;
    this.timelineCanvas = document.createElement('canvas');
    this.timelineCtx = this.timelineCanvas.getContext('2d') as CanvasRenderingContext2D;

    this.timelineHolder = document.getElementById('timeline_content') as HTMLElement;
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
    this.layerUpdateListener = () => {};

    this.#addEventListeners();
    this.#setupPinchHandler();
  }

  /**
   * Setter for time property that notifies listeners when time changes
   */
  setTime(newTime: number) {
    this.time = newTime;
  }

  #onClick() {
    this.timeUpdateListener(this.time, this.playerTime);
  }

  /**
   * Add a listener for layer updates
   * @param {Function} listener - Function to call when layer updates occur
   */
  addLayerUpdateListener(listener: (kind: LayerUpdateKind, layer: StandardLayer | null, oldLayer?: StandardLayer | null, extra?: any) => void) {
    if (typeof listener !== 'function') {
      throw new Error('Layer update listener must be a function');
    }
    this.layerUpdateListener = listener;
  }

  /**
   * Setter for selectedLayer property that notifies listeners when selectedLayer changes
   * @param {StandardLayer|null} newSelectedLayer - The new selected layer
   */
  setSelectedLayer(newSelectedLayer: StandardLayer | null) {
    const oldSelectedLayer = this.selectedLayer;
    this.selectedLayer = newSelectedLayer;
    if (oldSelectedLayer !== newSelectedLayer) {
      this.layerUpdateListener('select', newSelectedLayer, oldSelectedLayer);
    }
  }

  addTimeUpdateListener(listener: (hoverTime: number, playerTime: number) => void) {
    if (typeof listener !== 'function') {
      throw new Error('Time update listener must be a function');
    }
    this.timeUpdateListener = listener
  }

  #setupPinchHandler() {
    const callback = (function (scale, rotation) {
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
    (this.timelineCanvas.style as any).width = this.timelineHolder.clientWidth * this.scale;
    (this.timelineCanvas.style as any).height = this.timelineHolder.clientHeight * this.scale;
    this.timelineCanvas.width = this.timelineCanvas.clientWidth * dpr;
    this.timelineCanvas.height = this.timelineCanvas.clientHeight * dpr;
    this.timelineCtx.scale(dpr, dpr);
  }

  /**
   * Start scrubbing at a specific event position
   * @param {Event} ev - The pointer event
   * @returns {boolean} - Whether a layer was selected
   */
  #onPointerDown(ev: PointerEvent) {
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

    // Pass coordinates for drag mode determination
    this.dragHandler.startLayerDrag(this.selectedLayer, this.time, ev.offsetX, ev.offsetY);
  }

  /**
   * Handle scrubbing movement
   * @param {Event} ev - The pointer event
   * @returns {number} - The current time position
   */
  #onPointerMove(ev: PointerEvent) {
    ev.preventDefault();
    ev.stopPropagation();

    this.isHover = true;
    let rect = this.timelineCanvas.getBoundingClientRect();
    let time = ev.offsetX / rect.width * this.totalTime;

    // Update cursor based on drag mode and hover state
    this.#updateCursor(time);

    this.previewHandler.updatePreview(ev, this.timelineHolder, time, this.totalTime);
    this.dragHandler.updateDrag(time, this.selectedLayer, ev.offsetX, ev.offsetY);

    this.setTime(time);
  }

  /**
   * Update cursor based on current state and hover position
   * @param {number} time - Current time position
   * @private
   */
  #updateCursor(time: number) {
    const dragMode = this.dragHandler.dragMode;

    if (dragMode === 'vertical') {
      document.body.style.cursor = "ns-resize";
      this.timelineCanvas.className = "timeline-dragging-vertical";
      return;
    }
    if (dragMode === 'horizontal') {
      document.body.style.cursor = "ew-resize";
      this.timelineCanvas.className = "timeline-dragging-horizontal";
      return;
    }
    // Default hover behavior
    document.body.style.cursor = "default";
    this.timelineCanvas.className = "";

    if (this.selectedLayer) {
      if (this.intersectsTime(this.selectedLayer.start_time, time)) {
        document.body.style.cursor = "col-resize";
      }
      const endTime = this.selectedLayer.start_time + this.selectedLayer.totalTimeInMilSeconds;
      if (this.intersectsTime(endTime, time)) {
        document.body.style.cursor = "col-resize";
      }
    }
  }

  intersectsTime(time: number, query: number) {
    return Math.abs(query - time) / this.totalTime < 0.01;
  }

  /**
   * End the scrubbing operation
   */
  #onPointerLeave() {
    document.body.style.cursor = "default";
    this.timelineCanvas.className = "";
    this.previewHandler.previewHolder.style.display = "none";

    // Finish drag operation and check if reordering occurred
    const reorderOccurred = this.dragHandler.finishDrag();

    // If reordering occurred, trigger a re-render
    if (reorderOccurred) {
      this.render(this.layers);
    }

    this.isHover = false;
  }

  addLayers(layers: StandardLayer[]) {
    this.layers = layers;
  }

  /**
   * Render all layers in the timeline
   */
  render() {
    this.timelineCtx.clearRect(0, 0, this.timelineCanvas.clientWidth, this.timelineCanvas.clientHeight);
    this.#updateTotalTime(this.layers);
    this.layerRenderer.updateProperties(this.totalTime, this.timelineCanvas.clientWidth);

    // Skip rendering if no layers or invalid canvas dimensions
    if (this.layers.length === 0 || this.timelineCanvas.clientHeight <= 0 || this.timelineCanvas.clientWidth <= 0) {
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

    for (let layer of this.layers) {
      let selected = this.selectedLayer === layer;
      this.layerRenderer.renderLayer(layer, yPos, this.layerHeight, selected);
      yPos += layerSpacing;
    }

    this.timeMarker.render(this.timelineCtx, this.timelineCanvas.clientWidth, this.totalTime);
    this.#renderLineMarker(this.playerTime);

    if (this.isHover) {
      this.#renderLineMarker(this.time);
      this.previewHandler.render(this.time, this.layers);
    }

    this.dragHandler.renderFeedback(this.timelineCtx);
  }

  /**
   * Select a layer based on the event position with updated top-down positioning
   * @param {Event} ev - The pointer event
   * @returns {boolean} - Whether a layer was selected
   */
  #selectLayer(ev: PointerEvent) {
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
  #canSelectLayer(layer: StandardLayer) {
    if (layer.start_time > (1.01 * this.time)) {
      return false;
    }

    if (layer.start_time + layer.totalTimeInMilSeconds < (0.99 * this.time)) {
      return false;
    }
    return true;
  }

  #updateTotalTime(layers: StandardLayer[]) {
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

  #renderLineMarker(time: number) {
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

  /**
   * Reorder layers in the timeline
   * @param {StandardLayer} layer - The layer that was reordered
   * @param {Object} reorderData - Contains fromIndex and toIndex
   */
  reorderLayer(layer: StandardLayer, reorderData: { fromIndex: number; toIndex: number }) {
    // The actual reordering is handled by LayerReorderHandler
    // This method can be used for additional logic if needed
    console.log(`Layer "${layer.name}" moved from index ${reorderData.fromIndex} to ${reorderData.toIndex}`);
  }
}
