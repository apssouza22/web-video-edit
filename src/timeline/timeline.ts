import {TimeMarker} from './time-marker';
import {TimelineZoomHandler} from './zoom';
import {DragLayerHandler} from './drag';
import {TimelineLayerRender} from './layers/tllayer-render';
import {dpr} from '@/constants';
import type {CursorState, IClipTl} from './types';
import {getEventBus, PinchHandler, TimelineLayerUpdateEvent, TimelineTimeUpdateEvent} from '@/common';
import {AbstractMedia, ComposedMedia} from "@/mediaclip";
import {renderLineMarker} from "@/timeline/line-marker";
import {setupTimelineHeaderButtons} from "@/timeline/header-buttons";
import {TimelineCursor} from './cursor';

/**
 * Class representing a timeline for a video player
 */
export class Timeline {
  selectedLayer: AbstractMedia | null;
  isHover: boolean;
  time: number;
  playerTime: number;
  layers: AbstractMedia[];
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
  dragHandler: DragLayerHandler;
  private zoomHandler: TimelineZoomHandler;
  private cursor: TimelineCursor;
  #eventBus = getEventBus();


  constructor(container: HTMLElement) {
    this.selectedLayer = null;
    this.isHover = false;
    this.time = 0;
    this.playerTime = 0;
    this.layers = [];
    this.scale = 2.0;
    this.totalTime = 0;
    this.timelineCanvas = document.createElement('canvas');
    this.timelineCtx = this.timelineCanvas.getContext('2d') as CanvasRenderingContext2D;

    this.timelineHolder = container
    this.timelineHolder.appendChild(this.timelineCanvas);

    // Configuration for timeline elements
    this.layerHeight = 35; // Default height per media
    this.minLayerSpacing = 10; // Minimum space between medias
    this.contentPadding = 15; // Padding around content

    this.timeMarker = new TimeMarker({
      height: 25,
      spacing: 60
    });

    this.layerRenderer = new TimelineLayerRender(
        this.timelineCtx,
        this.totalTime,
        this.timelineCanvas.clientWidth
    );
    this.dragHandler = new DragLayerHandler(this);
    this.zoomHandler = new TimelineZoomHandler(this);
    this.cursor = new TimelineCursor();

    this.#addEventListeners();
    this.#setupPinchHandler();
    setupTimelineHeaderButtons(this.#eventBus)
  }

  /**
   * Setter for time property that notifies listeners when time changes
   */
  setTime(newTime: number) {
    this.time = newTime;
  }

  #onClick() {
    this.#eventBus.emit(new TimelineTimeUpdateEvent(this.time, this.playerTime));
  }

  public updateLayersOrder(fromIndex: number, toIndex: number) {
    const layer = this.layers[fromIndex];
    this.#eventBus.emit(new TimelineLayerUpdateEvent('reorder', layer, undefined, {fromIndex, toIndex}));
  }

  /**
   * Setter for selectedLayer property that notifies listeners when selectedLayer changes
   * @param {IClipTl|null} newSelectedLayer - The new selected media
   */
  setSelectedLayer(newSelectedLayer: AbstractMedia) {
    const oldSelectedLayer = this.selectedLayer;
    this.selectedLayer = newSelectedLayer;
    if (oldSelectedLayer === newSelectedLayer) {
      return;
    }
    if (oldSelectedLayer) {
      this.#eventBus.emit(new TimelineLayerUpdateEvent('select', newSelectedLayer, oldSelectedLayer));
      return
    }
    this.#eventBus.emit(new TimelineLayerUpdateEvent('select', newSelectedLayer));
  }

  #setupPinchHandler() {
    const pinch = new PinchHandler(this.timelineHolder, this.pinchCallback.bind(this));
    pinch.setupEventListeners();
  }

  private pinchCallback(scale: number, rotation: number) {
    this.scale = Math.max(1, this.scale * scale);
    this.resize();
    // Update the zoom slider to match the current scale
    if (this.zoomHandler) {
      this.zoomHandler.updateSliderValue();
    }
  }

  #addEventListeners() {
    this.timelineCanvas.addEventListener('pointerdown', this.#onPointerDown.bind(this));
    this.timelineCanvas.addEventListener('pointermove', this.#onPointerMove.bind(this), {passive: false});
    this.timelineCanvas.addEventListener('pointerleave', this.#onPointerLeave.bind(this));
    this.timelineCanvas.addEventListener('pointerup', this.#onPointerLeave.bind(this));
    this.timelineCanvas.addEventListener('click', this.#onClick.bind(this));
  }



  /**
   * Resize the timeline canvas based on the scale factor and number of medias
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
   * @returns {boolean} - Whether a media was selected
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
    this.cursor.startDrag(ev.offsetX, ev.offsetY);
  }

  /**
   * Handle scrubbing movement
   * @param {Event} ev - The pointer event
   */
  #onPointerMove(ev: PointerEvent) {
    ev.preventDefault();
    ev.stopPropagation();

    this.isHover = true;
    let rect = this.timelineCanvas.getBoundingClientRect();
    let time = ev.offsetX / rect.width * this.totalTime;
    this.cursor.updateData(time, this.selectedLayer!, ev.offsetX, ev.offsetY);
    const state = this.cursor.getCursorState();
    this.#updateCursor(state);
    this.dragHandler.updateDrag(time, this.selectedLayer!, ev.offsetX, ev.offsetY);
    this.setTime(time);
  }

  /**
   * Update cursor based on current state and hover position
   * @param {number} time - Current time position
   * @private
   */
  #updateCursor(time: CursorState) {
    const state = this.cursor.getCursorState();
    console.log('[Timeline] Cursor State:', state);
    document.body.style.cursor = state.cssCursor
    if (state.dragMode === 'vertical') {
      this.timelineCanvas.className = "timeline-dragging-vertical";
    } else if (state.dragMode === 'horizontal') {
      this.timelineCanvas.className = "timeline-dragging-horizontal";
    } else {
      this.timelineCanvas.className = "";
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
    // Finish drag operation and check if reordering occurred
    const reorderOccurred = this.dragHandler.finishDrag();
    this.cursor.finishDrag();
    // If reordering occurred, trigger a re-render
    if (reorderOccurred) {
      this.render();
    }
    this.isHover = false;
  }

  addLayers(layers: AbstractMedia[]) {
    this.layers = layers;
  }

  getLayerHeight(media: AbstractMedia): number {
    if (media instanceof ComposedMedia) {
      return this.layerHeight * 2;
    }

    if (media.isVideo()) {
      return this.layerHeight * 1.5;
    }

    if(media.isAudio()){
      return this.layerHeight * 1.2;
    }
    return this.layerHeight
  }

  /**
   * Render all medias in the timeline
   */
  render() {
    this.timelineCtx.clearRect(0, 0, this.timelineCanvas.clientWidth, this.timelineCanvas.clientHeight);
    this.#updateTotalTime(this.layers);
    this.layerRenderer.updateProperties(this.totalTime, this.timelineCanvas.clientWidth);

    // Skip rendering if no medias or invalid canvas dimensions
    if (this.layers.length === 0 || this.timelineCanvas.clientHeight <= 0 || this.timelineCanvas.clientWidth <= 0) {
      this.timeMarker.render(this.timelineCtx, this.timelineCanvas.clientWidth, this.totalTime);
      return;
    }

    const availableHeight = this.timelineCanvas.clientHeight - this.timeMarker.height - this.contentPadding;
    if (availableHeight <= 0) {
      this.timeMarker.render(this.timelineCtx, this.timelineCanvas.clientWidth, this.totalTime);
      return;
    }

    this.renderLayers();
    this.timeMarker.render(this.timelineCtx, this.timelineCanvas.clientWidth, this.totalTime);
    renderLineMarker(this.playerTime, this.timelineCtx, this.totalTime, this.timeMarker.height);

    if (this.isHover) {
      renderLineMarker(this.time, this.timelineCtx, this.totalTime, this.timeMarker.height);
    }
    this.dragHandler.renderFeedback(this.timelineCtx);
  }

  private renderLayers() {
    // Calculate vertical positions starting from top (below time marker)
    let yPos = this.timeMarker.height + this.contentPadding;

    for (let layer of this.layers) {
      const layerHeight = this.getLayerHeight(layer);
      const layerSpacing = this.minLayerSpacing + layerHeight;
      yPos += layerSpacing / 2;
      let selected = this.selectedLayer === layer;
      this.layerRenderer.renderLayer(layer, yPos, layerHeight, selected);
      yPos += layerSpacing / 2;
    }
  }

  /**
   * Select a media based on the event position with updated top-down positioning
   * @param {Event} ev - The pointer event
   * @returns {boolean} - Whether a media was selected
   */
  #selectLayer(ev: PointerEvent) {
    let yPos = this.timeMarker.height + this.contentPadding;

    for (let layer of this.layers) {
      const layerHeight = this.getLayerHeight(layer);
      const layerSpacing = this.minLayerSpacing + layerHeight;

      yPos += layerSpacing / 2;

      if (!this.#canSelectLayer(layer)) {
        yPos += layerSpacing / 2;
        continue;
      }

      // Check if click is within the media's vertical bounds
      const layerTop = yPos - layerHeight / 2;
      const layerBottom = yPos + layerHeight / 2;

      if (ev.offsetY >= layerTop && ev.offsetY <= layerBottom) {
        this.setSelectedLayer(layer);
        return true;
      }

      yPos += layerSpacing / 2;
    }
    return false;
  }

  /**
   * Ensures that only medias overlapping or near the current time (with a small margin of 1%)
   * are considered for further processing. Layers outside this range are ignored.
   * @param {IClipTl} layer - The media to check
   * @returns {boolean} - Whether the media can be selected
   */
  #canSelectLayer(layer: IClipTl): boolean {
    if (layer.startTime > (1.01 * this.time)) {
      return false;
    }

    if (layer.startTime + layer.totalTimeInMilSeconds < (0.99 * this.time)) {
      return false;
    }
    return true;
  }

  #updateTotalTime(layers: AbstractMedia[]) {
    if (layers.length === 0) {
      this.totalTime = 0;
      return;
    }

    this.totalTime = 0;
    for (let layer of layers) {
      const layerEndTime = layer.startTime + layer.totalTimeInMilSeconds;
      if (layerEndTime > this.totalTime) {
        this.totalTime = layerEndTime;
      }
    }
  }

}
